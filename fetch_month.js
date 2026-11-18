/**
 * SolisCloud Monthly & Historical Energy Data Collector
 * 
 * Fetches exact day-by-day and total energy metrics for any month:
 * - Solar PV generation (kWh & MWh)
 * - House / Facility consumption (kWh & MWh)
 * - Battery charge & discharge energy (kWh)
 * - Grid import (purchased) & grid export (sold) (kWh & MWh)
 * - Backup load & direct self-consumption (kWh)
 * - Peak sun hours / equivalent generation hours
 * - Saves complete daily audit records to Supabase PostgreSQL ('solis_daily_energy')
 * 
 * Usage:
 *   node fetch_month.js            (Fetches previous full month + current month-to-date)
 *   node fetch_month.js 2026-10    (Fetches specific month)
 *   node fetch_month.js 2026-11
 */

const crypto = require("crypto");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { saveDailyEnergyToSupabase } = require("./supabase");

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

const envFile = path.join(__dirname, ".env.test");
const localEnv = loadEnvFile(envFile);

const solisUser = process.env.SOLIS_USERNAME || localEnv.SOLIS_USERNAME;
const solisPass = process.env.SOLIS_PASSWORD || localEnv.SOLIS_PASSWORD;
const targetStationId = process.env.SOLIS_STATION_ID || localEnv.SOLIS_STATION_ID;
const supabaseDbUrl = process.env.SUPABASE_DB_URL || localEnv.SUPABASE_DB_URL;

if (!solisUser || !solisPass) {
  console.error("ERROR: SolisCloud credentials not provided in .env.test");
  process.exit(1);
}

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

async function fetchMonthData(monthStr, stationId) {
  const chartRes = await postRequest("/api/chart/station/month", {
    id: stationId,
    time: monthStr,
    month: monthStr,
    timeZone: 5,
    money: "PKR",
  });

  if (!chartRes.json || !chartRes.json.success) {
    throw new Error(chartRes.json?.msg || `Failed to fetch data for ${monthStr}`);
  }

  return chartRes.json.data || [];
}

async function run() {
  console.log("=================================================================");
  console.log("      SOLISCLOUD HISTORICAL MONTHLY DATA COLLECTOR");
  console.log("=================================================================");
  console.log("Target Host:      https://www.soliscloud.com");
  console.log(`User Identity:    ${solisUser.replace(/(.{3})(.*)(@.*)/, "$1***$3")}`);
  console.log("Mode:             Exact Historical Data Fetch (Zero Assumptions)");
  console.log("=================================================================\n");

  // Step 1: Login
  console.log("[1/3] Authenticating to SolisCloud (/api/user/login2)...");
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
    console.error("[FAIL] Login failed:", loginRes.json?.msg || `HTTP ${loginRes.status}`);
    process.exit(1);
  }
  console.log("[OK] Authentication successful! Session established.");

  // Determine months to query
  const specifiedMonth = process.argv.find((a) => /^\d{4}-\d{2}$/.test(a));
  let monthsToQuery = [];

  if (specifiedMonth) {
    monthsToQuery = [specifiedMonth];
  } else {
    // Default: Previous whole month (October 2026) + Current month to date (November 2026)
    const now = new Date();
    const currYear = now.getFullYear();
    const currMonth = now.getMonth() + 1;
    const prevMonthDate = new Date(currYear, currMonth - 2, 1);
    
    const prevM = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;
    const currM = `${currYear}-${String(currMonth).padStart(2, "0")}`;
    monthsToQuery = [prevM, currM];
  }

  console.log(`\n[2/3] Fetching exact energy figures for month(s): ${monthsToQuery.join(", ")}...`);

  for (const m of monthsToQuery) {
    const dailyRecords = await fetchMonthData(m, targetStationId);
    if (dailyRecords.length === 0) {
      console.log(`\n[INFO] No recorded generation data for month ${m}.`);
      continue;
    }

    let solarTot = 0;
    let loadTot = 0;
    let battChgTot = 0;
    let battDisTot = 0;
    let gridImpTot = 0;
    let gridExpTot = 0;
    let selfConsTot = 0;

    for (const d of dailyRecords) {
      solarTot += Number(d.produceEnergy || 0);
      loadTot += Number(d.consumeEnergy || 0);
      battChgTot += Number(d.batteryChargeEnergy || 0);
      battDisTot += Number(d.batteryDischargeEnergy || 0);
      gridImpTot += Number(d.gridPurchasedEnergy || 0);
      gridExpTot += Number(d.gridSellEnergy || 0);
      selfConsTot += Number(d.oneSelf || 0);
    }

    const daysCount = dailyRecords.length;
    const avgDailySolar = (solarTot / daysCount).toFixed(1);
    const avgDailyLoad = (loadTot / daysCount).toFixed(1);

    console.log(`\n========================================================================================================================`);
    console.log(`                            EXACT MONTHLY ENERGY AUDIT FOR ${m} (${daysCount} days recorded)`);
    console.log(`========================================================================================================================`);
    console.log(`  Total Solar PV Yield:         ${solarTot.toFixed(2)} kWh  (${(solarTot / 1000).toFixed(3)} MWh) | Daily Avg: ${avgDailySolar} kWh/day`);
    console.log(`  Total Facility Load:          ${loadTot.toFixed(2)} kWh  (${(loadTot / 1000).toFixed(3)} MWh) | Daily Avg: ${avgDailyLoad} kWh/day`);
    console.log(`  Total Battery Energy Charged: ${battChgTot.toFixed(2)} kWh`);
    console.log(`  Total Battery Discharged:     ${battDisTot.toFixed(2)} kWh`);
    console.log(`  Total Grid Purchased/Import:  ${gridImpTot.toFixed(2)} kWh`);
    console.log(`  Total Grid Exported/Sold:     ${gridExpTot.toFixed(2)} kWh  (${(gridExpTot / 1000).toFixed(3)} MWh)`);
    console.log(`  Direct Self-Consumption:      ${selfConsTot.toFixed(2)} kWh (${solarTot > 0 ? ((selfConsTot / solarTot) * 100).toFixed(1) : 0} % solar utilized on-site)`);
    console.log(`------------------------------------------------------------------------------------------------------------------------`);

    console.log("\n  Exact Day-by-Day Energy Breakdown:");
    console.table(
      dailyRecords.map((d) => ({
        Date: d.dateStr,
        "Solar (kWh)": Number(d.produceEnergy).toFixed(1),
        "Load (kWh)": Number(d.consumeEnergy).toFixed(1),
        "Batt Chg (kWh)": Number(d.batteryChargeEnergy).toFixed(1),
        "Batt Dis (kWh)": Number(d.batteryDischargeEnergy).toFixed(1),
        "Grid Buy (kWh)": Number(d.gridPurchasedEnergy).toFixed(1),
        "Grid Sell (kWh)": Number(d.gridSellEnergy).toFixed(1),
        "Peak Sun Hrs": Number(d.fullHour).toFixed(2),
      }))
    );

    // Save to Supabase
    if (supabaseDbUrl) {
      try {
        const savedCount = await saveDailyEnergyToSupabase(supabaseDbUrl, targetStationId, dailyRecords);
        console.log(`  [OK] Saved ${savedCount} daily energy records for ${m} to Supabase table 'solis_daily_energy'.`);
      } catch (err) {
        console.error(`  [WARN] Failed to save daily records to Supabase: ${err.message}`);
      }
    }
  }

  console.log("\n[3/3] Monthly audit complete. All numbers extracted directly from SolisCloud internal telemetry.");
}

run().catch((err) => {
  console.error("[FATAL ERROR]:", err.message);
  process.exit(1);
});
