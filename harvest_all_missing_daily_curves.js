/**
 * SolisCloud Full Historical 5-Minute Daily Curve Harvester
 * Harvests all missing 5-minute daily curves (from plant commissioning up to Nov 2026)
 * for the 5 active client plants and writes directly to Supabase PostgreSQL.
 */

const crypto = require("crypto");
const https = require("https");
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
  console.error("Missing SolisCloud credentials or DATABASE_URL");
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
  if (!loginRes.json || !loginRes.json.success) {
    throw new Error(`Login failed: ${loginRes.json?.msg || "unknown"}`);
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const PLANT_NAMES = {
  "1298491919450740581": "P2G 50KW",
  "1298491919450797504": "Menu Karachi Office",
  "1298491919450840394": "P2G 1ST 6kw",
  "1298491919450873747": "36 Chenab",
  "1298491919450958553": "OPL Residence",
};

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
    let rawEpoch = Number(timeArray[idx]);
    let epoch = rawEpoch;
    if (epoch > 1000000000000) {
      epoch = Math.floor(epoch / 1000); // normalize milliseconds to seconds
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

  if (rows.length === 0) return 0;

  // Insert in batches of 50
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

async function main() {
  console.log("=================================================================");
  console.log("   SOLISCLOUD HISTORICAL 5-MINUTE DAILY CURVES HARVESTER");
  console.log("   Target: All Missing Days from Day 01 Commissioning to Present");
  console.log("   Writing directly to Supabase table: solis_battery_power_curve");
  console.log("=================================================================\n");

  console.log("[1/3] Authenticating to SolisCloud...");
  await doLogin();
  console.log("[OK] Authentication successful.\n");

  console.log("[2/3] Querying Supabase for missing curve dates...");
  const missingRes = await pool.query(`
    SELECT e.station_id, e.energy_date::text as target_date
    FROM solis_daily_energy e
    LEFT JOIN (
      SELECT DISTINCT station_id, curve_date
      FROM solis_battery_power_curve
    ) c ON e.station_id = c.station_id AND e.energy_date = c.curve_date
    WHERE c.curve_date IS NULL
    ORDER BY e.station_id, e.energy_date DESC
  `);

  const missingJobs = missingRes.rows;
  console.log(`Found ${missingJobs.length} missing plant-days across active clients.\n`);

  if (missingJobs.length === 0) {
    console.log("No missing curve dates found! Everything is fully synchronized.");
    await pool.end();
    return;
  }

  console.log("[3/3] Beginning batch harvesting and upsertion...");
  let totalSavedPoints = 0;
  let completedDays = 0;
  const startTime = Date.now();

  for (let i = 0; i < missingJobs.length; i++) {
    const job = missingJobs[i];
    const plantName = PLANT_NAMES[job.station_id] || job.station_id;

    let res = await postRequest("/api/chart/station/day/v2", {
      id: job.station_id,
      time: job.target_date,
      timeZone: 5,
    });

    // Handle token expiration
    if (res.json?.code === "Z0001" || (res.json?.msg && res.json.msg.includes("Login"))) {
      console.log("  [!] Session expired, re-authenticating...");
      await doLogin();
      res = await postRequest("/api/chart/station/day/v2", {
        id: job.station_id,
        time: job.target_date,
        timeZone: 5,
      });
    }

    if (res.json && res.json.code === "0" && res.json.data) {
      const pointCount = await uploadDayCurveBatchToSupabase(
        job.station_id,
        job.target_date,
        res.json.data
      );
      totalSavedPoints += pointCount;
      completedDays++;

      if (completedDays % 10 === 0 || completedDays === missingJobs.length) {
        const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(
          `[${completedDays}/${missingJobs.length}] ${plantName} | ${job.target_date} -> ${pointCount} points saved. (Total points: ${totalSavedPoints}, Elapsed: ${elapsedSec}s)`
        );
      }
    } else {
      console.warn(`  [!] Warning: No data for ${plantName} on ${job.target_date} (code: ${res.json?.code}, msg: ${res.json?.msg})`);
    }

    // Small delay between requests to be gentle on SolisCloud
    await sleep(150);
  }

  const durationMin = ((Date.now() - startTime) / 60000).toFixed(2);
  console.log("\n=================================================================");
  console.log(`[DONE] Finished harvesting in ${durationMin} minutes!`);
  console.log(`Total days harvested: ${completedDays}/${missingJobs.length}`);
  console.log(`Total 5-minute curve points written to Supabase: ${totalSavedPoints}`);
  console.log("=================================================================\n");

  await pool.end();
}

main().catch((err) => {
  console.error("FATAL ERROR in harvesting:", err);
  process.exit(1);
});
