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

async function syncInverterCurvesForDates(dates) {
  await ensureLogin();

  for (const [invSn, invId] of Object.entries(INVERTER_MAP)) {
    for (const dStr of dates) {
      try {
        let res = await solisPost("/api/chart/inverter/day", {
          id: invId,
          time: dStr,
          timeZone: 5,
        });

        if (!res.success && res.code === "1000") {
          await ensureLogin();
          res = await solisPost("/api/chart/inverter/day", {
            id: invId,
            time: dStr,
            timeZone: 5,
          });
        }

        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          const rows = res.data;
          // Batch insert into solis_inverter_day_curve
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
            console.log(`✅ Synced ${invSn} for ${dStr}: ${values.length} 5-minute points`);
          }
        } else {
          console.log(`⚠️ No points for ${invSn} on ${dStr}`);
        }
        await new Promise((r) => setTimeout(r, 250));
      } catch (err) {
        console.error(`❌ Error syncing ${invSn} for ${dStr}:`, err.message);
      }
    }
  }
}

async function main() {
  const dates = ["2026-11-26", "2026-11-27"];
  console.log(`Starting backfill of 5-minute inverter curves for dates: ${dates.join(", ")}`);
  await syncInverterCurvesForDates(dates);
  console.log("Backfill complete!");
  pool.end();
}

main().catch(console.error);
