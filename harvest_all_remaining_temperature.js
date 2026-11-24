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
    const signStr = "POST\n" + contentMd5 + "\napplication/json\n" + date + "\n" + signPath;
    const signature = hmacSha1Base64(HMAC_SECRET, signStr);
    const headers = {
      "Content-Type": "application/json;charset=UTF-8",
      "Content-MD5": contentMd5,
      "Authorization": "WEB " + KEY_ID + ":" + signature,
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

async function harvestAllRemaining() {
  const passMd5 = crypto.createHash("md5").update("POWER2GO").digest("hex");
  await solisPost("/api/user/login2", {
    userInfo: "Qasim Moosvi",
    passWord: passMd5,
    yingZhenType: 1,
    localTime: Date.now(),
    localTimeZone: 5,
    language: "2",
  });
  console.log("Login OK");

  const targets = [
    { key: "towfiq", name: "Towfiq chinoy", invId: "1308675217950425926", start: "2026-11-19" },
    { key: "opl", name: "OPL Residence", invId: "1308675217950440077", start: "2026-10-20" },
    { key: "p2g_50kw", name: "P2G 50KW", invId: "1308675217949880638", start: "2026-08-20" },
    { key: "p2g_6kw", name: "P2G 1ST 6kw", invId: "1308675217950080058", start: "2026-08-13" },
    { key: "p2g_15kw", name: "P2G 15KW", invId: "1308675217949806488", start: "2026-11-18" },
    { key: "p2g_20kw", name: "P2G 20kw", invId: "1308675217950003743", start: "2026-11-18" }
  ];

  for (const t of targets) {
    const parts = t.start.split("-").map(Number);
    const cur = new Date(parts[0], parts[1] - 1, parts[2]);
    const end = new Date(2026, 10, 24);
    const dates = [];
    while (cur <= end) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, "0");
      const d = String(cur.getDate()).padStart(2, "0");
      dates.push(y + "-" + m + "-" + d);
      cur.setDate(cur.getDate() + 1);
    }

    console.log("Pulling " + t.name + " (" + dates.length + " days)...");
    const results = [];
    for (let i = 0; i < dates.length; i++) {
      const d = dates[i];
      try {
        const res = await solisPost("/api/chart/inverter/day", { id: t.invId, time: d, timeZone: 5 });
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          const valid = res.data.filter(pt => pt.inverterTemperature !== undefined && pt.inverterTemperature !== null);
          const temps = valid.map(pt => parseFloat(pt.inverterTemperature)).filter(x => !isNaN(x) && x > 0);
          if (temps.length > 0) {
            const minT = Math.min(...temps);
            const maxT = Math.max(...temps);
            const avgT = parseFloat((temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1));
            const peak = valid.find(pt => parseFloat(pt.inverterTemperature) === maxT);
            results.push({ date: d, points: temps.length, minTempC: minT, maxTempC: maxT, avgTempC: avgT, peakTime: peak ? (peak.time + " PKT") : "--" });
          } else {
            results.push({ date: d, points: 0, minTempC: null, maxTempC: null, avgTempC: null, peakTime: "--" });
          }
        } else {
          results.push({ date: d, points: 0, minTempC: null, maxTempC: null, avgTempC: null, peakTime: "--" });
        }
      } catch (e) {
        results.push({ date: d, points: 0, minTempC: null, maxTempC: null, avgTempC: null, peakTime: "--" });
      }
    }
    const outFile = t.key + "_temperature_history.json";
    fs.writeFileSync(path.join(__dirname, outFile), JSON.stringify(results, null, 2), "utf8");
    console.log("Saved " + outFile + " (" + results.length + " days).");
  }
}
harvestAllRemaining().catch(console.error);
