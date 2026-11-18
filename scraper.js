const crypto = require("crypto");
const https = require("https");
const express = require("express");
const basicAuth = require("express-basic-auth");
const PropertiesReader = require("properties-reader");

const properties = PropertiesReader("scraper.properties");
const app = express();
const port = properties.get("service.port");

app.use(basicAuth({ authorizer: propertyAuthoriser }));

function propertyAuthoriser(username, password) {
  const userMatches = basicAuth.safeCompare(username, properties.get("service.username"));
  const passMatches = basicAuth.safeCompare(password, properties.get("service.password"));
  return userMatches & passMatches;
}

const solisUser = properties.get("solis.username");
const solisPass = properties.get("solis.password");
const INVERTER_SN = properties.get("solis.inverterSn") || "1031052248080003";

// Solis Cloud API auth constants (reverse-engineered from frontend JS)
const SOLIS_API_BASE = "https://www.soliscloud.com";
const SOLIS_HMAC_SECRET = "5704383536604a8bb94c83ebc059aa8c";
const SOLIS_KEY_ID = "2424";

// HTTP robustness
const HTTP_TIMEOUT_MS = 15000;
const RETRY_BACKOFF_MS = 2000;

// Session state
let sessionCookie = null;
let stationId = null;

let data = {
  batterySoc: null,
  distributor: null,
  station: null,
  detailMix: null,
  inverterDetail: null,
  error: null,
  lastUpdate: null,
};

// --- Helpers ---

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Solis Cloud API helpers ---

function md5Base64(str) {
  return crypto.createHash("md5").update(str, "utf8").digest("base64");
}

function hmacSha1Base64(key, data) {
  return crypto.createHmac("sha1", key).update(data, "utf8").digest("base64");
}

function buildAuthHeaders(path, body) {
  const date = new Date().toUTCString();
  const bodyStr = JSON.stringify(body);
  const contentMd5 = md5Base64(bodyStr);
  // Solis signs with path WITHOUT /api prefix
  const signPath = path.replace(/^\/api/, "");
  const signStr = "POST\n" + contentMd5 + "\napplication/json\n" + date + "\n" + signPath;
  const signature = hmacSha1Base64(SOLIS_HMAC_SECRET, signStr);
  return {
    "Content-Type": "application/json;charset=UTF-8",
    "Content-MD5": contentMd5,
    "Authorization": "WEB " + SOLIS_KEY_ID + ":" + signature,
    "Time": date,
    "Accept": "application/json, text/plain, */*",
    "Language": "2",
    "X-Cloud-Platform": "GLY",
    "Version": "5.3.001",
    "Platform": "Web",
  };
}

function httpJson(path, bodyStr, headers) {
  return new Promise((resolve, reject) => {
    const url = new URL(SOLIS_API_BASE + path);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: path,
      method: "POST",
      headers: {
        ...headers,
        "Content-Length": Buffer.byteLength(bodyStr),
      },
    };

    const req = https.request(options, (res) => {
      let raw = "";
      res.on("data", (chunk) => (raw += chunk));
      res.on("end", () => {
        let json = null;
        try {
          json = JSON.parse(raw);
        } catch (e) {
          // leave json null; caller handles unexpected bodies
        }
        resolve({ status: res.statusCode, json, headers: res.headers });
      });
    });

    req.setTimeout(HTTP_TIMEOUT_MS, () => {
      req.destroy(new Error("timeout after " + HTTP_TIMEOUT_MS + "ms"));
    });
    req.on("error", reject);
    req.write(bodyStr);
    req.end();
  });
}

function captureCookie(setCookie) {
  if (!setCookie) return;
  const tokenCookie = setCookie.find((c) => c.startsWith("token="));
  if (tokenCookie) {
    sessionCookie = tokenCookie.split(";")[0];
  }
  const acwCookie = setCookie.find((c) => c.startsWith("acw_tc="));
  if (acwCookie) {
    const acwPart = acwCookie.split(";")[0];
    if (sessionCookie) {
      sessionCookie += "; " + acwPart;
    }
  }
}

function isSessionError(resp) {
  if (resp.status === 401 || resp.status === 403) return true;
  const j = resp.json;
  if (j && j.success === false) {
    const msg = String(j.msg || j.message || "").toLowerCase();
    return /login|log in|session|expire|token|未登录|登录|过期/.test(msg);
  }
  return false;
}

function solisPost(path, body) {
  const bodyStr = JSON.stringify(body);
  const headers = buildAuthHeaders(path, body);
  if (sessionCookie) {
    headers["Cookie"] = sessionCookie;
  }

  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      httpJson(path, bodyStr, headers)
        .then((resp) => {
          captureCookie(resp.headers["set-cookie"]);
          if (resp.status === 429 && n > 0) {
            const ra = Number(resp.headers["retry-after"]) || 3000;
            console.log("429 on " + path + ", waiting " + ra + "ms");
            sleep(ra).then(() => attempt(n - 1));
            return;
          }
          if (resp.status >= 500 && n > 0) {
            const delay = RETRY_BACKOFF_MS * Math.pow(2, 2 - n);
            console.log("HTTP " + resp.status + " on " + path + ", retry in " + delay + "ms");
            sleep(delay).then(() => attempt(n - 1));
            return;
          }
          resolve(resp);
        })
        .catch((e) => {
          if (n > 0) {
            const delay = RETRY_BACKOFF_MS * Math.pow(2, 2 - n);
            console.log("Network error on " + path + " (" + e.message + "), retry in " + delay + "ms");
            sleep(delay).then(() => attempt(n - 1));
            return;
          }
          reject(e);
        });
    };
    attempt(2);
  });
}

