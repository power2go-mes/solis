/**
 * SolisCloud Comprehensive Telemetry Collector — One-Time Read-Only Evaluation
 *
 * Strictly single-shot execution:
 * - No background service or setInterval
 * - No listening HTTP server or open ports
 * - Zero external npm dependencies for core scraping (Node.js core crypto, https, fs, path)
 * - Queries SolisCloud Station detailMix, Inverter detail, Distributor stats,
 *   BMS battery records (/api/battery/list), and full Alarm/Fault Event Logs (/api/alarm/list)
 * - Collects ALL available battery, solar, grid, load, inverter, alarm logs, and BMS/BMU diagnostics
 * - Saves telemetry, BMS cell diagnostics & historical alarm event logs to Supabase PostgreSQL
 * - Outputs a clean structured report and saves full payloads to JSON
 * - Sanitizes credentials; passwords and session cookies are never exposed
 */

const crypto = require("crypto");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { saveTelemetryToSupabase } = require("./supabase");
const { decodeBmsRegisters } = require("./bms_decoder");

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
const targetStationId = process.env.SOLIS_STATION_ID || localEnv.SOLIS_STATION_ID;
const targetInverterSn = process.env.SOLIS_INVERTER_SN || localEnv.SOLIS_INVERTER_SN;
const supabaseDbUrl = process.env.SUPABASE_DB_URL || localEnv.SUPABASE_DB_URL;

if (!solisUser || !solisPass) {
  console.error("=================================================================");
  console.error("ERROR: SolisCloud credentials not provided.");
  console.error("Please configure SOLIS_USERNAME and SOLIS_PASSWORD in .env.test");
  console.error("or pass them as environment variables.");
  console.error("=================================================================");
  process.exit(1);
}

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

function buildAuthHeaders(apiPath, body) {
  const date = new Date().toUTCString();
  const bodyStr = JSON.stringify(body);
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
  return headers;
}

function postRequest(apiPath, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const headers = buildAuthHeaders(apiPath, body);
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
          if (tokenCookie) {
            sessionCookie = tokenCookie.split(";")[0];
          }
          const acwCookie = setCookie.find((c) => c.startsWith("acw_tc="));
          if (acwCookie) {
            const acwPart = acwCookie.split(";")[0];
            sessionCookie = sessionCookie ? `${sessionCookie}; ${acwPart}` : acwPart;
          }
        }

        try {
          const json = JSON.parse(raw);
          resolve({ status: res.statusCode, json });
        } catch (e) {
          resolve({ status: res.statusCode, rawText: raw.slice(0, 200) });
        }
      });
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy(new Error("Request timed out after 15s"));
    });

    req.write(bodyStr);
    req.end();
  });
}

function fmtVal(val, unit = "") {
  if (val === undefined || val === null || val === "") return "Not Available";
  return unit ? `${val} ${unit}` : `${val}`;
}

