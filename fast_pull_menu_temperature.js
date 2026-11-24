/**
 * fast_pull_menu_temperature.js
 * Pulls all daily inverter temperature data for Menu Karachi Office:
 * - Inverter 1: Solis S6-EH3P50K-H (SN: 1053050258180057, ID: 1308675217950425937) from 2026-06-16 to 2026-11-24
 * - Inverter 2: Solis S6-EH3P50K-H (SN: 1053050258140015, ID: 1308675217950425397) from 2026-10-07 to 2026-11-24
 */

const https = require("https");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const HMAC_SECRET = "5704383536604a8bb94c83ebc059aa8c";
const KEY_ID = "2424";

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

function generateDateList(startDateStr, endDateStr) {
  const dates = [];
  const parts = startDateStr.split("-").map(Number);
  const endParts = endDateStr.split("-").map(Number);
  const cur = new Date(parts[0], parts[1] - 1, parts[2]);
  const end = new Date(endParts[0], endParts[1] - 1, endParts[2]);
  while (cur <= end) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const d = String(cur.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

async function fetchInverterHistory(invId, invSn, dateList) {
  console.log(`\n>>> Fetching history for Inverter SN ${invSn} (${dateList.length} days)...`);
  const results = [];
  const CONCURRENCY = 8;

  async function worker(dates) {
    for (const date of dates) {
      try {
        const res = await solisPost("/api/chart/inverter/day", {
          id: invId,
          time: date,
          timeZone: 5,
        });

        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          const validPoints = res.data.filter(pt => pt.inverterTemperature !== undefined && pt.inverterTemperature !== null);
          const temps = validPoints.map(pt => parseFloat(pt.inverterTemperature)).filter(t => !isNaN(t) && t > 0);

          if (temps.length > 0) {
            let maxTemp = -999;
            let minTemp = 999;
            let sumTemp = 0;
            let peakTime = "--";

            for (const pt of validPoints) {
              const t = parseFloat(pt.inverterTemperature);
              if (isNaN(t) || t <= 0) continue;
              sumTemp += t;
              if (t > maxTemp) {
                maxTemp = t;
                peakTime = pt.time ? pt.time.slice(0, 5) : "--";
              }
              if (t < minTemp) {
                minTemp = t;
              }
            }

            const avgTemp = sumTemp / temps.length;
            results.push({
              date,
              minTempC: Math.round(minTemp * 10) / 10,
              maxTempC: Math.round(maxTemp * 10) / 10,
              avgTempC: Math.round(avgTemp * 10) / 10,
              peakTime: peakTime + " PKT",
              points: temps.length,
            });
          } else {
            results.push({
              date,
              minTempC: null,
              maxTempC: null,
              avgTempC: null,
              peakTime: "--",
              points: 0,
            });
          }
        } else {
          results.push({
            date,
            minTempC: null,
            maxTempC: null,
            avgTempC: null,
            peakTime: "--",
            points: 0,
          });
        }
      } catch (err) {
        console.error(`Error fetching ${invSn} for ${date}:`, err.message);
        results.push({
          date,
          minTempC: null,
          maxTempC: null,
          avgTempC: null,
          peakTime: "--",
          points: 0,
        });
      }
    }
  }

  // Split dates across concurrency buckets
  const buckets = Array.from({ length: CONCURRENCY }, () => []);
  dateList.forEach((d, i) => buckets[i % CONCURRENCY].push(d));
  await Promise.all(buckets.map(b => worker(b)));

  results.sort((a, b) => a.date.localeCompare(b.date));
  return results;
}

async function main() {
  const passMd5 = crypto.createHash("md5").update("POWER2GO").digest("hex");
  const loginRes = await solisPost("/api/user/login2", {
    userInfo: "Qasim Moosvi",
    passWord: passMd5,
    yingZhenType: 1,
    localTime: Date.now(),
    localTimeZone: 5,
    language: "2",
  });
  console.log("SolisCloud Login:", loginRes.code === "0" || loginRes.code === 0 ? "SUCCESS" : loginRes.msg);

  const datesInv1 = generateDateList("2026-06-16", "2026-11-24");
  const historyInv1 = await fetchInverterHistory("1308675217950425937", "1053050258180057", datesInv1);

  const datesInv2 = generateDateList("2026-10-07", "2026-11-24");
  const historyInv2 = await fetchInverterHistory("1308675217950425397", "1053050258140015", datesInv2);

  // Combine Fleet Plant Level (Max, Min, Avg across inverters for each date)
  const allDates = generateDateList("2026-06-16", "2026-11-24");
  const mapInv1 = new Map(historyInv1.map(d => [d.date, d]));
  const mapInv2 = new Map(historyInv2.map(d => [d.date, d]));

  const plantHistory = allDates.map(date => {
    const r1 = mapInv1.get(date);
    const r2 = mapInv2.get(date);

    const validEntries = [r1, r2].filter(r => r && r.maxTempC !== null);
    if (validEntries.length === 0) {
      return {
        date,
        minTempC: null,
        maxTempC: null,
        avgTempC: null,
        peakTime: "--",
        points: 0,
      };
    }

    const maxTempC = Math.max(...validEntries.map(e => e.maxTempC));
    const minTempC = Math.min(...validEntries.map(e => e.minTempC));
    const avgTempC = Math.round((validEntries.reduce((s, e) => s + e.avgTempC, 0) / validEntries.length) * 10) / 10;
    const peakEntry = validEntries.find(e => e.maxTempC === maxTempC);

    return {
      date,
      minTempC,
      maxTempC,
      avgTempC,
      peakTime: peakEntry ? peakEntry.peakTime : "--",
      points: validEntries.reduce((s, e) => s + e.points, 0),
    };
  });

  const payload = {
    plantName: "Menu Karachi Office",
    plantId: "1298491919450797504",
    location: "Karachi, Pakistan",
    capacity: "80.0 kWp",
    totalDays: plantHistory.length,
    startDate: "2026-06-16",
    endDate: "2026-11-24",
    inverter1: {
      sn: "1053050258180057",
      model: "Solis S6-EH3P50K-H (50 kW)",
      history: historyInv1
    },
    inverter2: {
      sn: "1053050258140015",
      model: "Solis S6-EH3P50K-H (50 kW)",
      history: historyInv2
    },
    plantHistory
  };

  fs.writeFileSync("menu_karachi_temperature_history.json", JSON.stringify(payload, null, 2));
  console.log("\n✅ Saved complete temperature history to menu_karachi_temperature_history.json!");
  console.log(`Total Days: ${plantHistory.length} (Active: ${plantHistory.filter(p => p.points > 0).length})`);
}

main().catch(console.error);
