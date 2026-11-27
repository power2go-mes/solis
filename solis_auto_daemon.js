/**
 * Power2Go SolisCloud Automated Background Daemon
 * --------------------------------------------------
 * 1. Executes automated Live Sync every 10 minutes:
 *    - Pulls real-time detailMix telemetry -> solis_telemetry_latest
 *    - Pulls today's 5-minute curve readings -> solis_battery_power_curve
 *    - Pulls today's energy totals -> solis_daily_energy
 * 2. Executes comprehensive Missing Data Audit every 6 hours:
 *    - Scans every client plant from Day 1 (commissioning) to Today
 *    - Automatically identifies missing 5-minute curves or daily records
 *    - Fetches and backfills missing days into Supabase PostgreSQL
 * 3. Logs live timestamps in PKT (UTC+5) with latest data points.
 */

const https = require("https");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const { sendWebPushNotification } = require("./lib/webPushNotifier");

// Plant Telemetry Staleness Tracker Map
const plantStaleTracker = {};

// NOC Incident Creator & Deduplicator Helper
async function triggerNocIncident({ stationId, stationName, severity, category, title, description }) {
  try {
    // Deduplication check:
    // 1. Do not re-insert if already OPEN or ACKNOWLEDGED
    // 2. Do not immediately re-create an incident if the user recently IGNORED/RESOLVED it within the last 2 hours
    const existing = await pool.query(
      `SELECT id FROM noc_incidents 
       WHERE station_id = $1 AND category = $2 
         AND (status IN ('OPEN', 'ACKNOWLEDGED') OR (status = 'RESOLVED' AND updated_at > NOW() - INTERVAL '2 hours'))
       LIMIT 1`,
      [stationId, category]
    );
    if (existing.rowCount === 0) {
      await pool.query(
        `INSERT INTO noc_incidents (station_id, station_name, severity, category, title, description, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'OPEN', NOW(), NOW())`,
        [stationId, stationName, severity, category, title, description]
      );
      console.log(`🚨 [NOC ${severity}] Logged new incident for ${stationName}: ${title}`);
    }
  } catch (err) {
    console.error(`[NOC Incident Error] Failed to log incident for ${stationName}:`, err.message);
  }
}

async function autoResolveNocIncident({ stationId, category, resolutionNotes }) {
  try {
    await pool.query(
      `UPDATE noc_incidents
       SET status = 'RESOLVED',
           resolved_by = 'System Auto-Recovery',
           resolved_at = NOW(),
           resolution_notes = $1,
           updated_at = NOW()
       WHERE station_id = $2 AND category = $3 AND status IN ('OPEN', 'ACKNOWLEDGED')`,
      [resolutionNotes, stationId, category]
    );
  } catch (err) {
    console.error(`[NOC Resolve Error]:`, err.message);
  }
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, "utf8");
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, "");
      env[key] = val;
    }
  }
  return env;
}

const localEnv = {
  ...loadEnvFile(path.join(__dirname, ".env.local")),
  ...loadEnvFile(path.join(__dirname, ".env.test")),
  ...loadEnvFile(path.join(__dirname, "..", ".env.local")),
  ...loadEnvFile(path.join(__dirname, "..", ".env.test")),
};

const solisUser = process.env.SOLIS_USERNAME || localEnv.SOLIS_USERNAME;
const solisPass = process.env.SOLIS_PASSWORD || localEnv.SOLIS_PASSWORD;
let dbUrl = process.env.DATABASE_URL || localEnv.DATABASE_URL || localEnv.SUPABASE_DB_URL;
if (dbUrl && dbUrl.includes("pooler.supabase.com:6543")) {
  dbUrl = dbUrl.replace("pooler.supabase.com:6543", "pooler.supabase.com:5432");
}

if (!solisUser || !solisPass || !dbUrl) {
  console.error("Missing required credentials (SOLIS_USERNAME, SOLIS_PASSWORD, or DATABASE_URL)");
  process.exit(1);
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
  max: 3,
});

const SOLIS_API_BASE = "https://www.soliscloud.com";
const SOLIS_HMAC_SECRET = "5704383536604a8bb94c83ebc059aa8c";
const SOLIS_KEY_ID = "2424";

let sessionCookie = null;

function md5Base64(str) {
  return crypto.createHash("md5").update(str, "utf8").digest("base64");
}

function hmacSha1Base64(key, data) {
  return crypto.createHmac("sha1", key).update(data, "utf8").digest("base64");
}

function postRequest(apiPath, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const date = new Date().toUTCString();
    const contentMd5 = md5Base64(bodyStr);
    const signPath = apiPath.replace(/^\/api/, "");
    const signStr = `POST\n${contentMd5}\napplication/json\n${date}\n${signPath}`;
    const signature = hmacSha1Base64(SOLIS_HMAC_SECRET, signStr);

    const headers = {
      "Content-Type": "application/json;charset=UTF-8",
      "Content-MD5": contentMd5,
      "Authorization": `WEB ${SOLIS_KEY_ID}:${signature}`,
      "Time": date,
      "Accept": "application/json, text/plain, */*",
      "Language": "2",
      "X-Cloud-Platform": "GLY",
      "Version": "5.3.001",
      "Platform": "Web",
      "Connection": "close",
      "Content-Length": Buffer.byteLength(bodyStr),
    };

    if (sessionCookie) {
      headers["Cookie"] = sessionCookie;
    }

    const url = new URL(SOLIS_API_BASE + apiPath);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: apiPath,
      method: "POST",
      headers: headers,
      timeout: 35000,
      agent: false,
    };

    const req = https.request(options, (res) => {
      let raw = "";
      res.on("data", (chunk) => (raw += chunk));
      res.on("end", () => {
        const setCookie = res.headers["set-cookie"];
        if (setCookie) {
          const tokenCookie = setCookie.find((c) => c.startsWith("token="));
          if (tokenCookie) sessionCookie = tokenCookie.split(";")[0];
          const acwCookie = setCookie.find((c) => c.startsWith("acw_tc="));
          if (acwCookie) {
            const acwPart = acwCookie.split(";")[0];
            sessionCookie = sessionCookie ? `${sessionCookie}; ${acwPart}` : acwPart;
          }
        }
        try {
          resolve({ status: res.statusCode, json: JSON.parse(raw) });
        } catch (e) {
          resolve({ status: res.statusCode, rawText: raw.slice(0, 100) });
        }
      });
    });

    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("Request timed out")));
    req.write(bodyStr);
    req.end();
  });
}

