/**
 * extract_all_chenab_temperature_history.js
 * -----------------------------------------
 * 1. Finds the first day of generation / operation for Inverter 1053010259280019 (36 Chenab).
 * 2. Queries /api/chart/inverter/day for every day from day 1 to today.
 * 3. Extracts Min, Max, and Average Inverter Temperature for each day.
 */

const https = require("https");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const HMAC_SECRET = "5704383536604a8bb94c83ebc059aa8c";
const KEY_ID = "2424";
const INVERTER_ID = "1308675217950513392";
const INVERTER_SN = "1053010259280019";
const STATION_ID = "1298491919450873747";

let sessionCookie = null;

function md5Base64(str) { return crypto.createHash("md5").update(str, "utf8").digest("base64"); }
function hmacSha1Base64(key, data) { return crypto.createHmac("sha1", key).update(data, "utf8").digest("base64"); }

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
      if (res.headers["set-cookie"]) {
        sessionCookie = res.headers["set-cookie"].map(c => c.split(";")[0]).join("; ");
      }
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve({ raw: data }); }
      });
    });
    req.on("error", reject);
    req.write(bodyStr);
    req.end();
  });
}

async function login() {
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

async function getFirstDate() {
  // Check station detailMix for fisGenerateTime or fisPowerTime
  const mix = await solisPost("/api/station/detailMix", { id: STATION_ID });
  const d = mix.data || {};
  console.log("Station First Times:", {
    fisGenerateTime: d.fisGenerateTime,
    fisGenerateTimeStr: d.fisGenerateTimeStr,
    fisPowerTime: d.fisPowerTime,
    fisPowerTimeStr: d.fisPowerTimeStr,
    createDateStr: d.createDateStr,
    accessTimeStr: d.accessTimeStr
  });
  return d.fisGenerateTimeStr || d.createDateStr || "2026-09-01";
}

async function main() {
  await login();
  console.log("Logged in.");

  const firstDateStr = await getFirstDate();
  console.log("Plant 36 Chenab Day One:", firstDateStr);

  // Generate date list from day one to today (2026-11-24)
  // Let's parse the date string (e.g., DD/MM/YYYY or YYYY-MM-DD)
  let startYear = 2026, startMonth = 10, startDay = 1;
  const parts = firstDateStr.split(/[\/\-\s:]/);
  if (parts.length >= 3) {
    if (parts[2].length === 4) { // DD/MM/YYYY
      startDay = parseInt(parts[0], 10);
      startMonth = parseInt(parts[1], 10) - 1;
      startYear = parseInt(parts[2], 10);
    } else if (parts[0].length === 4) { // YYYY-MM-DD
      startYear = parseInt(parts[0], 10);
      startMonth = parseInt(parts[1], 10) - 1;
      startDay = parseInt(parts[2], 10);
    }
  }

  const startDate = new Date(startYear, startMonth, startDay);
  const endDate = new Date(2026, 10, 24); // Nov 24, 2026

  const dateList = [];
  const cur = new Date(startDate);
  while (cur <= endDate) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    dateList.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }

  console.log(`Total days to pull temperature: ${dateList.length} days (${dateList[0]} to ${dateList[dateList.length - 1]})`);

  const results = [];

  // Query in chunks to avoid overwhelming rate limits
  for (let i = 0; i < dateList.length; i++) {
    const date = dateList[i];
    try {
      const res = await solisPost("/api/chart/inverter/day", {
        id: INVERTER_ID,
        time: date,
        timeZone: 5,
      });

      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        const temps = res.data
          .map(pt => parseFloat(pt.inverterTemperature))
          .filter(t => !isNaN(t) && t > 0);

        if (temps.length > 0) {
          const minT = Math.min(...temps);
          const maxT = Math.max(...temps);
          const avgT = (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1);
          const peakPoint = res.data.find(pt => parseFloat(pt.inverterTemperature) === maxT);

          results.push({
            date,
            pointsCount: temps.length,
            minTemperatureC: minT,
            maxTemperatureC: maxT,
            avgTemperatureC: parseFloat(avgT),
            peakTime: peakPoint ? peakPoint.time : "N/A"
          });
          console.log(`[${i+1}/${dateList.length}] ${date}: Min=${minT}°C, Max=${maxT}°C, Avg=${avgT}°C (Peak at ${peakPoint?.time})`);
        } else {
          results.push({ date, pointsCount: 0, status: "No positive temperature telemetry logged" });
          console.log(`[${i+1}/${dateList.length}] ${date}: No valid temperature points`);
        }
      } else {
        results.push({ date, pointsCount: 0, status: "Offline / No data" });
        console.log(`[${i+1}/${dateList.length}] ${date}: No telemetry returned`);
      }
    } catch (e) {
      console.error(`Error on ${date}:`, e.message);
    }
  }

  fs.writeFileSync(path.join(__dirname, "chenab_temperature_history.json"), JSON.stringify(results, null, 2), "utf8");
  console.log("\nFinished pulling temperature history! Saved to chenab_temperature_history.json");
}

main().catch(console.error);
