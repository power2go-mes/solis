const https = require("https");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const SOLIS_HMAC_SECRET = "5704383536604a8bb94c83ebc059aa8c";
const SOLIS_KEY_ID = "2424";
let sessionCookie = null;

let dbUrl = process.env.DATABASE_URL;
if (!dbUrl && fs.existsSync(path.join(__dirname, ".env.local"))) {
  fs.readFileSync(path.join(__dirname, ".env.local"), "utf8")
    .split("\n")
    .forEach((line) => {
      if (line.startsWith("DATABASE_URL=")) {
        dbUrl = line.split("=")[1].trim();
      }
    });
}
if (dbUrl && dbUrl.includes("pooler.supabase.com:5432")) {
  dbUrl = dbUrl.replace("pooler.supabase.com:5432", "pooler.supabase.com:6543");
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

function md5Base64(str) { return crypto.createHash("md5").update(str, "utf8").digest("base64"); }
function hmacSha1Base64(key, data) { return crypto.createHmac("sha1", key).update(data, "utf8").digest("base64"); }

function solisPost(apiPath, body = {}) {
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
    if (sessionCookie) headers["Cookie"] = sessionCookie;

    const req = https.request(
      "https://www.soliscloud.com" + apiPath,
      { method: "POST", headers, timeout: 25000 },
      (res) => {
        if (res.headers["set-cookie"]) {
          sessionCookie = res.headers["set-cookie"].map((c) => c.split(";")[0]).join("; ");
        }
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try { resolve(JSON.parse(data)); } catch { resolve({ raw: data }); }
        });
      }
    );
    req.on("error", reject);
    req.write(bodyStr);
    req.end();
  });
}

async function ensureLogin() {
  const passMd5 = crypto.createHash("md5").update("POWER2GO").digest("hex");
  await solisPost("/api/user/login2", {
    userInfo: "Qasim Moosvi",
    passWord: passMd5,
    yingZhenType: 1,
    localTime: Date.now(),
    localTimeZone: 5,
    language: "2",
  });
}

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

async function backfillDays(daysCount = 14) {
  await ensureLogin();

  // Generate list of dates from yesterday backwards
  const dates = [];
  for (let d = 1; d <= daysCount; d++) {
    const dt = new Date(Date.now() + 5 * 3600 * 1000 - d * 24 * 3600 * 1000);
    dates.push(dt.toISOString().slice(0, 10));
  }

  console.log(`Starting backfill for ${dates.length} days: ${dates[dates.length - 1]} to ${dates[0]}`);

  for (const [invSn, invId] of Object.entries(INVERTER_MAP)) {
    console.log(`\n--- Backfilling Inverter: ${invSn} ---`);
    for (const dStr of dates) {
      try {
        // Check if already in db with >= 100 points
        const check = await pool.query(
          "SELECT count(*) FROM solis_inverter_day_curve WHERE inverter_sn = $1 AND curve_date = $2",
          [invSn, dStr]
        );
        if (Number(check.rows[0].count) >= 100) {
          // Already populated
          continue;
        }

        let res = await solisPost("/api/chart/inverter/day", {
          id: invId,
          time: dStr,
          timeZone: 5,
        });

        if (!res.success) {
          await ensureLogin();
          res = await solisPost("/api/chart/inverter/day", {
            id: invId,
            time: dStr,
            timeZone: 5,
          });
        }

        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          const rows = res.data;
          const values = [];
          const params = [];
          const seenTimes = new Set();
          let pIdx = 1;

          for (const item of rows) {
            const timeStr = item.time || (item.timeStr ? item.timeStr.split(" ")[1] : "00:00:00");
            if (seenTimes.has(timeStr)) continue;
            seenTimes.add(timeStr);

            const pacKw = Number((Number(item.pac || 0) / 1000).toFixed(2));
            const batPowerKw = Number((Number(item.batteryPower || 0) / 1000).toFixed(2));
            const soc = Math.round(Number(item.batteryCapacitySoc || 0));
            const batVolt = Number(item.batteryVoltage || item.storageBatteryVoltage || 0);
            const tempC = Number(item.inverterTemperature || 0);
            const eToday = Number(item.eToday || 0);

            values.push(`($${pIdx}, $${pIdx+1}, $${pIdx+2}, $${pIdx+3}, $${pIdx+4}, $${pIdx+5}, $${pIdx+6}, $${pIdx+7}, $${pIdx+8})`);
            params.push(invSn, dStr, timeStr, pacKw, batPowerKw, soc, batVolt, tempC, eToday);
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
            console.log(`✅ [${invSn}] ${dStr}: Saved ${values.length} 5-minute points`);
          }
        }
        await new Promise((r) => setTimeout(r, 200));
      } catch (err) {
        console.error(`❌ [${invSn}] ${dStr} error:`, err.message);
      }
    }
  }

  console.log("\nAll historical days successfully backfilled!");
  pool.end();
}

backfillDays(14).catch(console.error);