// All 8 authorized plants (including Towfiq chinoy)
const PLANTS = [
  { id: "1298491919451014032", name: "Towfiq chinoy", capacityKwp: 29.67, location: "Karachi, Pakistan", commissioning: "2026-07-01" },
  { id: "1298491919450797504", name: "Menu Karachi Office", capacityKwp: 80.0, location: "Karachi, Pakistan", commissioning: "2026-07-21" },
  { id: "1298491919450958553", name: "OPL Residence", capacityKwp: 55.5, location: "Gharo, Pakistan", commissioning: "2026-10-20" },
  { id: "1298491919450873747", name: "36 Chenab", capacityKwp: 25.155, location: "Lahore, Pakistan", commissioning: "2026-09-02" },
  { id: "1298491919450740581", name: "P2G 50KW", capacityKwp: 32.0, location: "Karachi, Pakistan", commissioning: "2026-06-23" },
  { id: "1298491919450840394", name: "P2G 1ST 6kw", capacityKwp: 20.0, location: "Karachi, Pakistan", commissioning: "2026-08-13" },
  { id: "1298491919450851319", name: "P2G 20kw", capacityKwp: 18.0, location: "Karachi, Pakistan", commissioning: "2026-08-01" },
  { id: "1298491919450734544", name: "P2G 15KW", capacityKwp: 20.0, location: "Karachi, Pakistan", commissioning: "2026-08-01" },
];

function getPktDateStr() {
  const pktDate = new Date(Date.now() + 5 * 3600 * 1000);
  return pktDate.toISOString().slice(0, 10);
}

function getPktMonthStr() {
  const pktDate = new Date(Date.now() + 5 * 3600 * 1000);
  return pktDate.toISOString().slice(0, 7);
}

function getPktTimeStr() {
  const pktDate = new Date(Date.now() + 5 * 3600 * 1000);
  return pktDate.toISOString().slice(11, 19);
}

function getPktTimestampLog() {
  const pktDate = new Date(Date.now() + 5 * 3600 * 1000);
  return pktDate.toISOString().replace("T", " ").slice(0, 19) + " PKT";
}

function numOrNull(val) {
  if (val === null || val === undefined || val === "") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

async function doLogin() {
  const passMd5 = crypto.createHash("md5").update(solisPass, "utf8").digest("hex");
  const loginRes = await postRequest("/api/user/login2", {
    userInfo: solisUser,
    passWord: passMd5,
    yingZhenType: 1,
    localTime: Date.now(),
    localTimeZone: 5,
    language: "2",
  });

  if (!loginRes.json?.success) {
    throw new Error("SolisCloud login failed: " + (loginRes.json?.msg || "unknown"));
  }
}

async function uploadCurveBatch(rows) {
  if (!rows || rows.length === 0) return 0;
  const batchSize = 50;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const valueClauses = [];
    const params = [];
    let pIdx = 1;

    for (const r of chunk) {
      valueClauses.push(
        `($${pIdx}, $${pIdx + 1}, $${pIdx + 2}, $${pIdx + 3}, $${pIdx + 4}, $${pIdx + 5}, $${pIdx + 6}, $${pIdx + 7}, $${pIdx + 8}, $${pIdx + 9}, $${pIdx + 10}, $${pIdx + 11}, $${pIdx + 12}, $${pIdx + 13})`
      );
      params.push(
        r.stationId,
        r.dateStr,
        r.epoch,
        r.tStr,
        r.bW,
        r.bKw,
        r.bState,
        r.soc,
        r.sW,
        r.sKw,
        r.gW,
        r.gKw,
        r.lW,
        r.lKw
      );
      pIdx += 14;
    }

    const batchSql = `
      INSERT INTO solis_battery_power_curve (
        station_id, curve_date, timestamp_epoch, time_str,
        battery_power_w, battery_power_kw, battery_state,
        battery_soc, solar_power_w, solar_power_kw,
        grid_power_w, grid_power_kw, load_power_w, load_power_kw
      ) VALUES ${valueClauses.join(", ")}
      ON CONFLICT (station_id, curve_date, time_str) DO UPDATE SET
        timestamp_epoch = EXCLUDED.timestamp_epoch,
        battery_power_w = EXCLUDED.battery_power_w,
        battery_power_kw = EXCLUDED.battery_power_kw,
        battery_state = EXCLUDED.battery_state,
        battery_soc = EXCLUDED.battery_soc,
        solar_power_w = EXCLUDED.solar_power_w,
        solar_power_kw = EXCLUDED.solar_power_kw,
        grid_power_w = EXCLUDED.grid_power_w,
        grid_power_kw = EXCLUDED.grid_power_kw,
        load_power_w = EXCLUDED.load_power_w,
        load_power_kw = EXCLUDED.load_power_kw
    `;

    await pool.query(batchSql, params);
  }
  return rows.length;
}

