/**
 * SolisCloud Lifetime Historical Daily Energy Harvester
 * Harvests all daily energy records from commissioning through November 2026
 * for all 5 active client plants and writes directly to Supabase PostgreSQL.
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

const ACTIVE_PLANTS = [
  { id: "1298491919450740581", name: "P2G 50KW", startMonth: "2026-06" },
  { id: "1298491919450797504", name: "Menu Karachi Office", startMonth: "2026-07" },
  { id: "1298491919450840394", name: "P2G 1ST 6kw", startMonth: "2026-08" },
  { id: "1298491919450873747", name: "36 Chenab", startMonth: "2026-09" },
  { id: "1298491919450958553", name: "OPL Residence", startMonth: "2026-10" },
];

function generateMonthsList(startMonth, endMonth = "2026-11") {
  const [startY, startM] = startMonth.split("-").map(Number);
  const [endY, endM] = endMonth.split("-").map(Number);
  const months = [];
  let curY = startY;
  let curM = startM;
  while (curY < endY || (curY === endY && curM <= endM)) {
    months.push(`${curY}-${String(curM).padStart(2, "0")}`);
    curM++;
    if (curM > 12) {
      curM = 1;
      curY++;
    }
  }
  return months;
}

function numOrNull(val) {
  if (val === null || val === undefined || val === "") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

const upsertSql = `
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

async function run() {
  console.log("=================================================================");
  console.log("    SOLISCLOUD -> SUPABASE: LIFETIME DAILY ENERGY HARVESTER");
  console.log("    Plants: 5 Active Client Plants");
  console.log("    Coverage: Commissioning (Day 1) -> Today (November 18, 2026)");
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
    console.error("[FAIL] Login failed:", loginRes.json?.msg);
    process.exit(1);
  }
  console.log("[OK] Authentication successful! Session established.\n");

  let grandTotalRecords = 0;

  for (const plant of ACTIVE_PLANTS) {
    const months = generateMonthsList(plant.startMonth, "2026-11");
    console.log(`>>> Harvesting lifetime data for: ${plant.name} (${plant.id})`);
    console.log(`    Target Months (${months.length}): ${months.join(", ")}`);

    let plantSaved = 0;

    for (const m of months) {
      try {
        const chartRes = await postRequest("/api/chart/station/month", {
          id: plant.id,
          time: m,
          month: m,
          timeZone: 5,
          money: "PKR",
        });

        const dailyList = chartRes.json?.data || [];
        if (!Array.isArray(dailyList) || dailyList.length === 0) {
          console.log(`    [${m}] 0 records returned`);
          continue;
        }

        let monthSaved = 0;
        for (const d of dailyList) {
          const dateStr = d.dateStr || d.date || d.timeStr;
          if (!dateStr) continue;

          await pool.query(upsertSql, [
            plant.id,
            dateStr,
            numOrNull(d.produceEnergy ?? d.energy ?? d.pvAndAcCoupledEnergy),
            numOrNull(d.consumeEnergy ?? d.homeLoadEnergy),
            numOrNull(d.batteryChargeEnergy),
            numOrNull(d.batteryDischargeEnergy),
            numOrNull(d.gridPurchasedEnergy),
            numOrNull(d.gridSellEnergy),
            numOrNull(d.backUpEnergy),
            numOrNull(d.oneSelf),
            numOrNull(d.fullHour),
            String(d.moneyStr || "PKR"),
            JSON.stringify(d),
          ]);
          monthSaved++;
        }

        plantSaved += monthSaved;
        console.log(`    [${m}] -> Saved ${monthSaved} daily energy records to Supabase`);
      } catch (err) {
        console.error(`    [${m}] Error:`, err.message);
      }
    }

    grandTotalRecords += plantSaved;
    console.log(`    [OK] Finished ${plant.name}: ${plantSaved} lifetime daily energy records saved.\n`);
  }

  console.log("=================================================================");
  console.log(`[DONE] Total Lifetime Daily Energy Records Stored: ${grandTotalRecords}`);
  console.log("=================================================================");

  // Verification count from Supabase
  const checkRes = await pool.query(`
    SELECT station_id, count(*), MIN(energy_date)::text as first_day, MAX(energy_date)::text as last_day,
           SUM(solar_pv_kwh)::numeric(12,1) as total_solar_kwh,
           SUM(battery_charge_kwh)::numeric(12,1) as total_battery_charge_kwh
    FROM solis_daily_energy
    GROUP BY station_id
    ORDER BY station_id
  `);
  console.log("\nSupabase solis_daily_energy verification:");
  console.table(checkRes.rows);

  await pool.end();
}

run().catch(console.error);
