/**
 * Power2Go Deep Cell & Anomaly Forensic Audit - Menu Karachi Office
 */
const https = require("https");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const HMAC_SECRET = "5704383536604a8bb94c83ebc059aa8c";
const KEY_ID = "2424";
const STATION_ID = "1298491919450797504";

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
      "Connection": "close",
      "Content-Length": Buffer.byteLength(bodyStr),
    };

    if (sessionCookie) headers["Cookie"] = sessionCookie;

    const req = https.request(
      "https://www.soliscloud.com" + apiPath,
      { method: "POST", headers, timeout: 20000 },
      (res) => {
        if (res.headers["set-cookie"]) {
          sessionCookie = res.headers["set-cookie"].map((c) => c.split(";")[0]).join("; ");
        }
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try { resolve(JSON.parse(data)); } catch (e) { resolve({ raw: data }); }
        });
      }
    );
    req.on("error", reject);
    req.write(bodyStr);
    req.end();
  });
}

async function runDeepAudit() {
  console.log("=== SolisCloud Deep Forensic Audit (Menu Karachi) ===");
  const passMd5 = crypto.createHash("md5").update("POWER2GO").digest("hex");
  await solisPost("/api/user/login2", {
    userInfo: "Qasim Moosvi",
    passWord: passMd5,
    yingZhenType: 1,
    localTime: Date.now(),
    localTimeZone: 5,
    language: "2",
  });

  const inv1 = await solisPost("/api/inverter/detail", { sn: "1053050258180057" });
  const inv2 = await solisPost("/api/inverter/detail", { sn: "1053050258140015" });
  const alarms = await solisPost("/api/alarm/list", { stationId: STATION_ID, pageNo: 1, pageSize: 20 });

  const result = {
    timestamp: new Date().toISOString(),
    inverter1: inv1.data,
    inverter2: inv2.data,
    alarms: alarms.data?.records || []
  };

  fs.writeFileSync(path.join(__dirname, "menu_karachi_deep_cells.json"), JSON.stringify(result, null, 2), "utf8");
  console.log("Saved full telemetry to menu_karachi_deep_cells.json");
}

runDeepAudit().catch(console.error);