function parseCurveRows(stationId, dateStr, curveData, mixData = {}) {
  if (!curveData) return [];
  const timeArray = curveData.time || [];
  const timeStrArray = curveData.timeStr || [];
  const solarPowerArray = curveData.pvAndAcCoupledPowerList || curveData.powerList || [];
  const batteryPowerArray = curveData.batteryPower || [];
  const gridPowerArray = curveData.psum || curveData.gridPowerList || [];
  const loadPowerArray =
    (curveData.totalAndSmartLoadPowerList && curveData.totalAndSmartLoadPowerList.length > 0)
      ? curveData.totalAndSmartLoadPowerList
      : (curveData.familyLoadPowerList && curveData.familyLoadPowerList.length > 0)
      ? curveData.familyLoadPowerList
      : curveData.bypassLoadPowerList || [];
  const socArray = curveData.batteryCapacitySocList || [];

  if (timeArray.length === 0) return [];

  const mixLoadKw = Number(mixData.totalLoadPower || mixData.familyLoadPower || mixData.totalAndSmartLoadPower || 0);

  const rows = [];
  for (let idx = 0; idx < timeArray.length; idx++) {
    let tStr = timeStrArray[idx];
    let rawEpoch = Number(timeArray[idx]);
    let epoch = rawEpoch;
    if (epoch > 1000000000000) {
      epoch = Math.floor(epoch / 1000);
    }

    if (!tStr && epoch) {
      tStr = new Date((epoch + 5 * 3600) * 1000).toISOString().slice(11, 19);
    }
    if (!tStr) continue;
    if (tStr.length === 5) tStr += ":00";

    const sW = Number(solarPowerArray[idx] || 0);
    const bW = Number(batteryPowerArray[idx] || 0);
    const gW = Number(gridPowerArray[idx] || 0);
    let lW = Number(loadPowerArray[idx] || 0);
    const soc = Number(socArray[idx] || 0);

    const sKw = sW / 1000;
    const bKw = bW / 1000;
    const gKw = gW / 1000;
    let lKw = lW / 1000;

    let bState = "Idle";
    if (bKw > 0.05) bState = "Charging";
    else if (bKw < -0.05) bState = "Discharging";

    // Calculate load from inverter power balance or mix totalLoadPower if 0
    if (lKw <= 0) {
      const calculatedLoadKw = sKw - bKw - gKw;
      if (calculatedLoadKw > 0) {
        lKw = calculatedLoadKw;
        lW = calculatedLoadKw * 1000;
      } else if (idx === timeArray.length - 1 && mixLoadKw > 0) {
        lKw = mixLoadKw;
        lW = mixLoadKw * 1000;
      }
    }

    rows.push({
      stationId,
      dateStr,
      epoch,
      tStr,
      bW,
      bKw,
      bState,
      soc,
      sW,
      sKw,
      gW,
      gKw,
      lW,
      lKw,
    });
  }
  return rows;
}

/**
 * 10-Minute Live Telemetry & Daily Curve Sync
 */
