/**
 * SolisCloud — Full Historical 5-Minute Curve Harvester & Supabase Uploader (High Performance Batch Mode)
 * Pulls all available daily curves (November 01 to November 18, 2026) across all 7 plants
 * and saves every 5-minute data point into Supabase table: solis_battery_power_curve.
 */

const https = require("https");
const crypto = require("crypto");
const fs = require("fs");
const { Pool } = require("pg");

const envContent = fs.readFileSync(".env.test", "utf8");
const localEnv = {};
envContent.split(/\r?\n/).forEach((l) => {
  const m = l.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (m) localEnv[m[1]] = m[2] ? m[2].replace(/^['"]|['"]$/g, "").trim() : "";
});

const SOLIS_USERNAME = localEnv.SOLIS_USERNAME;
const SOLIS_PASSWORD = localEnv.SOLIS_PASSWORD;
let SUPABASE_URL = localEnv.SUPABASE_DB_URL;
if (SUPABASE_URL.includes("pooler.supabase.com:5432")) {
  SUPABASE_URL = SUPABASE_URL.replace("pooler.supabase.com:5432", "pooler.supabase.com:6543");
}

const pool = new Pool({
  connectionString: SUPABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

const SOLIS_HMAC_SECRET = "5704383536604a8bb94c83ebc059aa8c";
const SOLIS_KEY_ID = "2424";

let sessionCookie = "";

function md5Base64(str) {
  return crypto.createHash("md5").update(str, "utf8").digest("base64");
}

function hmacSha1Base64(key, data) {
  return crypto.createHmac("sha1", key).update(data, "utf8").digest("base64");
}

function postRequest(path, body) {
  return new Promise((resolve, reject) => {
    const d = new Date().toUTCString();
    const b = JSON.stringify(body);
    const md = md5Base64(b);
    const sp = path.replace(/^\/api/, "");
    const sig = hmacSha1Base64(SOLIS_HMAC_SECRET, "POST\n" + md + "\napplication/json\n" + d + "\n" + sp);
    const headers = {
      "Content-Type": "application/json;charset=UTF-8",
      "Content-MD5": md,
      "Authorization": "WEB " + SOLIS_KEY_ID + ":" + sig,
      "Time": d,
      "Language": "2",
      "Content-Length": Buffer.byteLength(b),
    };
    if (sessionCookie) headers["Cookie"] = sessionCookie;

    const req = https.request("https://www.soliscloud.com" + path, {
      method: "POST",
      headers,
    }, (res) => {
      const setCookies = res.headers["set-cookie"];
      if (setCookies) {
        sessionCookie = setCookies.map((c) => c.split(";")[0]).join("; ");
      }
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ raw: data });
        }
      });
    });
    req.on("error", reject);
    req.write(b);
    req.end();
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const plants = [
  { id: "1298491919450797504", name: "Menu Karachi Office" },
  { id: "1298491919450958553", name: "OPL Residence" },
  { id: "1298491919450873747", name: "36 Chenab" },
  { id: "1298491919450740581", name: "P2G 50KW" },
  { id: "1298491919450840394", name: "P2G 1ST 6kw" },
  { id: "1298491919450851319", name: "P2G 20kw" },
  { id: "1298491919450734544", name: "P2G 15KW" },
];

// Generate November 1 to November 18 dates
const dates = [];
for (let d = 1; d <= 18; d++) {
  const dayStr = String(d).padStart(2, "0");
  dates.push(`2026-11-${dayStr}`);
}

async function uploadDayCurveBatchToSupabase(stationId, dateStr, curveData) {
  const timeArray = curveData.time || [];
  const timeStrArray = curveData.timeStr || [];
  const solarPowerArray = curveData.pvAndAcCoupledPowerList || curveData.powerList || [];
  const batteryPowerArray = curveData.batteryPower || [];
  const gridPowerArray = curveData.psum || curveData.gridPowerList || [];
  const loadPowerArray = curveData.familyLoadPowerList || curveData.bypassLoadPowerList || [];
  const socArray = curveData.batteryCapacitySocList || [];

  if (timeArray.length === 0) return 0;

  const rows = [];
  for (let idx = 0; idx < timeArray.length; idx++) {
    let tStr = timeStrArray[idx];
    const epoch = Number(timeArray[idx]);
    if (!tStr && epoch) {
      tStr = new Date(epoch + 5 * 3600 * 1000).toISOString().slice(11, 16) + ":00";
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

  if (rows.length === 0) return 0;

  // Build high-efficiency multi-row parameterized batch query (e.g. 50 rows per batch)
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
        load_power_kw = EXCLUDED.load_power_kw;
    `;

    await pool.query(batchSql, params);
  }

  return rows.length;
}

async function main() {
  console.log("===============================================================");
  console.log(" SOLISCLOUD -> SUPABASE: FAST BATCH HISTORICAL CURVE HARVESTER");
  console.log(" Dates: November 01 -> November 18, 2026");
  console.log(" Plants: All 7 authorized plants");
  console.log("===============================================================\n");

  const passMd5 = crypto.createHash("md5").update(SOLIS_PASSWORD, "utf8").digest("hex");
  const login = await postRequest("/api/user/login2", {
    userInfo: SOLIS_USERNAME,
    passWord: passMd5,
    yingZhenType: 1,
    localTime: Date.now(),
    localTimeZone: 5,
    language: "2",
  });

  if (login.code !== "0" && login.code !== 0) {
    console.error("Login failed:", login);
    process.exit(1);
  }
  console.log("[OK] SolisCloud authentication verified!\n");

  let totalUploaded = 0;

  for (const plant of plants) {
    console.log(`\n>>> Harvesting curves for: ${plant.name} (${plant.id})`);
    let plantTotal = 0;

    for (const date of dates) {
      try {
        const res = await postRequest("/api/chart/station/day/v2", {
          id: plant.id,
          time: date,
          timeZone: 5,
        });

        const dayCurve = res.data || {};
        const count = await uploadDayCurveBatchToSupabase(plant.id, date, dayCurve);
        if (count > 0) {
          const maxSolar = Math.max(...(dayCurve.pvAndAcCoupledPowerList || [0]));
          console.log(`  [${date}] -> Saved ${count} points (Peak Solar: ${(maxSolar / 1000).toFixed(1)} kW)`);
          plantTotal += count;
        } else {
          console.log(`  [${date}] -> 0 points (Offline or No Gen)`);
        }
      } catch (err) {
        console.error(`  [${date}] -> Error: ${err.message}`);
      }
      await sleep(50);
    }

    console.log(`[DONE] ${plant.name}: ${plantTotal} points saved into Supabase.`);
    totalUploaded += plantTotal;
  }

  console.log(`\n===============================================================`);
  console.log(`[SUCCESS] Full harvest complete! Total ${totalUploaded} points saved.`);
  console.log(`===============================================================`);
  await pool.end();
}

main().catch((err) => {
  console.error("Fatal harvest error:", err);
  pool.end();
});
