/**
 * SolisCloud Live Data Collector — Current Time (16:30+ PKT)
 * Targets: 5 Active Client Plants
 * Collects live detailMix, latest 5-min curves, and today's energy totals,
 * then saves directly to Supabase solis_telemetry_latest, solis_battery_power_curve,
 * and solis_daily_energy.
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
};

const solisUser = process.env.SOLIS_USERNAME || localEnv.SOLIS_USERNAME;
const solisPass = process.env.SOLIS_PASSWORD || localEnv.SOLIS_PASSWORD;
let dbUrl = process.env.DATABASE_URL || localEnv.DATABASE_URL || localEnv.SUPABASE_DB_URL;
if (dbUrl && dbUrl.includes("pooler.supabase.com:5432")) {
  dbUrl = dbUrl.replace("pooler.supabase.com:5432", "pooler.supabase.com:6543");
}

if (!solisUser || !solisPass || !dbUrl) {
  console.error("Missing required credentials or DATABASE_URL");
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
      timeout: 15000,
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

// Exactly the 5 active plants
const PLANTS = [
  { id: "1298491919450797504", name: "Menu Karachi Office", capacityKwp: 80.0, location: "Karachi, Pakistan" },
  { id: "1298491919450958553", name: "OPL Residence", capacityKwp: 55.5, location: "Gharo, Pakistan" },
  { id: "1298491919450873747", name: "36 Chenab", capacityKwp: 25.155, location: "Lahore, Pakistan" },
  { id: "1298491919450740581", name: "P2G 50KW", capacityKwp: 32.0, location: "Karachi, Pakistan" },
  { id: "1298491919450840394", name: "P2G 1ST 6kw", capacityKwp: 20.0, location: "Karachi, Pakistan" },
];

function numOrNull(val) {
  if (val === null || val === undefined || val === "") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

async function run() {
  console.log("=================================================================");
  console.log("   SOLISCLOUD — LIVE TELEMETRY & CURVE UPDATE TILL CURRENT TIME");
  console.log(`   Execution Time (PKT): ${new Date().toISOString()}`);
  console.log("   Target Plants: 5 Active Client Plants");
  console.log("=================================================================\n");

  // Step 1: Login
  console.log("[1/3] Authenticating to SolisCloud...");
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
    console.error("Login failed:", loginRes.json?.msg);
    process.exit(1);
  }
  console.log("[OK] Authentication successful! Session established.\n");

  const todayDateStr = "2026-11-18";

  for (let i = 0; i < PLANTS.length; i++) {
    const p = PLANTS[i];
    console.log(`>>> [${i + 1}/5] Updating Plant: ${p.name} (${p.id})...`);

    try {
      // 1. Fetch live snapshot from /api/station/detailMix
      const mixRes = await postRequest("/api/station/detailMix", {
        id: p.id,
        localTime: Date.now(),
        localTimeZone: 5,
        language: "2",
      });
      const mix = mixRes.json?.data || {};

      // 2. Fetch full day curve for today up to current minute
      const curveRes = await postRequest("/api/chart/station/day/v2", {
        id: p.id,
        time: todayDateStr,
        timeZone: 5,
      });
      const dayData = curveRes.json?.data || {};

      const timeArray = dayData.time || [];
      const timeStrArray = dayData.timeStr || [];
      const solarPowerArray = dayData.pvAndAcCoupledPowerList || dayData.powerList || [];
      const batteryPowerArray = dayData.batteryPower || [];
      const gridPowerArray = dayData.psum || dayData.gridPowerList || [];
      const loadPowerArray = dayData.familyLoadPowerList || dayData.bypassLoadPowerList || [];
      const socArray = dayData.batteryCapacitySocList || [];

      let curvePointsCount = 0;
      let latestCurvePoint = null;

      const curveUpsertSql = `
        INSERT INTO solis_battery_power_curve (
          station_id, curve_date, timestamp_epoch, time_str,
          battery_power_w, battery_power_kw, battery_state, battery_soc,
          solar_power_w, solar_power_kw, grid_power_w, grid_power_kw,
          load_power_w, load_power_kw
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        ) ON CONFLICT (station_id, curve_date, time_str) DO UPDATE SET
          battery_power_w = EXCLUDED.battery_power_w,
          battery_power_kw = EXCLUDED.battery_power_kw,
          battery_state = EXCLUDED.battery_state,
          battery_soc = EXCLUDED.battery_soc,
          solar_power_w = EXCLUDED.solar_power_w,
          solar_power_kw = EXCLUDED.solar_power_kw,
          grid_power_w = EXCLUDED.grid_power_w,
          grid_power_kw = EXCLUDED.grid_power_kw,
          load_power_w = EXCLUDED.load_power_w,
          load_power_kw = EXCLUDED.load_power_kw;
      `;

      for (let idx = 0; idx < timeArray.length; idx++) {
        let epoch = Number(timeArray[idx]);
        if (epoch > 1000000000000) epoch = Math.floor(epoch / 1000);
        let tStr = timeStrArray[idx];
        if (!tStr && epoch) {
          tStr = new Date((epoch + 5 * 3600) * 1000).toISOString().slice(11, 19);
        }
        if (!tStr) continue;
        if (tStr.length === 5) tStr += ":00";

        const sW = Number(solarPowerArray[idx] || 0);
        const bW = Number(batteryPowerArray[idx] || 0);
        const gW = Number(gridPowerArray[idx] || 0);
        const lW = Number(loadPowerArray[idx] || 0);
        const sc = Number(socArray[idx] || 0);

        const sKw = Number((sW / 1000).toFixed(2));
        const bKw = Number((bW / 1000).toFixed(2));
        const gKw = Number((gW / 1000).toFixed(2));
        const lKw = Number((lW / 1000).toFixed(2));

        let bState = "Idle";
        if (bKw > 0.05) bState = "Discharging";
        else if (bKw < -0.05) bState = "Charging";

        await pool.query(curveUpsertSql, [
          p.id,
          todayDateStr,
          epoch,
          tStr,
          bW,
          bKw,
          bState,
          sc,
          sW,
          sKw,
          gW,
          gKw,
          lW,
          lKw,
        ]);
        curvePointsCount++;

        latestCurvePoint = {
          timeStr: tStr,
          solarKw: sKw,
          batKw: bKw,
          batState: bState,
          soc: sc,
          gridKw: gKw,
          loadKw: lKw,
        };
      }

      console.log(`    -> Curve: Saved ${curvePointsCount} 5-min intervals (Latest: ${latestCurvePoint?.timeStr || 'N/A'}, PV: ${latestCurvePoint?.solarKw} kW, Bat: ${latestCurvePoint?.batKw} kW ${latestCurvePoint?.batState}, SOC: ${latestCurvePoint?.soc}%)`);

      // 3. Update solis_telemetry_latest with matching real-time numbers
      const liveSolarKw = latestCurvePoint ? latestCurvePoint.solarKw : Number(mix.power || 0);
      const liveSoc = latestCurvePoint ? latestCurvePoint.soc : Number(mix.batteryCapacitySoc || 0);
      const liveBatKw = latestCurvePoint ? Math.abs(latestCurvePoint.batKw) : Number(mix.batteryPower || 0);
      const liveBatState = latestCurvePoint ? latestCurvePoint.batState : (mix.batteryState || "Idle");
      const liveGridKw = latestCurvePoint ? latestCurvePoint.gridKw : Number(mix.gridPower || 0);
      const liveLoadKw = latestCurvePoint ? latestCurvePoint.loadKw : Number(mix.familyLoadPower || 0);

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

      console.log(`    -> Telemetry Latest: Synced to PV: ${liveSolarKw} kW | Battery: ${liveSoc}% (${liveBatState} ${liveBatKw} kW) | Grid: ${liveGridKw} kW`);

      // 4. Update today's energy in solis_daily_energy from /api/chart/station/month
      const monthRes = await postRequest("/api/chart/station/month", {
        id: p.id,
        time: "2026-11",
        month: "2026-11",
        timeZone: 5,
        money: "PKR",
      });
      const monthlyDays = monthRes.json?.data || [];
      const todayRecord = monthlyDays.find(d => (d.dateStr || d.date) === todayDateStr);
      if (todayRecord) {
        const dailyUpsertSql = `
          INSERT INTO solis_daily_energy (
            station_id, energy_date, solar_pv_kwh, house_load_kwh,
            battery_charge_kwh, battery_discharge_kwh,
            grid_purchased_kwh, grid_sold_kwh, backup_load_kwh,
            self_consumption_kwh, peak_sun_hours, currency, raw, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW()
          ) ON CONFLICT (station_id, energy_date) DO UPDATE SET
            solar_pv_kwh = EXCLUDED.solar_pv_kwh,
            house_load_kwh = EXCLUDED.house_load_kwh,
            battery_charge_kwh = EXCLUDED.battery_charge_kwh,
            battery_discharge_kwh = EXCLUDED.battery_discharge_kwh,
            grid_purchased_kwh = EXCLUDED.grid_purchased_kwh,
            grid_sold_kwh = EXCLUDED.grid_sold_kwh,
            backup_load_kwh = EXCLUDED.backup_load_kwh,
            self_consumption_kwh = EXCLUDED.self_consumption_kwh,
            peak_sun_hours = EXCLUDED.peak_sun_hours,
            currency = EXCLUDED.currency,
            raw = EXCLUDED.raw,
            updated_at = NOW();
        `;
        await pool.query(dailyUpsertSql, [
          p.id,
          todayDateStr,
          numOrNull(todayRecord.produceEnergy ?? todayRecord.energy ?? todayRecord.pvAndAcCoupledEnergy),
          numOrNull(todayRecord.consumeEnergy ?? todayRecord.homeLoadEnergy),
          numOrNull(todayRecord.batteryChargeEnergy),
          numOrNull(todayRecord.batteryDischargeEnergy),
          numOrNull(todayRecord.gridPurchasedEnergy),
          numOrNull(todayRecord.gridSellEnergy),
          numOrNull(todayRecord.backUpEnergy),
          numOrNull(todayRecord.oneSelf),
          numOrNull(todayRecord.fullHour),
          String(todayRecord.moneyStr || "PKR"),
          JSON.stringify(todayRecord),
        ]);
        console.log(`    -> Daily Energy Today: ${todayRecord.produceEnergy} kWh generated, ${todayRecord.batteryChargeEnergy || 0} kWh charged today.\n`);
      }

    } catch (err) {
      console.error(`Error on plant ${p.name}:`, err.message);
    }
  }

  console.log("=================================================================");
  console.log("   SYNC COMPLETE! Current Live Telemetry & Curve Points Updated.");
  console.log("=================================================================\n");

  await pool.end();
}

run().catch(console.error);