async function runLiveSync() {
  const startTime = Date.now();
  const todayDateStr = getPktDateStr();
  const yesterdayObj = new Date(Date.now() + 5 * 3600 * 1000 - 24 * 3600 * 1000);
  const yesterdayDateStr = yesterdayObj.toISOString().slice(0, 10);
  const todayMonthStr = getPktMonthStr();
  const pktLogTime = getPktTimestampLog();

  console.log(`\n-----------------------------------------------------------------`);
  console.log(`[${pktLogTime}] Starting 10-Minute Live Telemetry Sync...`);
  console.log(`Target Dates: ${yesterdayDateStr} (finalize) & ${todayDateStr} (live) | Month: ${todayMonthStr}`);

  await doLogin();

  let maxCurveTime = "--:--";
  let totalCurvePoints = 0;

  for (let i = 0; i < PLANTS.length; i++) {
    const p = PLANTS[i];
    try {
      // 1. Fetch live snapshot from /api/station/detailMix
      const mixRes = await postRequest("/api/station/detailMix", {
        id: p.id,
        localTime: Date.now(),
        localTimeZone: 5,
        language: "2",
      });
      const mix = mixRes.json?.data || {};

      // 2. Fetch curves for Yesterday (to finalize late evening 18:00-23:55) and Today
      let latestCurvePoint = null;
      for (const dStr of [yesterdayDateStr, todayDateStr]) {
        let curveRes = await postRequest("/api/chart/station/day/v2", {
          id: p.id,
          time: dStr,
          timeZone: 5,
        });

        if (!curveRes.json?.success && curveRes.json?.code === "1000") {
          await doLogin();
          curveRes = await postRequest("/api/chart/station/day/v2", {
            id: p.id,
            time: dStr,
            timeZone: 5,
          });
        }

        if (curveRes.json?.success && curveRes.json.data) {
          const rows = parseCurveRows(p.id, dStr, curveRes.json.data, mix);
          if (rows.length > 0) {
            await uploadCurveBatch(rows);
            totalCurvePoints += rows.length;
            if (dStr === todayDateStr) {
              const lastRow = rows[rows.length - 1];
              if (lastRow.tStr && lastRow.tStr.slice(0, 5) > maxCurveTime) {
                maxCurveTime = lastRow.tStr.slice(0, 5);
              }
              latestCurvePoint = {
                timeStr: lastRow.tStr,
                solarKw: lastRow.sKw,
                batKw: lastRow.bKw,
                batState: lastRow.bState,
                soc: lastRow.soc,
                gridKw: lastRow.gKw,
                loadKw: lastRow.lKw,
              };
            }
          }
        }
      }

      // 3. Upsert solis_telemetry_latest with matching real-time numbers
      const isOnline = latestCurvePoint !== null;
      const liveSolarKw = isOnline ? latestCurvePoint.solarKw : Number(mix.power || 0);

      // Battery SOC fallback: curve SOC -> mix.batteryCapacitySoc -> mix.batteryPercent
      let liveSoc = isOnline && latestCurvePoint.soc > 0 ? latestCurvePoint.soc : Number(mix.batteryCapacitySoc || mix.batteryPercent || 0);
      if (liveSoc === 0 && Number(mix.batteryPercent || 0) > 0) {
        liveSoc = Number(mix.batteryPercent);
      }

      const liveBatKw = isOnline ? Math.abs(latestCurvePoint.batKw) : Number(mix.batteryPower || 0);
      // Solis API: mix.batteryDirection (1 = Charging, 2 = Discharging, 3 = Idle)
      const solisBatDir = mix.batteryDirection === 1 ? "Charging" : mix.batteryDirection === 2 ? "Discharging" : (mix.batteryDirection === 3 ? "Idle" : null);
      const liveBatState = solisBatDir || (isOnline ? latestCurvePoint.batState : (mix.batteryState || "Idle"));

      // Grid Power: check curve -> mix.gridPower -> mix.psum / mix.psumV2 (negative = import, positive = export)
      let liveGridKw = 0;
      if (isOnline && latestCurvePoint.gridKw !== 0) {
        liveGridKw = latestCurvePoint.gridKw;
      } else if (mix.gridPower !== undefined && Number(mix.gridPower) !== 0) {
        liveGridKw = Number(mix.gridPower);
      } else if (mix.psum !== undefined && Number(mix.psum) !== 0) {
        liveGridKw = Number(mix.psum);
      } else if (mix.psumV2 !== undefined && Number(mix.psumV2) !== 0) {
        liveGridKw = Number(mix.psumV2);
      }

      const mixLoadKw = Number(mix.totalLoadPower || mix.familyLoadPower || mix.totalAndSmartLoadPower || 0);
      const liveLoadKw = mixLoadKw > 0
        ? mixLoadKw
        : (isOnline && latestCurvePoint.loadKw > 0
          ? latestCurvePoint.loadKw
          : Math.max(0, liveSolarKw + (liveBatState === "Discharging" ? liveBatKw : -liveBatKw) - liveGridKw));

      const telemetryLatestUpsertSql = `
        INSERT INTO solis_telemetry_latest (
          station_id, station_name, location, installed_capacity_kw,
          solar_power_kw, battery_soc, battery_power_kw, battery_direction,
          grid_power_kw, load_power_kw, summary, raw_data, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW()
        ) ON CONFLICT (station_id) DO UPDATE SET
          station_name = EXCLUDED.station_name,
          location = EXCLUDED.location,
          installed_capacity_kw = EXCLUDED.installed_capacity_kw,
          solar_power_kw = EXCLUDED.solar_power_kw,
          battery_soc = EXCLUDED.battery_soc,
          battery_power_kw = EXCLUDED.battery_power_kw,
          battery_direction = EXCLUDED.battery_direction,
          grid_power_kw = EXCLUDED.grid_power_kw,
          load_power_kw = EXCLUDED.load_power_kw,
          summary = EXCLUDED.summary,
          raw_data = EXCLUDED.raw_data,
          updated_at = NOW();
      `;

      const summaryObj = {
        solar: { activePowerKw: liveSolarKw },
        battery: { socPercent: liveSoc, powerKw: liveBatKw, direction: liveBatState },
        grid: { activePowerKw: liveGridKw },
        load: { totalPowerKw: liveLoadKw },
        inverter: { state: liveSolarKw > 0.5 ? 1 : 2 },
      };

      await pool.query(telemetryLatestUpsertSql, [
        p.id,
        p.name,
        p.location,
        p.capacityKwp,
        liveSolarKw,
        liveSoc,
        liveBatKw,
        liveBatState,
        liveGridKw,
        liveLoadKw,
        summaryObj,
        JSON.stringify(mix),
      ]);

      // 4. Today's Daily Energy (upserting with correct schema matching solis_daily_energy)
      let monthlyDays = [];
      try {
        const monthRes = await postRequest("/api/chart/station/month", {
          id: p.id,
          time: todayMonthStr,
          month: todayMonthStr,
          timeZone: 5,
          money: "PKR",
        });
        monthlyDays = monthRes.json?.data || [];
      } catch (mErr) {
        console.warn(`[Warning] monthRes error for ${p.name}:`, mErr.message);
      }

      const todayRecord = Array.isArray(monthlyDays) ? monthlyDays.find(d => (d.dateStr || d.date) === todayDateStr) : null;

      const rawDayYield = numOrNull(todayRecord?.produceEnergy ?? todayRecord?.energy ?? todayRecord?.pvAndAcCoupledEnergy);
      const mixDayYield = numOrNull(mix.dayEnergy ?? mix.doubleAmmeterStorageDayEnergy ?? mix.dayEnergyStorage);
      const todayYieldKwh = (rawDayYield !== null && rawDayYield > 0) ? rawDayYield : (mixDayYield !== null ? mixDayYield : rawDayYield);

      const rawDayLoad = numOrNull(todayRecord?.consumeEnergy ?? todayRecord?.homeLoadEnergy);
      const mixDayLoad = numOrNull(mix.homeLoadTodayEnergy ?? mix.homeLoadEnergy);
      const todayLoadKwh = (rawDayLoad !== null && rawDayLoad > 0) ? rawDayLoad : (mixDayLoad !== null ? mixDayLoad : rawDayLoad);

      const rawDayCharge = numOrNull(todayRecord?.batteryChargeEnergy);
      const mixDayCharge = numOrNull(mix.batteryTodayChargeEnergy ?? mix.batteryChargeEnergy);
      const todayChargeKwh = (rawDayCharge !== null && rawDayCharge > 0) ? rawDayCharge : (mixDayCharge !== null ? mixDayCharge : rawDayCharge);

      const rawDayDischarge = numOrNull(todayRecord?.batteryDischargeEnergy);
      const mixDayDischarge = numOrNull(mix.batteryTodayDischargeEnergy ?? mix.batteryDischargeEnergy);
      const todayDischargeKwh = (rawDayDischarge !== null && rawDayDischarge > 0) ? rawDayDischarge : (mixDayDischarge !== null ? mixDayDischarge : rawDayDischarge);

      const rawGridBuy = numOrNull(todayRecord?.gridPurchasedEnergy);
      const mixGridBuy = numOrNull(mix.gridPurchasedDayEnergy);
      const todayGridBuyKwh = (rawGridBuy !== null && rawGridBuy > 0) ? rawGridBuy : (mixGridBuy !== null ? mixGridBuy : rawGridBuy);

      const rawGridSell = numOrNull(todayRecord?.gridSellEnergy);
      const mixGridSell = numOrNull(mix.gridSellDayEnergy ?? mix.gridSellEnergy);
      const todayGridSellKwh = (rawGridSell !== null && rawGridSell > 0) ? rawGridSell : (mixGridSell !== null ? mixGridSell : rawGridSell);

      const upsertEnergySql = `
        INSERT INTO solis_daily_energy (
          station_id, energy_date, solar_pv_kwh, house_load_kwh,
          battery_charge_kwh, battery_discharge_kwh,
          grid_purchased_kwh, grid_sold_kwh, backup_load_kwh,
          self_consumption_kwh, peak_sun_hours, currency, raw, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW()
        ) ON CONFLICT (station_id, energy_date) DO UPDATE SET
          solar_pv_kwh = GREATEST(COALESCE(EXCLUDED.solar_pv_kwh, 0), COALESCE(solis_daily_energy.solar_pv_kwh, 0)),
          house_load_kwh = GREATEST(COALESCE(EXCLUDED.house_load_kwh, 0), COALESCE(solis_daily_energy.house_load_kwh, 0)),
          battery_charge_kwh = GREATEST(COALESCE(EXCLUDED.battery_charge_kwh, 0), COALESCE(solis_daily_energy.battery_charge_kwh, 0)),
          battery_discharge_kwh = GREATEST(COALESCE(EXCLUDED.battery_discharge_kwh, 0), COALESCE(solis_daily_energy.battery_discharge_kwh, 0)),
          grid_purchased_kwh = GREATEST(COALESCE(EXCLUDED.grid_purchased_kwh, 0), COALESCE(solis_daily_energy.grid_purchased_kwh, 0)),
          grid_sold_kwh = GREATEST(COALESCE(EXCLUDED.grid_sold_kwh, 0), COALESCE(solis_daily_energy.grid_sold_kwh, 0)),
          backup_load_kwh = GREATEST(COALESCE(EXCLUDED.backup_load_kwh, 0), COALESCE(solis_daily_energy.backup_load_kwh, 0)),
          self_consumption_kwh = GREATEST(COALESCE(EXCLUDED.self_consumption_kwh, 0), COALESCE(solis_daily_energy.self_consumption_kwh, 0)),
          peak_sun_hours = GREATEST(COALESCE(EXCLUDED.peak_sun_hours, 0), COALESCE(solis_daily_energy.peak_sun_hours, 0)),
          currency = EXCLUDED.currency,
          raw = EXCLUDED.raw,
          updated_at = NOW();
      `;
      await pool.query(upsertEnergySql, [
        p.id,
        todayDateStr,
        todayYieldKwh,
        todayLoadKwh,
        todayChargeKwh,
        todayDischargeKwh,
        todayGridBuyKwh,
        todayGridSellKwh,
        numOrNull(todayRecord?.backUpEnergy),
        numOrNull(todayRecord?.oneSelf ?? mix.oneSelf),
        numOrNull(todayRecord?.fullHour ?? mix.fullHour),
        String(todayRecord?.moneyStr || mix.money || "PKR"),
        JSON.stringify(todayRecord || mix),
      ]);

      // 5. Staleness & Offline Detector (P1 Major Alert)
      if (!plantStaleTracker[p.id]) {
        plantStaleTracker[p.id] = { lastTimeStr: "", staleCount: 0, alerted: false };
      }
      const tracker = plantStaleTracker[p.id];
      const curDataTime = latestCurvePoint ? latestCurvePoint.timeStr : "";

      if (!curDataTime || curDataTime === tracker.lastTimeStr) {
        tracker.staleCount += 1;
        console.warn(`[Stale Warning] ${p.name}: Consecutive stale count = ${tracker.staleCount}/3 (Last seen: ${curDataTime || tracker.lastTimeStr || "Never"})`);

        if (tracker.staleCount >= 3 && !tracker.alerted) {
          tracker.alerted = true;
          console.error(`🚨 [OFFLINE ALERT] ${p.name} has had NO new telemetry for 3 consecutive sync cycles!`);

          // 1. Log P1 Incident in NOC table
          await triggerNocIncident({
            stationId: p.id,
            stationName: p.name,
            severity: "P1",
            category: "OFFLINE_STALE",
            title: "Plant Offline / Telemetry Lost",
            description: `No new telemetry received for 3 consecutive cycles (>30m). Last seen: ${curDataTime || tracker.lastTimeStr || "N/A"} PKT.`
          });

          // 2. Dispatch Web Push
          sendWebPushNotification({
            title: `⚠️ Plant Offline Alert: ${p.name}`,
            body: `${p.name} has stopped sending telemetry data (last packet: ${curDataTime || tracker.lastTimeStr || "N/A"} PKT). Checked 3 consecutive times with no new data.`,
            url: `/?plantId=${p.id}`,
            tag: `stale-${p.id}`,
          }).catch(err => console.error(`[Push Error] Failed to send push for ${p.name}:`, err));
        }
      } else {
        // Telemetry is healthy and advancing!
        if (tracker.alerted) {
          console.log(`✅ [RECOVERED] ${p.name} resumed telemetry data (New time: ${curDataTime}).`);
          await autoResolveNocIncident({
            stationId: p.id,
            category: "OFFLINE_STALE",
            resolutionNotes: `Telemetry automatically resumed at ${curDataTime} PKT.`
          });

          sendWebPushNotification({
            title: `✅ Plant Online: ${p.name}`,
            body: `${p.name} has resumed normal telemetry communication at ${curDataTime} PKT.`,
            url: `/?plantId=${p.id}`,
            tag: `recovery-${p.id}`,
          }).catch(err => console.error(`[Push Error] Recovery push failed:`, err));
        }
        tracker.lastTimeStr = curDataTime;
        tracker.staleCount = 0;
        tracker.alerted = false;
      }

      // 6. 🔴 P0 Critical: Battery Deep Discharge Protection (SOC < 10% during Grid Outage)
      if (liveSoc > 0 && liveSoc < 10 && liveGridKw <= 0) {
        await triggerNocIncident({
          stationId: p.id,
          stationName: p.name,
          severity: "P0",
          category: "BATTERY_CRITICAL",
          title: "Critical Battery Deep Discharge Risk",
          description: `Battery SOC has reached ${liveSoc}% with no grid power. Imminent BMS shutdown & lockout risk.`
        });
        sendWebPushNotification({
          title: `🔴 Critical Battery Alert: ${p.name}`,
          body: `Battery SOC is critically low at ${liveSoc}% with 0 grid power! Protect system from deep discharge blackout.`,
          url: `/?plantId=${p.id}`,
          tag: `bat-crit-${p.id}`,
        }).catch(() => {});
      } else if (liveSoc >= 15) {
        await autoResolveNocIncident({
          stationId: p.id,
          category: "BATTERY_CRITICAL",
          resolutionNotes: `Battery recovered to ${liveSoc}%.`
        });
      }

      // 7. 🔵 P2 Minor: Midday Generation Loss / Clipping Detector (11:00 AM - 02:00 PM PKT)
      const nowPktHours = new Date(Date.now() + 5 * 3600 * 1000).getUTCHours();
      if (nowPktHours >= 11 && nowPktHours <= 14 && p.capacityKwp > 5) {
        // Weather-Aware check: if weather condition is rainy, cloudy, overcast, or foggy, suppress false alarms
        const weatherDesc = String(mix.condTxtD || mix.condTxtN || mix.weather || "").toLowerCase();
        const isBadWeather = weatherDesc.includes("rain") || weatherDesc.includes("cloud") || weatherDesc.includes("overcast") || weatherDesc.includes("fog") || weatherDesc.includes("haze");

        const expectedMinKw = p.capacityKwp * (isBadWeather ? 0.10 : 0.30); // 10% on overcast/rainy days, 30% on clear days
        if (liveSolarKw < expectedMinKw && tracker.staleCount === 0) {
          await triggerNocIncident({
            stationId: p.id,
            stationName: p.name,
            severity: "P2",
            category: "UNDERPERFORMANCE",
            title: "Midday Solar Generation Anomaly",
            description: `Midday generation is only ${liveSolarKw.toFixed(1)} kW (Expected > ${expectedMinKw.toFixed(1)} kW for ${p.capacityKwp} kWp capacity${isBadWeather ? ' in cloudy weather' : ''}). Check strings or DC isolators.`
          });
        } else if (liveSolarKw >= expectedMinKw) {
          await autoResolveNocIncident({
            stationId: p.id,
            category: "UNDERPERFORMANCE",
            resolutionNotes: `Generation normal at ${liveSolarKw.toFixed(1)} kW.`
          });
        }
      }

      // 8. 🔴 Inverter Hardware Level-1 / Level-2 Alarms Ingestion
      const rawAlarmLevel = String(mix.alarmLevel || "0");
      const rawAlarmCount = Number(mix.alarmCount || 0);
      if (rawAlarmLevel !== "0" && rawAlarmCount > 0) {
        const isCritical = rawAlarmLevel === "2" || rawAlarmLevel === "3";
        await triggerNocIncident({
          stationId: p.id,
          stationName: p.name,
          severity: isCritical ? "P0" : "P1",
          category: "HARDWARE_ALARM",
          title: `Inverter Hardware Alarm (Level ${rawAlarmLevel})`,
          description: `Solis inverter has reported ${rawAlarmCount} active hardware protection alarm(s). Immediate inspection recommended.`
        });
      } else if (rawAlarmLevel === "0" || rawAlarmCount === 0) {
        await autoResolveNocIncident({
          stationId: p.id,
          category: "HARDWARE_ALARM",
          resolutionNotes: "Inverter hardware alarm state returned to normal (Level 0)."
        });
      }
    } catch (err) {
      console.error(`[Error] Updating ${p.name}:`, err.message || err);
    }
    // Polite 1.2s pacing between plants to prevent SolisCloud WAF connection resets
    await new Promise((r) => setTimeout(r, 1200));
  }

  // 4b. Sync 5-minute Inverter Curves for Individual Battery/Inverter Reports
  const INVERTER_MAP = {
    "1053050258180057": "1308675217950425937",
    "1053050258140015": "1308675217950425397",
    "1053050258110159": "1308675217950440077",
    "1053010259280019": "1308675217950513392",
    "1053050258180112": "1308675217950425926",
    "1053050255210107": "1308675217949880638",
    "1031731257050184": "1308675217950080058",
    "1033161256090193": "1308675217950003743",
    "1033320253150969": "1308675217949806488"
  };

  for (const [invSn, invId] of Object.entries(INVERTER_MAP)) {
    try {
      let res = await postRequest("/api/chart/inverter/day", {
        id: invId,
        time: todayDateStr,
        timeZone: 5,
      });

      if (!res.json?.success && res.json?.code === "1000") {
        await doLogin();
        res = await postRequest("/api/chart/inverter/day", {
          id: invId,
          time: todayDateStr,
          timeZone: 5,
        });
      }

      if (res.json?.success && Array.isArray(res.json.data) && res.json.data.length > 0) {
        const rows = res.json.data;
        const values = [];
        const params = [];
        let pIdx = 1;

        for (const item of rows) {
          const timeStr = item.time || (item.timeStr ? item.timeStr.split(" ")[1] : "00:00:00");
          const pacKw = Number((Number(item.pac || 0) / 1000).toFixed(2));
          const batPowerKw = Number((Number(item.batteryPower || 0) / 1000).toFixed(2));
          const soc = Math.round(Number(item.batteryCapacitySoc || 0));
          const batVolt = Number(item.batteryVoltage || item.storageBatteryVoltage || 0);
          const tempC = Number(item.inverterTemperature || 0);
          const eToday = Number(item.eToday || 0);

          values.push(`($${pIdx}, $${pIdx+1}, $${pIdx+2}, $${pIdx+3}, $${pIdx+4}, $${pIdx+5}, $${pIdx+6}, $${pIdx+7}, $${pIdx+8})`);
          params.push(invSn, todayDateStr, timeStr, pacKw, batPowerKw, soc, batVolt, tempC, eToday);
          pIdx += 9;
        }

        if (values.length > 0) {
          await pool.query(`
            INSERT INTO solis_inverter_day_curve (
              inverter_sn, curve_date, time_str, pac_kw,
              battery_power_kw, battery_soc, battery_voltage,
              inverter_temp_c, e_today
            ) VALUES ${values.join(", ")}
            ON CONFLICT (inverter_sn, curve_date, time_str) DO UPDATE SET
              pac_kw = EXCLUDED.pac_kw,
              battery_power_kw = EXCLUDED.battery_power_kw,
              battery_soc = EXCLUDED.battery_soc,
              battery_voltage = EXCLUDED.battery_voltage,
              inverter_temp_c = EXCLUDED.inverter_temp_c,
              e_today = EXCLUDED.e_today
          `, params);
        }
      }
      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      console.warn(`[Warning] Could not sync inverter curve for ${invSn}:`, err.message);
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[SUCCESS] 10m Sync Completed in ${durationSec}s | Curve Points Upserted: ${totalCurvePoints}`);
  console.log(`Latest Live Telemetry Reading: ${maxCurveTime} PKT (${todayDateStr})`);
  const nextSyncTime = new Date(Date.now() + 10 * 60 * 1000 + 5 * 3600 * 1000).toISOString().slice(11, 19);
  console.log(`Next 10m Sync Scheduled at: ${nextSyncTime} PKT`);
}

/**
 * 6-Hour Missing Data Audit & Backfill Engine
 * Audits all 5 client plants from Day 1 to Today.
 */
async function runMissingDataAudit() {
  const auditStart = Date.now();
  const pktLogTime = getPktTimestampLog();

  console.log(`\n=================================================================`);
  console.log(`[${pktLogTime}] RUNNING 6-HOUR COMPREHENSIVE DATA AUDIT`);
  console.log(`Checking Day 1 (Commissioning) to Today across all 5 clients...`);
  console.log(`=================================================================`);

  try {
    await doLogin();

    // 1. Check for dates with daily energy but missing or incomplete curve points (<260 points or stopped before 23:45)
    const missingCurveRes = await pool.query(`
      SELECT e.station_id, e.energy_date::text as target_date
      FROM solis_daily_energy e
      LEFT JOIN (
        SELECT station_id, curve_date, count(*) as pt_count, max(time_str) as max_time
        FROM solis_battery_power_curve
        GROUP BY station_id, curve_date
      ) c ON e.station_id = c.station_id AND e.energy_date = c.curve_date
      WHERE c.curve_date IS NULL
         OR (e.energy_date < CURRENT_DATE AND (c.max_time < '23:45:00' OR c.pt_count < 260))
      ORDER BY e.station_id, e.energy_date DESC
    `);

    const missingCurveJobs = missingCurveRes.rows;

    // 2. Also proactively verify the last 7 days for any missing late evening points
    for (let d = 1; d <= 7; d++) {
      const pastObj = new Date(Date.now() + 5 * 3600 * 1000 - d * 24 * 3600 * 1000);
      const pastDateStr = pastObj.toISOString().slice(0, 10);
      for (const plant of PLANTS) {
        if (!missingCurveJobs.some((j) => j.station_id === plant.id && j.target_date === pastDateStr)) {
          const check = await pool.query(
            `SELECT count(*) as cnt, max(time_str) as max_t FROM solis_battery_power_curve WHERE station_id = $1 AND curve_date = $2`,
            [plant.id, pastDateStr]
          );
          const cnt = Number(check.rows[0]?.cnt || 0);
          const maxT = check.rows[0]?.max_t || "";
          if (cnt < 260 || maxT < "23:45:00") {
            missingCurveJobs.push({ station_id: plant.id, target_date: pastDateStr });
          }
        }
      }
    }

    console.log(`Found ${missingCurveJobs.length} missing/incomplete curve days in database audit.`);

    let backfilledPoints = 0;
    let backfilledDays = 0;

    for (let i = 0; i < missingCurveJobs.length; i++) {
      const job = missingCurveJobs[i];
      const plant = PLANTS.find((p) => p.id === job.station_id);
      const plantName = plant ? plant.name : job.station_id;

      try {
        let curveRes = await postRequest("/api/chart/station/day/v2", {
          id: job.station_id,
          time: job.target_date,
          timeZone: 5,
        });

        if (!curveRes.json?.success && curveRes.json?.code === "1000") {
          await doLogin();
          curveRes = await postRequest("/api/chart/station/day/v2", {
            id: job.station_id,
            time: job.target_date,
            timeZone: 5,
          });
        }

        if (curveRes.json?.success && curveRes.json.data) {
          const rows = parseCurveRows(job.station_id, job.target_date, curveRes.json.data);
          if (rows.length > 0) {
            await uploadCurveBatch(rows);
            backfilledPoints += rows.length;
            backfilledDays++;
            console.log(`[Backfilled] ${plantName} (${job.target_date}): +${rows.length} 5-min curve points.`);
          }
        }
      } catch (err) {
        console.error(`[Error] Backfilling ${plantName} on ${job.target_date}:`, err.message);
      }
      // Small 150ms throttle between historical requests
      await new Promise((r) => setTimeout(r, 150));
    }

    // 2. Summary of total points & range
    const rangeRes = await pool.query(`
      SELECT station_id,
             MIN(curve_date)::text as min_curve,
             MAX(curve_date)::text as max_curve,
             COUNT(DISTINCT curve_date) as distinct_days,
             COUNT(*) as total_points
      FROM solis_battery_power_curve
      GROUP BY station_id
      ORDER BY station_id
    `);

    console.log(`\n--- Active Plants Status Matrix (Day 1 to Today) ---`);
    for (const r of rangeRes.rows) {
      const plant = PLANTS.find((p) => p.id === r.station_id);
      const name = plant ? plant.name : r.station_id;
      console.log(`• ${name.padEnd(22)}: ${r.min_curve} to ${r.max_curve} (${r.distinct_days} days, ${r.total_points} curve points)`);
    }

    const durationSec = ((Date.now() - auditStart) / 1000).toFixed(1);
    console.log(`\n[OK] 6-Hour Audit Complete in ${durationSec}s. Backfilled: ${backfilledDays} days (${backfilledPoints} points).`);
    const nextAuditTime = new Date(Date.now() + 6 * 3600 * 1000 + 5 * 3600 * 1000).toISOString().replace("T", " ").slice(0, 19);
    console.log(`Next 6-Hour Audit Scheduled at: ${nextAuditTime} PKT\n`);
  } catch (err) {
    console.error("[Error] During 6-Hour Audit:", err.message || err);
  }
}

let isSyncInProgress = false;

async function runLiveSyncWithRetry(maxRetries = 3) {
  if (isSyncInProgress) {
    console.log(`[Sync Busy] Previous live sync is still active. Skipping overlapping tick to prevent connection congestion.`);
    return;
  }
  isSyncInProgress = true;
  try {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await runLiveSync();
        return;
      } catch (err) {
        console.error(`[Daemon 10m Sync Error (Attempt ${attempt}/${maxRetries})]:`, err.message || err);
        if (attempt < maxRetries) {
          console.log(`Retrying live sync in 15 seconds...`);
          await new Promise((r) => setTimeout(r, 15000));
        }
      }
    }
  } finally {
    isSyncInProgress = false;
  }
}

/**
 * Main Daemon Bootstrapper
 */
async function startDaemon() {
  console.log("=================================================================");
  console.log("   POWER2GO SOLISCLOUD LOCAL DAEMON ACTIVATED");
  console.log(`   Host: Local Machine (${process.platform})`);
  console.log(`   Schedule: 10-Minute Live Sync + 6-Hour Day 1 Backfill Audit`);
  console.log(`   Started At: ${getPktTimestampLog()}`);
  console.log("=================================================================");

  // 1. Initial 10-minute live sync
  try {
    await runLiveSyncWithRetry();
  } catch (e) {
    console.error("Initial live sync error:", e);
  }

  // 2. Initial Day 1 audit (delayed 2 minutes after initial live sync to avoid rate limits)
  setTimeout(async () => {
    try {
      await runMissingDataAudit();
    } catch (e) {
      console.error("Initial data audit error:", e);
    }
  }, 120_000);

  // Schedule recurring 5-minute live sync (balances prompt telemetry freshness with Solis API stability)
  const FIVE_MINUTES = 5 * 60 * 1000;
  setInterval(async () => {
    await runLiveSyncWithRetry();
  }, FIVE_MINUTES);

  // Schedule recurring 6-hour missing data audit
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  setInterval(async () => {
    try {
      await runMissingDataAudit();
    } catch (e) {
      console.error("[Daemon 6h Audit Error]:", e.message || e);
    }
  }, SIX_HOURS);
}

if (process.argv.includes("--run-audit-now")) {
  (async () => {
    try {
      await runLiveSyncWithRetry();
      await runMissingDataAudit();
      process.exit(0);
    } catch (err) {
      console.error("Audit error:", err);
      process.exit(1);
    }
  })();
} else {
  startDaemon().catch((err) => {
    console.error("Fatal Daemon Startup Error:", err);
    process.exit(1);
  });
}
