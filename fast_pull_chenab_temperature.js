/**
 * fast_pull_chenab_temperature.js
 * Pulls all daily temperature data from day one (08/09/2026) to today (24/11/2026)
 * using concurrency pool of 6 requests to finish in ~15-20 seconds.
 */

const https = require("https");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const HMAC_SECRET = "5704383536604a8bb94c83ebc059aa8c";
const KEY_ID = "2424";
const INVERTER_ID = "1308675217950513392";

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

    const req = https.request("https://www.soliscloud.com" + apiPath, { method: "POST", headers, timeout: 25000 }, (res) => {
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

async function run() {
  const passMd5 = crypto.createHash("md5").update("POWER2GO").digest("hex");
  await solisPost("/api/user/login2", {
    userInfo: "Qasim Moosvi",
    passWord: passMd5,
    yingZhenType: 1,
    localTime: Date.now(),
    localTimeZone: 5,
    language: "2",
  });

  // Generate dates from 2026-09-08 to 2026-11-24
  const dateList = [];
  const cur = new Date(2026, 8, 8); // Sept 8
  const end = new Date(2026, 10, 24); // Nov 24
  while (cur <= end) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    dateList.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }

  console.log(`Starting parallel fetch for ${dateList.length} days...`);
  const results = [];
  const CONCURRENCY = 6;

  async function worker(dates) {
    for (const date of dates) {
      try {
        const res = await solisPost("/api/chart/inverter/day", {
          id: INVERTER_ID,
          time: date,
          timeZone: 5,
        });

        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          const validPoints = res.data.filter(pt => pt.inverterTemperature !== undefined && pt.inverterTemperature !== null);
          const temps = validPoints.map(pt => parseFloat(pt.inverterTemperature)).filter(t => !isNaN(t) && t > 0);

          if (temps.length > 0) {
            const minT = Math.min(...temps);
            const maxT = Math.max(...temps);
            const avgT = parseFloat((temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1));
            const peak = validPoints.find(pt => parseFloat(pt.inverterTemperature) === maxT);

            results.push({
              date,
              points: temps.length,
              minTempC: minT,
              maxTempC: maxT,
              avgTempC: avgT,
              peakTime: peak ? peak.time : "--"
            });
          } else {
            results.push({ date, points: 0, minTempC: null, maxTempC: null, avgTempC: null, peakTime: "--" });
          }
        } else {
          results.push({ date, points: 0, minTempC: null, maxTempC: null, avgTempC: null, peakTime: "--" });
        }
      } catch (err) {
        results.push({ date, error: err.message });
      }
    }
  }

  // Split into chunks for workers
  const chunks = Array.from({ length: CONCURRENCY }, () => []);
  dateList.forEach((d, idx) => chunks[idx % CONCURRENCY].push(d));

  await Promise.all(chunks.map(chunk => worker(chunk)));

  // Sort chronologically
  results.sort((a, b) => a.date.localeCompare(b.date));

  fs.writeFileSync(path.join(__dirname, "chenab_temperature_history.json"), JSON.stringify(results, null, 2), "utf8");
  console.log(`Successfully completed! ${results.length} daily records saved to chenab_temperature_history.json`);
}

run().catch(console.error);