async function runOneTimeEvaluation() {
  console.log("=================================================================");
  console.log("     SOLISCLOUD COMPREHENSIVE ONE-TIME TELEMETRY COLLECTOR");
  console.log("=================================================================");
  console.log("Target Host:      https://www.soliscloud.com");
  console.log(`User Identity:    ${solisUser.replace(/(.{3})(.*)(@.*)/, "$1***$3")}`);
  console.log("Listening Server: NONE (Direct single-shot client query)");
  console.log("Background Task:  NONE (Exits immediately after response)");
  console.log("=================================================================\n");

  // Step 1: Login
  console.log("[1/5] Authenticating to SolisCloud (/api/user/login2)...");
  const passMd5 = crypto.createHash("md5").update(solisPass, "utf8").digest("hex");
  const loginBody = {
    userInfo: solisUser,
    passWord: passMd5,
    yingZhenType: 1,
    localTime: Date.now(),
    localTimeZone: 5,
    language: "2",
  };

  const loginRes = await postRequest("/api/user/login2", loginBody);
  if (!loginRes.json || !loginRes.json.success) {
    const msg = loginRes.json ? loginRes.json.msg : `HTTP ${loginRes.status}`;
    console.error(`[FAIL] Login failed: ${msg}`);
    process.exit(1);
  }
  console.log("[OK] Authentication successful! Session cookie acquired.");

  // Step 2: Determine Station ID
  let activeStationId = targetStationId;
  if (!activeStationId) {
    console.log("\n[2/5] No SOLIS_STATION_ID specified. Querying /api/station/list...");
    const stationListRes = await postRequest("/api/station/list", {
      pageNo: 1,
      pageSize: 5,
      states: "0",
      stationType: "1",
      selectAreaValue: [],
      dataNumber: 0,
      localTime: Date.now(),
      localTimeZone: 5,
      language: "2",
    });

    const records = stationListRes.json?.data?.page?.records || [];
    if (records.length === 0) {
      console.warn("[WARN] No plants found for this account.");
      process.exit(0);
    }
    activeStationId = records[0].id;
    console.log(`[OK] Selected plant: '${records[0].stationName}' (ID: ${activeStationId})`);
  } else {
    console.log(`\n[2/5] Using specified plant ID: '${activeStationId}'`);
  }

  // Step 3: Fetch Station detailMix
  console.log("\n[3/5] Querying /api/station/detailMix & station metadata...");
  const detailRes = await postRequest("/api/station/detailMix", {
    id: activeStationId,
    localTime: Date.now(),
    localTimeZone: 5,
    language: "2",
  });

  if (!detailRes.json || !detailRes.json.success) {
    const msg = detailRes.json ? detailRes.json.msg : `HTTP ${detailRes.status}`;
    console.error(`[FAIL] detailMix query failed: ${msg}`);
    process.exit(1);
  }
  const mix = detailRes.json.data || {};

  // Step 4: Fetch Inverter detail, Alarms, BMS entities, 5-Min Power Curve & Distributor stats in parallel
  const inverterSn = targetInverterSn || mix.batteryJump?.inverterSn || "1053050258110159";
  const tzOffsetMs = 5 * 60 * 60 * 1000;
  const localNow = new Date(Date.now() + tzOffsetMs);
  const todayDate = localNow.toISOString().slice(0, 10);

  console.log(`\n[4/5] Fetching Inverter '${inverterSn}', BMS records, Alarm Logs & 5-Min Power Curve (/api/chart/station/day/v2)...`);

  const [invRes, distRes, stationDetailRes, alarmRes, batteryListRes, dayCurveRes] = await Promise.all([
    postRequest("/api/inverter/detail", { sn: inverterSn }).catch(() => ({})),
    postRequest("/api/distributor/detail", {
      localTime: Date.now(),
      localTimeZone: 5,
      language: "2",
    }).catch(() => ({})),
    postRequest("/api/station/detail", {
      id: activeStationId,
      localTime: Date.now(),
      localTimeZone: 5,
      language: "2",
    }).catch(() => ({})),
    postRequest("/api/alarm/list", {
      pageNo: 1,
      pageSize: 50,
      stationId: activeStationId,
      state: "",
    }).catch(() => ({})),
    postRequest("/api/battery/list", {
      stationId: activeStationId,
      pageNo: 1,
      pageSize: 10,
    }).catch(() => ({})),
    postRequest("/api/chart/station/day/v2", {
      id: activeStationId,
      time: todayDate,
      timeZone: 5,
      money: "PKR",
    }).catch(() => ({})),
  ]);

  const inv = invRes.json?.data || {};
  const dist = distRes.json?.data || {};
  const sDetail = stationDetailRes.json?.data || {};
  const alarmData = alarmRes.json?.data || {};
  const alarmRecords = alarmData.records || [];
  const bList = batteryListRes.json?.data?.page?.records || [];
  const dayCurve = dayCurveRes.json?.data || {};
  const primaryBattery = bList[0] || {};
  const batteryObj = (inv.batteryList && inv.batteryList[0]) || {};
  const gridVo = inv.gridDetailVo || {};
  const flowV2 = mix.industryCurrentFlowMapV2 || {};

  // Power flow determination
  let gridDirectionStr = "Idle";
  const gridPowerKw = gridVo.gridPower !== undefined ? gridVo.gridPower : mix.gridPower;
  if (flowV2.pvToGrid || flowV2.batteryToGrid) {
    gridDirectionStr = "Exporting / Selling to Grid";
  } else if (flowV2.gridToLoad) {
    gridDirectionStr = "Importing from Grid";
  } else if (gridPowerKw > 0) {
    gridDirectionStr = "Active";
  }

  const batteryDirStr =
    mix.batteryDirection === 1
      ? "Charging (+)"
      : mix.batteryDirection === 2
      ? "Discharging (-)"
      : "Idle";

  // Build Comprehensive Report
  console.log("\n=================================================================");
  console.log("            SOLISCLOUD COMPLETE SYSTEM TELEMETRY REPORT");
  console.log("=================================================================");

  console.log("\n--- [1] STATION & HARDWARE METADATA ---");
  console.log(`  Plant Name:                 ${sDetail.stationName || mix.stationName || "Unknown"}`);
  console.log(`  Plant ID:                   ${activeStationId}`);
  console.log(`  Location:                   ${fmtVal(sDetail.cityStr || mix.cityStr)}, ${fmtVal(sDetail.countryStr || mix.countryStr)}`);
  console.log(`  Installed DC Capacity:      ${fmtVal(sDetail.capacity || mix.capacity, sDetail.capacityStr || mix.capacityStr || "kWp")}`);
  console.log(`  Inverter Model:             ${fmtVal(inv.model || mix.model)}`);
  console.log(`  Inverter Serial:            ${fmtVal(inv.sn || inverterSn)}`);
  console.log(`  Datalogger / Collector SN:  ${fmtVal(inv.collectorsn || mix.collectorSn)}`);
  console.log(`  Data Timestamp:             ${fmtVal(mix.dataTimestampStr || inv.timeStr)}`);

  console.log("\n--- [2] BATTERY SYSTEM OVERVIEW ---");
  console.log(`  State of Charge (SOC):      ${fmtVal(primaryBattery.soc ?? batteryObj.batteryCapacitySoc ?? mix.batteryPercent, "%")}`);
  console.log(`  State of Health (SOH):      ${fmtVal(batteryObj.batteryHealthSoh, "%")}`);
  console.log(`  Battery Power:              ${fmtVal(mix.batteryPower, mix.batteryPowerStr || "kW")} [${batteryDirStr}]`);
  console.log(`  Battery Voltage:            ${fmtVal(primaryBattery.voltage ?? batteryObj.batteryVoltage ?? mix.storageBatteryVoltage, "V")}`);
  console.log(`  Battery Current:            ${fmtVal(primaryBattery.current ?? batteryObj.bstteryCurrent ?? mix.storageBatteryCurrent, "A")}`);
  console.log(`  Rated Energy Capacity:      ${fmtVal(primaryBattery.capacity, "kWh")}`);
  console.log(`  Today's Charge Energy:      ${fmtVal(primaryBattery.dayChargeEnergy ?? mix.batteryChargeEnergy, "kWh")}`);
  console.log(`  Today's Discharge Energy:   ${fmtVal(primaryBattery.dayDischargeEnergy ?? mix.batteryDischargeEnergy, "kWh")}`);
  console.log(`  This Month's Charge Energy: ${fmtVal(mix.batteryChargeMonthEnergy ?? inv.batteryMonthChargeEnergy, "kWh")}`);
  console.log(`  This Month's Discharge:     ${fmtVal(mix.batteryDischargeMonthEnergy ?? inv.batteryMonthDischargeEnergy, "kWh")}`);
  console.log(`  Lifetime Battery Charge:    ${fmtVal(mix.batteryChargeTotalEnergy ?? inv.batteryTotalChargeEnergy, mix.batteryChargeTotalEnergyStr || "MWh")}`);
  console.log(`  Lifetime Battery Discharge: ${fmtVal(mix.batteryDischargeTotalEnergy ?? inv.batteryTotalDischargeEnergy, mix.batteryDischargeTotalEnergyStr || "MWh")}`);

  console.log("\n--- [3] SOLAR PV GENERATION & STRINGS ---");
  console.log(`  Total Solar Active Power:   ${fmtVal(mix.pvAndAcCoupledPower || inv.power || mix.power, "kW")}`);
  for (let i = 1; i <= 4; i++) {
    const u = inv[`uPv${i}`];
    const curr = inv[`iPv${i}`];
    const p = inv[`pow${i}`];
    if (u !== undefined || curr !== undefined || p !== undefined) {
      console.log(`  PV String ${i}:                 ${fmtVal(u, "V")}, ${fmtVal(curr, "A")}, ${fmtVal(p, "W")}`);
    }
  }
  console.log(`  Today's Solar Yield:        ${fmtVal(mix.dayEnergyStorage ?? inv.eToday ?? mix.dayEnergy, "kWh")}`);
  console.log(`  This Month's Solar Yield:   ${fmtVal(inv.eMonth ?? mix.monthEnergy, inv.eMonthStr || mix.monthEnergyStr || "MWh")}`);
  console.log(`  Lifetime Solar Yield:       ${fmtVal(inv.eTotal ?? mix.allEnergy, inv.eTotalStr || mix.allEnergyStr || "MWh")}`);

  console.log("\n--- [4] 3-PHASE GRID TELEMETRY & ENERGY ---");
  console.log(`  Grid Status / Direction:    ${gridDirectionStr}`);
  console.log(`  Grid Active Power:          ${fmtVal(gridVo.gridPower ?? mix.gridPower, "kW")}`);
  console.log(`  Grid Frequency:             ${fmtVal(gridVo.gridFac ?? inv.fac, "Hz")}`);
  console.log(`  Grid Power Factor:          ${fmtVal(gridVo.gridPowerFactor)}`);
  console.log(`  Grid Reactive Power:        ${fmtVal(gridVo.gridReactivePower, gridVo.gridReactivePowerStr || "kVar")}`);
  console.log(`  Grid Apparent Power:        ${fmtVal(gridVo.gridLookedPower, gridVo.gridLookedPowerStr || "kVA")}`);
  console.log(`  Phase A (L1):               Voltage: ${fmtVal(gridVo.gridVoltageA, "V")}, Current: ${fmtVal(gridVo.gridCurrentA, "A")}, Power: ${fmtVal(gridVo.gridPowerA !== undefined ? (gridVo.gridPowerA / 1000).toFixed(3) : undefined, "kW")}`);
  console.log(`  Phase B (L2):               Voltage: ${fmtVal(gridVo.gridVoltageB, "V")}, Current: ${fmtVal(gridVo.gridCurrentB, "A")}, Power: ${fmtVal(gridVo.gridPowerB !== undefined ? (gridVo.gridPowerB / 1000).toFixed(3) : undefined, "kW")}`);
  console.log(`  Phase C (L3):               Voltage: ${fmtVal(gridVo.gridVoltageC, "V")}, Current: ${fmtVal(gridVo.gridCurrentC, "A")}, Power: ${fmtVal(gridVo.gridPowerC !== undefined ? (gridVo.gridPowerC / 1000).toFixed(3) : undefined, "kW")}`);
  console.log(`  Today's Grid Purchased:     ${fmtVal(mix.gridPurchasedEnergy ?? mix.gridPurchasedTodayEnergy, "kWh")}`);
  console.log(`  Today's Grid Sold / Export: ${fmtVal(mix.gridSellEnergy ?? mix.gridSellTodayEnergy, "kWh")}`);
  console.log(`  Lifetime Grid Purchased:    ${fmtVal(mix.gridPurchasedTotalEnergy, mix.gridPurchasedTotalEnergyStr || "kWh")}`);
  console.log(`  Lifetime Grid Sold / Export:${fmtVal(mix.gridSellTotalEnergy, mix.gridSellTotalEnergyStr || "MWh")}`);

  console.log("\n--- [5] HOUSE / FACILITY LOAD ---");
  console.log(`  Total Facility Load Power:  ${fmtVal(mix.totalLoadPower || mix.bypassLoadPower, mix.totalLoadPowerStr || "kW")}`);
  console.log(`  Bypass / Backup Load Power: ${fmtVal(mix.bypassLoadPower, mix.bypassLoadPowerStr || "kW")}`);
  console.log(`  Today's Load Consumption:   ${fmtVal(mix.homeLoadTodayEnergy ?? mix.homeLoadEnergy, "kWh")}`);
  console.log(`  This Month's Consumption:   ${fmtVal(mix.homeLoadMonthEnergy, mix.homeLoadMonthEnergyStr || "MWh")}`);
  console.log(`  Lifetime Consumption:       ${fmtVal(mix.homeLoadTotalEnergy, mix.homeLoadTotalEnergyStr || "MWh")}`);

  console.log("\n--- [6] INVERTER DIAGNOSTICS & HEALTH ---");
  console.log(`  Inverter Temperature:       ${fmtVal(inv.inverterTemperature, inv.inverterTemperatureUnit || "℃")}`);
  console.log(`  Inverter DC Bus Voltage:    ${fmtVal(inv.dcBus, inv.dcBusStr || "V")}`);
  console.log(`  Inverter PAC Output:        ${fmtVal(inv.pac, inv.pacStr || "kW")}`);
  console.log(`  Inverter State:             ${inv.state === 1 || inv.state === 0 ? "Normal / Operating" : fmtVal(inv.state)}`);
  console.log(`  Inverter Alarm State:       ${inv.alarmState === 0 ? "Normal (No Alarms)" : fmtVal(inv.alarmState)}`);

  console.log("\n--- [7] ENVIRONMENTAL & SAVINGS ---");
  console.log(`  Avoided CO2:                ${fmtVal(dist.powerStationAvoidedCo2 || mix.avoidedCo2, dist.powerStationAvoidedCo2Unit || "t")}`);
  console.log(`  Trees Planted Equivalent:   ${fmtVal(dist.powerStationNumTree || mix.plantTree, dist.powerStationNumTreeUnit || "trees")}`);
  console.log(`  Coal Saved (TCE):           ${fmtVal(dist.powerStationAvoidedTce, dist.powerStationAvoidedTceUnit || "t")}`);
  console.log(`  Currency Unit:              ${fmtVal(sDetail.money || mix.money || "PKR")}`);

  console.log("\n--- [8] ALARM, FAULT & SYSTEM EVENT LOGS ---");
  console.log(`  Total Alarm Records Found:  ${alarmRecords.length}`);
  if (alarmRecords.length === 0) {
    console.log("  No active or historical alarms reported by SolisCloud.");
  } else {
    alarmRecords.forEach((al, idx) => {
      const stateStr = al.state === "2" ? "Recovered / Resolved" : al.state === "1" ? "ACTIVE / UNRESOLVED" : `State ${al.state}`;
      console.log(`  [#${idx + 1}] Code: ${al.alarmCode} | Message: ${al.alarmMsg} | Level: ${al.alarmLevel}`);
      console.log(`       Start:    ${al.alarmBeginTimeStr || "N/A"}`);
      console.log(`       End:      ${al.alarmEndTimeStr || "N/A"} (${al.alarmLongStr || "<1h"})`);
      console.log(`       Status:   ${stateStr} | Device: ${al.alarmDeviceSn || inverterSn}`);
      if (al.advice) console.log(`       Action:   ${al.advice}`);
    });
  }

  // Section 9: Detailed BMS & BMU Hardware Diagnostics & Cell Telemetry
  const minU = batteryObj.bmsMinU;
  const maxU = batteryObj.bmsMaxU;
  const deltaMv = (minU !== undefined && maxU !== undefined) ? Math.round((maxU - minU) * 1000) : "N/A";
  const decodedBms = decodeBmsRegisters(
    batteryObj.batteryAlarm,
    batteryObj.batteryFailureInformation01,
    batteryObj.batteryFailureInformation02
  );

  console.log("\n--- [9] BMS & BMU DEEP DIAGNOSTICS & CELL LOGS ---");
  console.log(`  BMS Battery Type & Model:   ${fmtVal(batteryObj.batteryTypeName || inv.batteryType)} (SN: ${fmtVal(primaryBattery.sn || batteryObj.batterySn)})`);
  console.log(`  BMS Communication State:    ${batteryObj.bmsState === 0 ? "Normal (0)" : fmtVal(batteryObj.bmsState)} | Alarm Register: ${fmtVal(batteryObj.batteryAlarm)} (${decodedBms.alarm.hex})`);
  console.log(`  BMS Failure Registers:      Fail01: ${fmtVal(batteryObj.batteryFailureInformation01)} (${decodedBms.fail01.hex}), Fail02: ${fmtVal(batteryObj.batteryFailureInformation02)} (${decodedBms.fail02.hex})`);
  console.log(`  BMS Register Decoded Status:${decodedBms.summaryText}`);
  if (!decodedBms.fail01.isNormal) console.log(`     -> Fail01 Protections:   ${decodedBms.fail01.summary}`);
  if (!decodedBms.fail02.isNormal) console.log(`     -> Fail02 Hardware:      ${decodedBms.fail02.summary}`);
  if (!decodedBms.alarm.isNormal)  console.log(`     -> Alarm Warnings:       ${decodedBms.alarm.summary}`);
  console.log(`  Rack / Tower Architecture:  ${fmtVal(batteryObj.bmsMNum)} Modules in Series | ${fmtVal(batteryObj.bmsStrNum)} Strings | Capacity: ${fmtVal(batteryObj.bmsCapacityTotal, "Ah")} (${fmtVal(primaryBattery.capacity, "kWh")})`);
  console.log(`  BMS Cycle Count & Health:   ${fmtVal(batteryObj.bmsLoopNum)} cycles completed | SOH: ${fmtVal(batteryObj.batteryHealthSoh, "%")}`);
  console.log(`  Cell Voltage Balance:       Min: ${fmtVal(minU, "V")} [${batteryObj.bmsMinuLocStr || "N/A"}] | Max: ${fmtVal(maxU, "V")} [${batteryObj.bmsMaxuLocStr || "N/A"}]`);
  console.log(`  Cell Voltage Spread (Delta):${deltaMv} mV ${deltaMv <= 20 ? "(Excellent balance)" : deltaMv <= 50 ? "(Normal balance)" : "(Imbalance warning)"}`);
  console.log(`  BMS Temperature Sensor Map: Avg: ${fmtVal(batteryObj.bmsTemp, "°C")} | Min: ${fmtVal(batteryObj.bmsMinTemp, "°C")} [${batteryObj.bmsMintempLocStr || "N/A"}] | Max: ${fmtVal(batteryObj.bmsMaxTemp, "°C")} [${batteryObj.bmsMaxtempLocStr || "N/A"}]`);
  console.log(`  BMS Operating Voltage:      Current: ${fmtVal(batteryObj.batteryVoltage, "V")} | Charge Target: ${fmtVal(batteryObj.batteryChargingVoltage, "V")} | Cut-off: ${fmtVal(batteryObj.bmsDischargeU, "V")}`);
  console.log(`  BMS Dynamic Current Limits: Charge Limit: ${fmtVal(batteryObj.batteryChargingCurrent, "A")} | Discharge Limit: ${fmtVal(batteryObj.batteryDischargeLimiting, "A")}`);
  console.log(`  BMS Protection Thresholds:  UVP: ${fmtVal(batteryObj.batteryUvpSet, "V")} | OVP: ${fmtVal(batteryObj.batteryOvpSet, "V")} | Float: ${fmtVal(batteryObj.batteryFcvSet, "V")} | Absorption: ${fmtVal(batteryObj.batteryAcvSet, "V")}`);
  console.log(`  Configured Cutoff / Reserve:Discharge Cutoff SOC: ${fmtVal(batteryObj.socDischargeSet, "%")} | Charge Reserve SOC: ${fmtVal(batteryObj.socChargingSet, "%")}`);

  // Section 10: 5-Minute Historical Battery Power & Generation Curve
  console.log(`\n--- [10] HISTORICAL BATTERY POWER CURVE (TODAY: ${todayDate}) ---`);
  if (Array.isArray(dayCurve.time) && dayCurve.time.length > 0) {
    const totalPoints = dayCurve.time.length;
    let chargeCount = 0;
    let dischargeCount = 0;
    let idleCount = 0;
    for (let i = 0; i < totalPoints; i++) {
      const p = dayCurve.batteryPower?.[i] || 0;
      if (p > 100) chargeCount++;
      else if (p < -100) dischargeCount++;
      else idleCount++;
    }
    console.log(`  Curve Resolution / Points:  5-minute intervals (${totalPoints} points recorded today)`);
    console.log(`  Operating States Breakdown: Charging: ${chargeCount * 5} mins (${chargeCount} intervals) | Discharging: ${dischargeCount * 5} mins (${dischargeCount} intervals) | Idle/Full: ${idleCount * 5} mins (${idleCount} intervals)`);

    console.log(`\n  Recent 5-Minute Telemetry Snapshot:`);
    console.log(`  Time      | Battery Power | State        | Battery SOC | Solar PV   | Grid Power`);
    console.log(`  -----------------------------------------------------------------------------`);
    const recentStart = Math.max(0, totalPoints - 8);
    for (let i = recentStart; i < totalPoints; i++) {
      const t = dayCurve.timeStr?.[i] || "N/A";
      const bW = dayCurve.batteryPower?.[i] || 0;
      const bKw = (bW / 1000).toFixed(2).padStart(7) + " kW";
      const state = bW > 100 ? "Charging   " : bW < -100 ? "Discharging" : "Stopped    ";
      const soc = (dayCurve.batteryCapacitySocList?.[i] !== undefined ? `${dayCurve.batteryCapacitySocList[i]} %` : "N/A").padStart(7);
      const sKw = (((dayCurve.pvAndAcCoupledPowerList?.[i] || 0) / 1000).toFixed(2) + " kW").padStart(9);
      const gKw = (((dayCurve.psum?.[i] || 0) / 1000).toFixed(2) + " kW").padStart(9);
      console.log(`  ${t.padEnd(9)} | ${bKw}    | ${state}  | ${soc}     | ${sKw} | ${gKw}`);
    }
  } else {
    console.log("  No daily curve data returned by SolisCloud for today.");
  }
  console.log("=================================================================\n");

  // Build combined payload
  const combinedPayload = {
    collectedAt: new Date().toISOString(),
    stationId: activeStationId,
    inverterSn: inverterSn,
    summary: {
      battery: {
        socPercent: primaryBattery.soc ?? batteryObj.batteryCapacitySoc ?? mix.batteryPercent,
        sohPercent: batteryObj.batteryHealthSoh,
        powerKw: mix.batteryPower,
        direction: batteryDirStr,
        voltageV: primaryBattery.voltage ?? batteryObj.batteryVoltage ?? mix.storageBatteryVoltage,
        currentA: primaryBattery.current ?? batteryObj.bstteryCurrent ?? mix.storageBatteryCurrent,
        ratedCapacityKwh: primaryBattery.capacity,
        bmsPowerKw: batteryObj.batteryPowerBms !== undefined ? batteryObj.batteryPowerBms / 1000 : null,
        bmsTempC: batteryObj.bmsTemp,
        bmsMinTempC: batteryObj.bmsMinTemp,
        bmsMaxTempC: batteryObj.bmsMaxTemp,
        bmsMinCellVoltageV: batteryObj.bmsMinU,
        bmsMaxCellVoltageV: batteryObj.bmsMaxU,
        cellDeltaMv: deltaMv,
        capacityAh: batteryObj.bmsCapacityTotal,
        cycles: batteryObj.bmsLoopNum,
        batteryType: batteryObj.batteryTypeName || inv.batteryType,
        batterySn: primaryBattery.sn || batteryObj.batterySn || mix.batteryJump?.batterySn,
        chargeEnergyTodayKwh: primaryBattery.dayChargeEnergy ?? mix.batteryChargeEnergy,
        dischargeEnergyTodayKwh: primaryBattery.dayDischargeEnergy ?? mix.batteryDischargeEnergy,
        chargeEnergyTotalMwh: mix.batteryChargeTotalEnergy ?? inv.batteryTotalChargeEnergy,
        dischargeEnergyTotalMwh: mix.batteryDischargeTotalEnergy ?? inv.batteryTotalDischargeEnergy,
      },
      solar: {
        activePowerKw: mix.pvAndAcCoupledPower || inv.power || mix.power,
        strings: [
          { string: 1, voltageV: inv.uPv1, currentA: inv.iPv1, powerW: inv.pow1 },
          { string: 2, voltageV: inv.uPv2, currentA: inv.iPv2, powerW: inv.pow2 },
          { string: 3, voltageV: inv.uPv3, currentA: inv.iPv3, powerW: inv.pow3 },
          { string: 4, voltageV: inv.uPv4, currentA: inv.iPv4, powerW: inv.pow4 },
        ],
        yieldTodayKwh: mix.dayEnergyStorage ?? inv.eToday,
        yieldMonthMwh: inv.eMonth,
        yieldTotalMwh: inv.eTotal,
      },
      grid: {
        direction: gridDirectionStr,
        activePowerKw: gridVo.gridPower ?? mix.gridPower,
        frequencyHz: gridVo.gridFac ?? inv.fac,
        powerFactor: gridVo.gridPowerFactor,
        reactivePowerKvar: gridVo.gridReactivePower,
        apparentPowerKva: gridVo.gridLookedPower,
        phases: {
          A: { voltageV: gridVo.gridVoltageA, currentA: gridVo.gridCurrentA, powerKw: gridVo.gridPowerA !== undefined ? gridVo.gridPowerA / 1000 : undefined },
          B: { voltageV: gridVo.gridVoltageB, currentA: gridVo.gridCurrentB, powerKw: gridVo.gridPowerB !== undefined ? gridVo.gridPowerB / 1000 : undefined },
          C: { voltageV: gridVo.gridVoltageC, currentA: gridVo.gridCurrentC, powerKw: gridVo.gridPowerC !== undefined ? gridVo.gridPowerC / 1000 : undefined },
        },
        purchasedTodayKwh: mix.gridPurchasedEnergy ?? mix.gridPurchasedTodayEnergy,
        soldTodayKwh: mix.gridSellEnergy ?? mix.gridSellTodayEnergy,
        purchasedTotalKwh: mix.gridPurchasedTotalEnergy,
        soldTotalMwh: mix.gridSellTotalEnergy,
      },
      load: {
        totalPowerKw: mix.totalLoadPower || mix.bypassLoadPower,
        bypassPowerKw: mix.bypassLoadPower,
        consumptionTodayKwh: mix.homeLoadTodayEnergy ?? mix.homeLoadEnergy,
        consumptionMonthMwh: mix.homeLoadMonthEnergy,
        consumptionTotalMwh: mix.homeLoadTotalEnergy,
      },
      inverter: {
        model: inv.model,
        serialNumber: inv.sn,
        temperatureC: inv.inverterTemperature,
        dcBusVoltageV: inv.dcBus,
        pacOutputKw: inv.pac,
        state: inv.state,
        alarmState: inv.alarmState,
        collectorSn: inv.collectorsn,
      },
      alarmsCount: alarmRecords.length,
    },
    raw: {
      detailMix: mix,
      inverterDetail: inv,
      stationDetail: sDetail,
      distributorDetail: dist,
      alarmList: alarmData,
      batteryList: bList,
      dayCurve: dayCurve,
      dayCurveDate: todayDate,
    },
  };

  // Save local JSON backup
  const outFile = path.join(__dirname, "solis_telemetry_latest.json");
  fs.writeFileSync(outFile, JSON.stringify(combinedPayload, null, 2), "utf8");
  console.log(`[FILE] Local telemetry backup saved to: ${outFile}`);

  // Step 5: Save to Supabase PostgreSQL
  if (supabaseDbUrl) {
    console.log("\n[5/5] Connecting to Supabase PostgreSQL and saving telemetry, BMS, alarms & power curve...");
    try {
      const dbRes = await saveTelemetryToSupabase(supabaseDbUrl, combinedPayload);
      console.log(`[OK] Successfully saved all telemetry, BMS, alarms & power curve to Supabase!`);
      console.log(`     -> Telemetry Log Row ID:    ${dbRes.rowId} in 'solis_telemetry'`);
      console.log(`     -> Live State updated in    'solis_telemetry_latest' for plant '${activeStationId}'`);
      console.log(`     -> BMS Telemetry Log ID:    ${dbRes.savedBmsId} in 'solis_bms_telemetry'`);
      console.log(`     -> Alarm Logs updated:      ${dbRes.savedAlarmsCount} records in 'solis_alarm_logs'`);
      console.log(`     -> Historical Power Curve:  ${dbRes.savedCurvePointsCount || 0} 5-min intervals in 'solis_battery_power_curve'`);
      console.log(`     -> Recorded at:             ${dbRes.recordedAt.toISOString()}`);
    } catch (dbErr) {
      console.error(`[WARN] Supabase storage failed: ${dbErr.message}`);
    }
  } else {
    console.log("\n[5/5] SUPABASE_DB_URL not configured. Skipping Supabase save.");
  }

  console.log("\n[COMPLETE] One-time comprehensive evaluation finished. Zero background processes running.");
}

runOneTimeEvaluation().catch((err) => {
  console.error("[FATAL ERROR]", err.message);
  process.exit(1);
});