async function login() {
  const passMd5 = crypto.createHash("md5").update(solisPass, "utf8").digest("hex");
  const body = {
    userInfo: solisUser,
    passWord: passMd5,
    yingZhenType: 1,
    localTime: Date.now(),
    localTimeZone: 2,
    language: "2",
  };

  const result = await solisPost("/api/user/login2", body);
  if (!result.json || !result.json.success) {
    throw new Error("Login failed: " + (result.json && result.json.msg) || "HTTP " + result.status);
  }
  console.log("Login OK - user:", result.json.data.email);
  return result.json;
}

async function ensureSession() {
  if (!sessionCookie) {
    await login();
  }
}

async function callData(path, body) {
  let resp = await solisPost(path, body);
  if (isSessionError(resp)) {
    console.log("Session invalid, relogging...");
    sessionCookie = null;
    await login();
    resp = await solisPost(path, body);
  }
  const j = resp.json;
  if (!j || j.success === false) {
    throw new Error(path + " failed: " + ((j && j.msg) || ("HTTP " + resp.status)));
  }
  return j;
}

async function fetchDistributorDetail() {
  const body = {
    localTime: Date.now(),
    localTimeZone: 2,
    language: "2",
  };
  return (await callData("/api/distributor/detail", body)).data;
}

async function fetchStationList() {
  const body = {
    pageNo: 1,
    pageSize: 10,
    states: "0",
    stationType: "1",
    selectAreaValue: [],
    dataNumber: 0,
    localTime: Date.now(),
    localTimeZone: 2,
    language: "2",
  };
  return (await callData("/api/station/list", body)).data;
}

async function fetchDetailMix(id) {
  const body = {
    id: id,
    localTime: Date.now(),
    localTimeZone: 2,
    language: "2",
  };
  return (await callData("/api/station/detailMix", body)).data;
}

async function fetchInverterDetail() {
  const body = { sn: INVERTER_SN };
  return (await callData("/api/inverter/detail", body)).data;
}

async function scrapeData() {
  const startTime = Date.now();
  try {
    // Step 1: Ensure session (login only when no session or after it dies)
    await ensureSession();

    // Step 2: Fetch distributor detail
    const distributor = await fetchDistributorDetail();
    data.distributor = distributor;

    // Step 3: Fetch station list
    const stationData = await fetchStationList();
    const records = stationData?.page?.records;
    if (records && records.length > 0) {
      data.station = records[0];
      if (!stationId) {
        stationId = records[0].id;
        console.log("Discovered station ID:", stationId);
      }
    }

    // Step 4: Fetch detail mix (battery SoC + real-time data)
    if (stationId) {
      const detailMix = await fetchDetailMix(stationId);
      data.detailMix = detailMix;
      if (detailMix.batteryPercent !== undefined) {
        data.batterySoc = detailMix.batteryPercent;
      }
    }

    // Step 5: Fetch inverter detail (instantaneous grid power + flow map)
    // Non-fatal: if this fails the rest of the data is still served
    try {
      data.inverterDetail = await fetchInverterDetail();
    } catch (e) {
      console.log("inverter/detail error (non-fatal):", e.message);
      data.inverterDetail = null;
    }

    data.error = null;
    const endTime = Date.now();
    data.lastUpdate = new Date().toISOString();

    console.log(
      "Scrape OK - distributor:", data.distributor ? "yes" : "no",
      "station:", data.station ? "yes" : "no",
      "detailMix:", data.detailMix ? "yes" : "no",
      "batterySoc:", data.batterySoc,
      "duration:", (endTime - startTime) + "ms"
    );
  } catch (e) {
    console.log("Error:", e.message);
    data.error = e.message;
    data.lastUpdate = new Date().toISOString();
  }
}

