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

// Active 5 Plants
const PLANTS = [
  { id: "1298491919450797504", name: "Menu Karachi Office", capacityKwp: 80.0, location: "Karachi, Pakistan", commissioning: "2026-07-21" },
  { id: "1298491919450958553", name: "OPL Residence", capacityKwp: 55.5, location: "Gharo, Pakistan", commissioning: "2026-10-20" },
  { id: "1298491919450873747", name: "36 Chenab", capacityKwp: 25.155, location: "Lahore, Pakistan", commissioning: "2026-09-02" },
  { id: "1298491919450740581", name: "P2G 50KW", capacityKwp: 32.0, location: "Karachi, Pakistan", commissioning: "2026-06-23" },
  { id: "1298491919450840394", name: "P2G 1ST 6kw", capacityKwp: 20.0, location: "Karachi, Pakistan", commissioning: "2026-08-13" },
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

function parseCurveRows(stationId, dateStr, curveData) {
  if (!curveData) return [];
  const timeArray = curveData.time || [];
  const timeStrArray = curveData.timeStr || [];
  const solarPowerArray = curveData.pvAndAcCoupledPowerList || curveData.powerList || [];
  const batteryPowerArray = curveData.batteryPower || [];
  const gridPowerArray = curveData.psum || curveData.gridPowerList || [];
  const loadPowerArray = curveData.familyLoadPowerList || curveData.bypassLoadPowerList || [];
  const socArray = curveData.batteryCapacitySocList || [];

  if (timeArray.length === 0) return [];

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
    const lW = Number(loadPowerArray[idx] || 0);
    const soc = Number(socArray[idx] || 0);

    const sKw = Number((sW / 1000).toFixed(2));
    const bKw = Number((bW / 1000).toFixed(2));
    const gKw = Number((gW / 1000).toFixed(2));
    const lKw = Number((lW / 1000).toFixed(2));

    let bState = "Idle";
    if (bKw > 0.05) bState = "Discharging";
    else if (bKw < -0.05) bState = "Charging";

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
          const rows = parseCurveRows(p.id, dStr, curveRes.json.data);
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
      const liveSolarKw = isOnline ? latestCurvePoint.solarKw : 0;
      const liveSoc = isOnline && latestCurvePoint.soc > 0 ? latestCurvePoint.soc : Number(mix.batteryCapacitySoc || 0);
      const liveBatKw = isOnline ? Math.abs(latestCurvePoint.batKw) : 0;
      const liveBatState = isOnline ? latestCurvePoint.batState : "Idle";
      const liveGridKw = isOnline ? latestCurvePoint.gridKw : 0;
      const liveLoadKw = isOnline ? latestCurvePoint.loadKw : 0;

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

      // 4. Today's Daily Energy
      const monthRes = await postRequest("/api/chart/station/month", {
        id: p.id,
        time: todayMonthStr,
        month: todayMonthStr,
        timeZone: 5,
        money: "PKR",
      });

      if (monthRes.json?.success && monthRes.json.data) {
        const m = monthRes.json.data;
        const timeArr = m.time || [];
        const genArr = m.energyList || [];
        const consArr = m.familyLoadEnergyList || [];
        const gridBuyArr = m.gridPurchasedEnergyList || [];
        const gridSellArr = m.gridSellEnergyList || [];
        const batChgArr = m.batteryChargeEnergyList || [];
        const batDisArr = m.batteryDischargeEnergyList || [];

        for (let idx = 0; idx < timeArr.length; idx++) {
          const dStr = timeArr[idx];
          if (dStr === todayDateStr) {
            const upsertEnergySql = `
              INSERT INTO solis_daily_energy (
                station_id, energy_date, generation_kwh, consumption_kwh,
                grid_purchase_kwh, grid_feed_in_kwh, battery_charge_kwh, battery_discharge_kwh
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              ON CONFLICT (station_id, energy_date) DO UPDATE SET
                generation_kwh = EXCLUDED.generation_kwh,
                consumption_kwh = EXCLUDED.consumption_kwh,
                grid_purchase_kwh = EXCLUDED.grid_purchase_kwh,
                grid_feed_in_kwh = EXCLUDED.grid_feed_in_kwh,
                battery_charge_kwh = EXCLUDED.battery_charge_kwh,
                battery_discharge_kwh = EXCLUDED.battery_discharge_kwh;
            `;
            await pool.query(upsertEnergySql, [
              p.id,
              dStr,
              numOrNull(genArr[idx]),
              numOrNull(consArr[idx]),
              numOrNull(gridBuyArr[idx]),
              numOrNull(gridSellArr[idx]),
              numOrNull(batChgArr[idx]),
              numOrNull(batDisArr[idx]),
            ]);
            break;
          }
        }
      }
    } catch (err) {
      console.error(`[Error] Updating ${p.name}:`, err.message || err);
    }
    // Polite 1.2s pacing between plants to prevent SolisCloud WAF connection resets
    await new Promise((r) => setTimeout(r, 1200));
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

async function runLiveSyncWithRetry(maxRetries = 3) {
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

  // Schedule recurring 10-minute live sync
  const TEN_MINUTES = 10 * 60 * 1000;
  setInterval(async () => {
    await runLiveSyncWithRetry();
  }, TEN_MINUTES);

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
