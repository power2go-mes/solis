/**
 * fetch_36_chenab_temperature.js
 * Inspects inverters, dataloggers, and temperature history for "36 Chenab" (ID: 1298491919450873747)
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

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

const HMAC_SECRET = "5704383536604a8bb94c83ebc059aa8c";
const KEY_ID = "2424";
let sessionCookie = null;

function md5Base64(str) {
  return crypto.createHash("md5").update(str, "utf8").digest("base64");
}

function hmacSha1Base64(key, data) {
  return crypto.createHmac("sha1", key).update(data, "utf8").digest("base64");
}

function solisPost(apiPath, body = {}) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const date = new Date().toUTCString();
    const contentMd5 = md5Base64(bodyStr);
    const signPath = apiPath.replace(/^\/api/, "");
    const signStr = `POST\n${contentMd5}\napplication/json\n${date}\n${signPath}`;
    const signature = hmacSha1Base64(HMAC_SECRET, signStr);

    const headers = {
      "Content-Type": "application/json;charset=UTF-8",
      "Content-MD5": contentMd5,
      "Authorization": `WEB ${KEY_ID}:${signature}`,
      "Time": date,
      "Accept": "application/json, text/plain, */*",
      "Language": "2",
      "X-Cloud-Platform": "GLY",
      "Version": "5.3.001",
      "Platform": "Web",
      "Content-Length": Buffer.byteLength(bodyStr),
    };

    if (sessionCookie) headers["Cookie"] = sessionCookie;

    const req = https.request("https://www.soliscloud.com" + apiPath, { method: "POST", headers, timeout: 20000 }, (res) => {
      const setCookie = res.headers["set-cookie"];
      if (setCookie) {
        const tokenCookie = setCookie.find((c) => c.startsWith("token="));
        if (tokenCookie) sessionCookie = tokenCookie.split(";")[0];
      }
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve({ raw: data }); }
      });
    });
    req.on("error", reject);
    req.write(bodyStr);
    req.end();
  });
}

async function main() {
  const STATION_ID = "1298491919450873747"; // 36 Chenab

  console.log("=== 1. CHECK DATABASE FOR 36 CHENAB ===");
  const client = await pool.connect();
  try {
    const dbPlants = await client.query("SELECT * FROM solis_telemetry_latest WHERE plant_id = $1", [STATION_ID]);
    console.log("Telemetry rows in DB for 36 Chenab:", dbPlants.rows.length);
    if (dbPlants.rows.length > 0) {
      console.log("Latest DB row:", dbPlants.rows[0]);
    }

    const curveRows = await client.query("SELECT * FROM solis_battery_power_curve WHERE plant_id = $1 ORDER BY timestamp_utc ASC LIMIT 5", [STATION_ID]);
    console.log("Curve rows count in DB for 36 Chenab:", curveRows.rows.length);
  } catch (err) {
    console.error("DB query err:", err.message);
  } finally {
    client.release();
  }

  console.log("\n=== 2. LOGIN TO SOLISCLOUD API ===");
  const passMd5 = crypto.createHash("md5").update("POWER2GO").digest("hex");
  const loginRes = await solisPost("/api/user/login2", {
    userInfo: "Qasim Moosvi",
    passWord: passMd5,
    yingZhenType: 1,
    localTime: Date.now(),
    localTimeZone: 5,
    language: "2",
  });
  console.log("Login result:", loginRes.code === 0 ? "SUCCESS" : loginRes.msg);

  console.log("\n=== 3. QUERY INVERTERS AT 36 CHENAB ===");
  const invList = await solisPost("/api/station/inverter/list", { stationId: STATION_ID, pageNo: 1, pageSize: 20 });
  console.log("Inverters response:", invList.code, invList.data?.records ? invList.data.records.length : 0);
  
  if (invList.data?.records && invList.data.records.length > 0) {
    const inv = invList.data.records[0];
    console.log("Inverter at 36 Chenab:", {
      sn: inv.sn,
      model: inv.model,
      installer: inv.installer,
      createDate: inv.createDate,
      createDateStr: inv.createDateStr
    });

    const invDetail = await solisPost("/api/inverter/detail", { sn: inv.sn });
    console.log("Current Inverter Detail Temp:", {
      inverterTemperature: invDetail.data?.inverterTemperature,
      inverterTemperature2: invDetail.data?.inverterTemperature2,
      todayYield: invDetail.data?.eToday,
      totalYield: invDetail.data?.eTotal,
      pac: invDetail.data?.pac
    });

    fs.writeFileSync("chenab_inverter_detail.json", JSON.stringify(invDetail.data, null, 2));
  } else {
    // Try detailMix or device list
    const detailMix = await solisPost("/api/station/detailMix", { id: STATION_ID });
    console.log("detailMix:", detailMix.data ? Object.keys(detailMix.data) : detailMix);
  }

  pool.end();
}

main().catch(console.error);