function buildV2Data() {
  const d = data.distributor || {};
  const s = data.station || {};
  const m = data.detailMix || {};
  const inv = data.inverterDetail || null;
  const flow = inv?.industryCurrentFlowMapV2 || {};
  const gridDirection = !inv
    ? null
    : flow.gridToLoad
      ? "import"
      : flow.pvToGrid || flow.batteryToGrid
        ? "export"
        : "none";
  return {
    batterySoc: data.batterySoc,
    currentYield: d.power || 0,
    currentYieldUnit: d.powerStr || "kW",
    // Real-time values from detailMix
    currentBatteryPower: m.batteryPower || null,
    currentBatteryPowerUnit: m.batteryPowerStr || "kW",
    batteryDirection: m.batteryDirection || null,
    batteryVoltage: m.storageBatteryVoltage || null,
    batteryCapacity: m.inverterBatteryCapacity || null,
    batteryCapacityUnit: m.inverterBatteryCapacityStr || "kWh",
    currentGridPower: inv?.gridDetailVo?.gridPower ?? m.gridPower ?? null,
    currentGridPowerUnit: "kW",
    gridDirection: gridDirection,
    currentHouseConsumption: m.familyLoadPower || null,
    currentHouseConsumptionUnit: m.familyLoadPowerStr || "kW",
    currentSolarPower: m.power || m.doubleAmmeterStoragePower || null,
    currentSolarPowerUnit: m.powerStr || "kW",
    todayYield: s.dayEnergy || d.energyToday || m.dayEnergyStorage || 0,
    todayYieldUnit: s.dayEnergyStr || d.energyTodayStr || "kWh",
    todaysCharging: d.batteryChargeTodayEnergy || m.batteryChargeEnergy || 0,
    todaysChargingUnit: d.batteryChargeTodayEnergyStr || m.batteryChargeEnergyStr || "kWh",
    todaysDischarging: d.batteryDischargeTodayEnergy || m.batteryDischargeEnergy || 0,
    todaysDischargingUnit: d.batteryDischargeTodayEnergyStr || m.batteryDischargeEnergyStr || "kWh",
    todayGridImport: d.gridPurchasedTodayEnergy || 0,
    todayGridImportUnit: d.gridPurchasedTodayEnergyStr || "kWh",
    todayGridExport: d.gridSellTodayEnergy || 0,
    todayGridExportUnit: d.gridSellTodayEnergyStr || "kWh",
    todayHouseConsumption: d.homeLoadTodayEnergy || 0,
    todayHouseConsumptionUnit: d.homeLoadTodayEnergyStr || "kWh",
    stationCapacity: d.capacity || s.capacity || 0,
    stationCapacityUnit: d.capacityStr || s.capacityStr || "kWp",
    batteryChargeTodayEnergy: d.batteryChargeTodayEnergy || m.batteryChargeEnergy || 0,
    batteryDischargeTodayEnergy: d.batteryDischargeTodayEnergy || m.batteryDischargeEnergy || 0,
    gridPurchasedTodayEnergy: d.gridPurchasedTodayEnergy || 0,
    gridSellTodayEnergy: d.gridSellTodayEnergy || 0,
    homeLoadTodayEnergy: d.homeLoadTodayEnergy || 0,
    monthEnergy: d.monthEnergy || s.monthEnergy || 0,
    monthEnergyStr: d.monthEnergyStr || s.monthEnergyStr || "kWh",
    yearEnergy: d.yearEnergy || s.yearEnergy || 0,
    yearEnergyStr: d.yearEnergyStr || s.yearEnergyStr || "MWh",
    totalEnergy: d.energyTotal || s.allEnergy || 0,
    totalEnergyStr: d.energyTotalStr || s.allEnergyStr || "MWh",
    incomeToday: d.incomeToday || 0,
    incomeTodayStr: d.incomeTodayStr || "EUR",
    incomeMonth: d.incomeMonth || 0,
    incomeMonthStr: d.incomeMonthStr || "EUR",
    incomeTotal: d.incomeTotal || 0,
    incomeTotalStr: d.incomeTotalStr || "EUR",
    stationName: s.stationName || null,
    inverterOnline: s.inverterOnlineCount || 0,
    inverterCount: s.inverterCount || 0,
    state: s.state || null,
    dataTimestamp: s.dataTimestampStr || null,
    error: data.error,
    lastUpdate: data.lastUpdate,
    batteryChargeTotal: d.batteryChargeTotalEnergy || m.batteryChargeTotalEnergy || 0,
    batteryChargeTotalUnit: d.batteryChargeTotalEnergyStr || m.batteryChargeTotalEnergyStr || "kWh",
    batteryDischargeTotal: d.batteryDischargeTotalEnergy || m.batteryDischargeTotalEnergy || 0,
    batteryDischargeTotalUnit: d.batteryDischargeTotalEnergyStr || m.batteryDischargeTotalEnergyStr || "kWh",
    solarTotalEnergy: (d.energyTotal || 0) * 1000,
    solarTotalEnergyUnit: "kWh",
  };
}

app.get("/data", (req, res) => res.send(data));
app.get("/v1/data", (req, res) => res.send(data));
app.get("/v2/data", (req, res) => res.send(buildV2Data()));
app.get("/refresh", (req, res) => {
  scrapeData();
  res.send("ok");
});

const REFRESH_INTERVAL_MS = 360000; // 6 minutes

app.listen(port, () => {
  console.log("Solis Cloud API scraper (no browser) listening on port " + port);
  scrapeData();
  setInterval(() => {
    console.log("Auto-refreshing data...");
    scrapeData();
  }, REFRESH_INTERVAL_MS);
});
