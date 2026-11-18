/**
 * SolisCloud Full Historical Energy Collector & Excel Generator
 * Fetches all daily telemetry from inception (2026-07-21) to present (2026-11-18)
 * - 6 Energy Columns: PV, Import, Export, Charge, Discharge, Consumption (plus Date)
 * - Saves all daily records into Supabase 'solis_daily_energy'
 * - Generates 'solis_historical_energy_data.csv'
 * - Calls Python openpyxl to generate professional 'solis_historical_energy_data.xlsx'
 */

const crypto = require("crypto");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
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
  console.error("ERROR: Solis credentials not provided in .env.test");
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

async function run() {
  console.log("=================================================================");
  console.log("   SOLISCLOUD COMPLETE CLIENT HISTORICAL DATA EXPORT (EXCEL)");
  console.log("=================================================================");
  console.log("Target Plant:     OPL Residence (1298491919450958553)");
  console.log("Date Range:       2026-07-21 (Inception) to Present (2026-11-18)");
  console.log("Requested Cols:   PV, Import, Export, Charge, Discharge, Consumption");
  console.log("=================================================================\n");

  // Step 1: Login
  console.log("[1/4] Authenticating to SolisCloud (/api/user/login2)...");
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
  console.log("[OK] Authentication successful!");

  // Fetch Station metadata
  const stationDetailRes = await postRequest("/api/station/detail", {
    id: targetStationId,
    localTime: Date.now(),
    localTimeZone: 5,
    language: "2",
  });
  const st = stationDetailRes.json?.data || {};
  const stationName = st.stationName || "Menu Karachi Office";
  const capacityKwp = st.capacity || 80.0;
  const locationStr = [st.cityStr, st.countryStr].filter(Boolean).join(", ") || "Karachi, Pakistan";

  console.log(`[STATION] ${stationName} (ID: ${targetStationId}, ${capacityKwp} kWp, ${locationStr})`);

  // Step 2: Fetch all months since inception (2026-07 through 2026-11)
  const targetMonths = ["2026-07", "2026-08", "2026-09", "2026-10", "2026-11"];
  console.log(`\n[2/4] Fetching all daily energy records across ${targetMonths.length} months...`);

  const allDailyRecords = [];
  const monthlySummaries = [];

  for (const m of targetMonths) {
    process.stdout.write(`  Fetching month ${m}... `);
    const monthRes = await postRequest("/api/chart/station/month", {
      id: targetStationId,
      time: m,
      month: m,
      timeZone: 5,
      money: "PKR",
    });

    const records = monthRes.json?.data || [];
    console.log(`[OK] (${records.length} days)`);

    let mSolar = 0, mLoad = 0, mChg = 0, mDis = 0, mImp = 0, mExp = 0;

    for (const d of records) {
      allDailyRecords.push(d);
      mSolar += Number(d.produceEnergy || 0);
      mLoad += Number(d.consumeEnergy || 0);
      mChg += Number(d.batteryChargeEnergy || 0);
      mDis += Number(d.batteryDischargeEnergy || 0);
      mImp += Number(d.gridPurchasedEnergy || 0);
      mExp += Number(d.gridSellEnergy || 0);
    }

    monthlySummaries.push({
      month: m,
      days: records.length,
      pv_kwh: Number(mSolar.toFixed(1)),
      import_kwh: Number(mImp.toFixed(1)),
      export_kwh: Number(mExp.toFixed(1)),
      charge_kwh: Number(mChg.toFixed(1)),
      discharge_kwh: Number(mDis.toFixed(1)),
      consumption_kwh: Number(mLoad.toFixed(1)),
    });
  }

  // Sort daily records ascending by date
  allDailyRecords.sort((a, b) => (a.dateStr > b.dateStr ? 1 : -1));
  console.log(`\n[OK] Total historical daily records retrieved: ${allDailyRecords.length} days`);
  console.log(`     Earliest date: ${allDailyRecords[0]?.dateStr} | Latest date: ${allDailyRecords[allDailyRecords.length - 1]?.dateStr}`);

  // Step 3: Save to Supabase table 'solis_daily_energy'
  if (supabaseDbUrl) {
    console.log(`\n[3/4] Syncing all ${allDailyRecords.length} daily records to Supabase 'solis_daily_energy'...`);
    try {
      const savedCount = await saveDailyEnergyToSupabase(supabaseDbUrl, targetStationId, allDailyRecords);
      console.log(`[OK] Successfully saved ${savedCount} historical records into Supabase PostgreSQL!`);
    } catch (err) {
      console.error(`[WARN] Supabase storage warning: ${err.message}`);
    }
  }

  // Step 4: Write intermediate JSON and generate CSV & Excel files
  console.log("\n[4/4] Generating Excel sheet and CSV file...");
  const intermediateJson = path.join(__dirname, "temp_historical_data.json");
  fs.writeFileSync(
    intermediateJson,
    JSON.stringify(
      {
        stationId: targetStationId,
        stationName: stationName,
        capacityKwp: capacityKwp,
        location: locationStr,
        totalDays: allDailyRecords.length,
        monthlySummaries: monthlySummaries,
        dailyRecords: allDailyRecords.map((d) => ({
          date: d.dateStr,
          pv_kwh: Number(d.produceEnergy || 0),
          import_kwh: Number(d.gridPurchasedEnergy || 0),
          export_kwh: Number(d.gridSellEnergy || 0),
          charge_kwh: Number(d.batteryChargeEnergy || 0),
          discharge_kwh: Number(d.batteryDischargeEnergy || 0),
          consumption_kwh: Number(d.consumeEnergy || 0),
        })),
      },
      null,
      2
    )
  );

  // Write Daily CSV
  const csvPath = path.join(__dirname, "solis_historical_energy_data.csv");
  const csvLines = [
    "Date,PV (kWh),Import (kWh),Export (kWh),Charge (kWh),Discharge (kWh),Consumption (kWh)",
  ];
  for (const d of allDailyRecords) {
    csvLines.push(
      [
        d.dateStr,
        Number(d.produceEnergy || 0).toFixed(1),
        Number(d.gridPurchasedEnergy || 0).toFixed(1),
        Number(d.gridSellEnergy || 0).toFixed(1),
        Number(d.batteryChargeEnergy || 0).toFixed(1),
        Number(d.batteryDischargeEnergy || 0).toFixed(1),
        Number(d.consumeEnergy || 0).toFixed(1),
      ].join(",")
    );
  }
  fs.writeFileSync(csvPath, csvLines.join("\n"), "utf8");
  console.log(`[CSV] Exported Daily: ${csvPath}`);

  // Write Monthly CSV (6 columns + Total)
  const monthlyCsvPath = path.join(__dirname, "solis_monthly_energy_data.csv");
  const monthlyCsvLines = [
    "Month,PV (kWh),Import (kWh),Export (kWh),Charge (kWh),Discharge (kWh),Consumption (kWh)",
  ];
  let totPv = 0, totImp = 0, totExp = 0, totChg = 0, totDis = 0, totCons = 0;
  for (const s of monthlySummaries) {
    totPv += s.pv_kwh;
    totImp += s.import_kwh;
    totExp += s.export_kwh;
    totChg += s.charge_kwh;
    totDis += s.discharge_kwh;
    totCons += s.consumption_kwh;
    monthlyCsvLines.push(
      [
        s.month,
        s.pv_kwh.toFixed(1),
        s.import_kwh.toFixed(1),
        s.export_kwh.toFixed(1),
        s.charge_kwh.toFixed(1),
        s.discharge_kwh.toFixed(1),
        s.consumption_kwh.toFixed(1),
      ].join(",")
    );
  }
  monthlyCsvLines.push(
    [
      "TOTAL",
      totPv.toFixed(1),
      totImp.toFixed(1),
      totExp.toFixed(1),
      totChg.toFixed(1),
      totDis.toFixed(1),
      totCons.toFixed(1),
    ].join(",")
  );
  fs.writeFileSync(monthlyCsvPath, monthlyCsvLines.join("\n"), "utf8");
  console.log(`[CSV] Exported Monthly: ${monthlyCsvPath}`);

  // Run Python script to generate formatted Excel (.xlsx)
  try {
    const pyScript = path.join(__dirname, "generate_excel.py");
    execSync(`python "${pyScript}"`, { stdio: "inherit" });
  } catch (pyErr) {
    console.error("[WARN] Excel generation failed:", pyErr.message);
  }

  // Cleanup intermediate JSON
  if (fs.existsSync(intermediateJson)) {
    fs.unlinkSync(intermediateJson);
  }

  console.log("\n=================================================================");
  console.log("                   HISTORICAL TOTALS SUMMARY");
  console.log("=================================================================");
  let grandPv = 0, grandImp = 0, grandExp = 0, grandChg = 0, grandDis = 0, grandCons = 0;
  for (const s of monthlySummaries) {
    grandPv += s.pv_kwh;
    grandImp += s.import_kwh;
    grandExp += s.export_kwh;
    grandChg += s.charge_kwh;
    grandDis += s.discharge_kwh;
    grandCons += s.consumption_kwh;
  }
  console.table(monthlySummaries);
  console.log(`GRAND TOTALS (${allDailyRecords.length} days):`);
  console.log(`  Solar PV Yield:     ${grandPv.toFixed(1)} kWh (${(grandPv / 1000).toFixed(3)} MWh)`);
  console.log(`  Grid Imported:      ${grandImp.toFixed(1)} kWh (${(grandImp / 1000).toFixed(3)} MWh)`);
  console.log(`  Grid Exported:      ${grandExp.toFixed(1)} kWh (${(grandExp / 1000).toFixed(3)} MWh)`);
  console.log(`  Battery Charged:    ${grandChg.toFixed(1)} kWh (${(grandChg / 1000).toFixed(3)} MWh)`);
  console.log(`  Battery Discharged: ${grandDis.toFixed(1)} kWh (${(grandDis / 1000).toFixed(3)} MWh)`);
  console.log(`  Facility Load Cons: ${grandCons.toFixed(1)} kWh (${(grandCons / 1000).toFixed(3)} MWh)`);
  console.log("=================================================================\n");
}

run().catch((err) => {
  console.error("[FATAL ERROR]:", err.message);
  process.exit(1);
});
