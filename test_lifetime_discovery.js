const crypto = require("crypto");
const https = require("https");
const fs = require("fs");
const path = require("path");

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

// 5 Active Plants to Keep
const ACTIVE_PLANTS = [
  { id: "1298491919450797504", name: "Menu Karachi Office" },
  { id: "1298491919450958553", name: "OPL Residence" },
  { id: "1298491919450873747", name: "36 Chenab" },
  { id: "1298491919450740581", name: "P2G 50KW" },
  { id: "1298491919450840394", name: "P2G 1ST 6kw" },
];

async function run() {
  console.log("Logging into SolisCloud...");
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
    console.error("Login failed:", loginRes.json);
    return;
  }
  console.log("Logged in successfully!\n");

  for (const plant of ACTIVE_PLANTS) {
    console.log(`=== Plant: ${plant.name} (${plant.id}) ===`);
    
    // 1. Station Detail (check createDate, gridDate, first day of operation)
    const detailRes = await postRequest("/api/station/detail", { id: plant.id });
    const detail = detailRes.json?.data || {};
    console.log(`  Create Date:      ${detail.createDate ? new Date(detail.createDate).toISOString() : 'N/A'}`);
    console.log(`  Grid Connect:     ${detail.gridConnectionDate ? new Date(detail.gridConnectionDate).toISOString() : 'N/A'}`);
    console.log(`  Total Generation: ${detail.energy} ${detail.energyUnitStr || 'kWh'}`);
    console.log(`  Month Generation: ${detail.monthEnergy} ${detail.monthEnergyUnitStr || 'kWh'}`);
    console.log(`  Year Generation:  ${detail.yearEnergy} ${detail.yearEnergyUnitStr || 'kWh'}`);

    // 2. Year chart / all-time chart test
    const yearRes = await postRequest("/api/chart/station/year", {
      id: plant.id,
      year: "2026",
      time: "2026",
      timeZone: 5,
      money: "PKR"
    });
    console.log(`  /api/chart/station/year success: ${yearRes.json?.success}, months returned: ${yearRes.json?.data?.length || 0}`);

    const allRes = await postRequest("/api/chart/station/all", {
      id: plant.id,
      timeZone: 5,
      money: "PKR"
    });
    console.log(`  /api/chart/station/all success: ${allRes.json?.success}, years returned: ${allRes.json?.data?.length || 0}`);
    if (allRes.json?.data) {
      console.log(`  All-time years:`, allRes.json.data.map(d => ({ year: d.date || d.time, energy: d.energy })));
    }

    console.log("");
  }
}

run().catch(console.error);
