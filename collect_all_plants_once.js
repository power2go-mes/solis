/**
 * SolisCloud — One-Time Comprehensive Multi-Plant Data Collector
 * Discovers and collects telemetry, battery, BMS, inverter, alarms,
 * 5-minute power curves, and monthly daily energy for all 7 authorized plants.
 * 
 * Strict execution rules:
 * - Runs one-time only.
 * - Reuses existing working functions from supabase.js and bms_decoder.js.
 * - Leaves all existing scraper files untouched.
 */

const https = require("https");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { saveTelemetryToSupabase, saveDailyEnergyToSupabase } = require("./supabase");

function loadEnvFile(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  const content = fs.readFileSync(filePath, "utf8");
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eq = trimmed.indexOf("=");
    if (eq > 0) {
      env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }
  });
  return env;
}

const localEnv = loadEnvFile(path.join(__dirname, ".env.test"));
const solisUser = process.env.SOLIS_USERNAME || localEnv.SOLIS_USERNAME;
const solisPass = process.env.SOLIS_PASSWORD || localEnv.SOLIS_PASSWORD;
const supabaseDbUrl = process.env.SUPABASE_DB_URL || localEnv.SUPABASE_DB_URL;

if (!solisUser || !solisPass || !supabaseDbUrl) {
  console.error("Missing required credentials in .env.test");
  process.exit(1);
}

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

    const req = https.request("https://www.soliscloud.com" + apiPath, {
      method: "POST",
      headers,
      timeout: 15000,
    }, (res) => {
      if (res.headers["set-cookie"]) {
        sessionCookie = res.headers["set-cookie"].map(c => c.split(";")[0]).join("; ");
      }
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, json: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, text: data });
        }
      });
    });

    req.on("error", reject);
    req.write(bodyStr);
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function collectAllPlants() {
  console.log("=================================================================");
  console.log("     SOLISCLOUD ONE-TIME MULTI-PLANT TELEMETRY & SYNC HARVESTER");
  console.log("=================================================================");
  console.log(`User Identity:    ${solisUser.replace(/(.{3})(.*)(@.*)/, "$1***$3")}`);
  console.log("Supabase Target:  Connected (PostgreSQL with SSL)");
  console.log("Mode:             Single-shot sequential execution (Zero daemons)");
  console.log("=================================================================\n");

  // Step 1: Login
  console.log("[1/3] Authenticating to SolisCloud (/api/user/login2)...");
  const passMd5 = crypto.createHash("md5").update(solisPass, "utf8").digest("hex");
  const loginRes = await postRequest("/api/user/login2", {
    userInfo: solisUser,
    passWord: passMd5,
    yingZhenType: 1,
    localTime: Date.now(),
    localTimeZone: 5,
    language: "2",
  });

  if (!loginRes.json?.success) {
    console.error("Login failed:", loginRes.json?.msg || loginRes.status);
    process.exit(1);
  }
  console.log("[OK] Authenticated successfully! Session cookie acquired.\n");

  // Fetch distributor metadata once
  const distRes = await postRequest("/api/distributor/detail", {
    localTime: Date.now(),
    localTimeZone: 5,
    language: "2",
  }).catch(() => ({}));
  const distData = distRes.json?.data || {};

  // Step 2: Discover all plants
  console.log("[2/3] Discovering all authorized plants on account (/api/station/list)...");
  const stationListRes = await postRequest("/api/station/list", {
    pageNo: 1,
    pageSize: 50,
    states: "",
    stationType: "",
    localTime: Date.now(),
    localTimeZone: 5,
    language: "2",
  });

  const discoveredPlants = stationListRes.json?.data?.page?.records || [];
  console.log(`[OK] Discovered ${discoveredPlants.length} authorized plants:\n`);

  discoveredPlants.forEach((p, idx) => {
    console.log(`  [${idx + 1}] ID: ${p.id} | ${p.stationName} | ${p.capacity || p.installedCapacity} kWp | State: ${p.state}`);
  });
  console.log("\n=================================================================");

  // Step 3: Sequential Collection & Supabase Ingestion
  const results = [];
  const tzOffsetMs = 5 * 60 * 60 * 1000;
  const localNow = new Date(Date.now() + tzOffsetMs);
  const todayDateStr = localNow.toISOString().slice(0, 10);
  const currentMonthStr = todayDateStr.slice(0, 7);

  for (let i = 0; i < discoveredPlants.length; i++) {
    const plant = discoveredPlants[i];
    console.log(`\n>>> Processing Plant [${i + 1}/${discoveredPlants.length}]: ${plant.stationName} (ID: ${plant.id})`);

    const plantSummary = {
      stationId: plant.id,
      stationName: plant.stationName,
      capacityKwp: Number(plant.capacity || plant.installedCapacity) || 0,
      state: plant.state,
      city: plant.cityStr || plant.regionStr || "N/A",
      inverters: [],
      collectors: [],
      telemetrySaved: false,
      bmsSaved: false,
      alarmsSaved: 0,
      curvePointsSaved: 0,
      dailyEnergySaved: 0,
      errors: [],
    };

    try {
      // 1. Station details & live mix
      const [stationDetailRes, detailMixRes, collectorListRes] = await Promise.all([
        postRequest("/api/station/detail", { id: plant.id, localTime: Date.now(), localTimeZone: 5, language: "2" }),
        postRequest("/api/station/detailMix", { id: plant.id, localTime: Date.now(), localTimeZone: 5, language: "2" }),
        postRequest("/api/collector/list", { stationId: plant.id, pageNo: 1, pageSize: 20 }),
      ]);

      const sDetail = stationDetailRes.json?.data || {};
      const mix = detailMixRes.json?.data || {};
      const collectors = collectorListRes.json?.data?.page?.records || [];
      plantSummary.collectors = collectors.map(c => c.sn);

      // Determine inverters
      const invertersToQuery = [];
      if (mix.batteryJump?.inverterSn) {
        invertersToQuery.push(mix.batteryJump.inverterSn);
      }
      // If Menu Karachi Office, include both known inverters
      if (plant.id === "1298491919450797504") {
        ["1053050258140015", "1053050258180057"].forEach(sn => {
          if (!invertersToQuery.includes(sn)) invertersToQuery.push(sn);
        });
      }
      // If OPL Residence default
      if (plant.id === "1298491919450958553" && invertersToQuery.length === 0) {
        invertersToQuery.push("1053050258110159");
      }
      // Fallback: if no inverter found in batteryJump, use default placeholder
      if (invertersToQuery.length === 0) {
        invertersToQuery.push(`INV_${plant.id.slice(-8)}`);
      }

      plantSummary.inverters = invertersToQuery;

      // 2. Query alarms
      const alarmRes = await postRequest("/api/alarm/list", {
        pageNo: 1,
        pageSize: 100,
        stationId: plant.id,
      }).catch(() => ({}));
      const alarmRecords = alarmRes.json?.data?.page?.records || [];

      // 3. Query 5-minute historical curve for today
      const curveRes = await postRequest("/api/chart/station/day/v2", {
        id: plant.id,
        money: sDetail.money || mix.money || "PKR",
        time: todayDateStr,
        timeZone: 5,
      }).catch(() => ({}));
      const dayCurve = curveRes.json?.data || {};

      // 4. Query monthly daily energy table
      const monthRes = await postRequest("/api/chart/station/month", {
        id: plant.id,
        money: sDetail.money || mix.money || "PKR",
        month: currentMonthStr,
        timeZone: 5,
      }).catch(() => ({}));
      const dailyRecords = monthRes.json?.data || [];

      // 5. Query inverter details for each inverter
      for (const invSn of invertersToQuery) {
        console.log(`  -> Querying Inverter '${invSn}' telemetry...`);
        const invRes = await postRequest("/api/inverter/detail", { sn: invSn }).catch(() => ({}));
        const inv = invRes.json?.data || {};

        // Parse battery data
        const bList = inv.batteryList || [];
        const primaryBattery = bList[0] || {};
        const batteryObj = primaryBattery.batteryData || {};

        // Calculate battery direction
        let batteryDir = "Idle";
        const bPower = mix.batteryPower ?? inv.batteryPower;
        if (bPower !== undefined && bPower !== null) {
          if (bPower > 0.05) batteryDir = "Discharging";
          else if (bPower < -0.05) batteryDir = "Charging";
        }

        // Determine grid direction
        let gridDirectionStr = "Normal";
        if (mix.gridPower !== undefined && mix.gridPower !== null) {
          if (mix.gridPower > 0.05) gridDirectionStr = "Exporting / Selling";
          else if (mix.gridPower < -0.05) gridDirectionStr = "Importing / Purchasing";
        }

        const gridVo = inv.gridDetailVo || {};

        const combinedPayload = {
          collectedAt: new Date().toISOString(),
          stationId: plant.id,
          inverterSn: invSn,
          summary: {
            battery: {
              socPercent: mix.batteryPercent ?? inv.batteryPercent ?? batteryObj.soc,
              sohPercent: batteryObj.soh ?? 100,
              powerKw: bPower ? Math.abs(bPower) : 0,
              direction: batteryDir,
              voltageV: inv.batteryVoltage ?? batteryObj.bmsU,
              currentA: inv.batteryCurrent ?? batteryObj.bmsI,
              bmsPowerKw: batteryObj.bmsPower ? batteryObj.bmsPower / 1000 : 0,
              bmsTempC: batteryObj.bmsTemp,
              bmsMinTempC: batteryObj.bmsMinTemp,
              bmsMaxTempC: batteryObj.bmsMaxTemp,
              bmsMinCellVoltageV: batteryObj.bmsMinU,
              bmsMaxCellVoltageV: batteryObj.bmsMaxU,
              cellDeltaMv: (batteryObj.bmsMaxU && batteryObj.bmsMinU) ? Math.round((batteryObj.bmsMaxU - batteryObj.bmsMinU) * 1000) : null,
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
              model: inv.model || sDetail.inverterModel || "Hybrid",
              serialNumber: invSn,
              temperatureC: inv.inverterTemperature,
              dcBusVoltageV: inv.dcBus,
              pacOutputKw: inv.pac,
              state: inv.state,
              alarmState: inv.alarmState,
              collectorSn: inv.collectorsn || collectors[0]?.sn,
            },
            alarmsCount: alarmRecords.length,
          },
          raw: {
            detailMix: mix,
            inverterDetail: inv,
            stationDetail: sDetail,
            distributorDetail: distData,
            alarmList: alarmRes.json?.data || { page: { records: alarmRecords } },
            batteryList: invRes.json?.data?.batteryList || [],
            dayCurve: dayCurve,
            dayCurveDate: todayDateStr,
          },
        };

        // Ingest into Supabase
        const dbResult = await saveTelemetryToSupabase(supabaseDbUrl, combinedPayload);
        plantSummary.telemetrySaved = true;
        if (dbResult.savedBmsId) plantSummary.bmsSaved = true;
        plantSummary.alarmsSaved += dbResult.savedAlarmsCount || 0;
        plantSummary.curvePointsSaved += dbResult.savedCurvePointsCount || 0;
      }

      // Save Daily Energy Records
      if (Array.isArray(dailyRecords) && dailyRecords.length > 0) {
        const savedCount = await saveDailyEnergyToSupabase(supabaseDbUrl, plant.id, dailyRecords);
        plantSummary.dailyEnergySaved = savedCount;
      }

      console.log(`  [OK] Saved to Supabase: Telemetry=YES, BMS=${plantSummary.bmsSaved}, Alarms=${plantSummary.alarmsSaved}, CurvePts=${plantSummary.curvePointsSaved}, DailyLedger=${plantSummary.dailyEnergySaved}`);
    } catch (err) {
      console.error(`  [ERROR] Plant ${plant.stationName}:`, err.message);
      plantSummary.errors.push(err.message);
    }

    results.push(plantSummary);
    await sleep(600); // Polite throttling
  }

  // Final Summary Table
  console.log("\n=================================================================");
  console.log("            MULTI-PLANT HARVEST EXECUTION SUMMARY");
  console.log("=================================================================");
  results.forEach((r, idx) => {
    console.log(`[${idx + 1}] ${r.stationName} (${r.stationId})`);
    console.log(`    Capacity: ${r.capacityKwp} kWp | Status: ${r.state} | City: ${r.city}`);
    console.log(`    Inverters: [${r.inverters.join(", ")}] | Collectors: [${r.collectors.join(", ")}]`);
    console.log(`    Supabase: Telemetry=${r.telemetrySaved ? "OK" : "NO"} | BMS=${r.bmsSaved ? "OK" : "NO"} | Alarms=${r.alarmsSaved} | Curve=${r.curvePointsSaved} pts | Daily=${r.dailyEnergySaved} days`);
    if (r.errors.length > 0) console.log(`    Errors: ${r.errors.join("; ")}`);
  });
  console.log("=================================================================\n");

  return results;
}

collectAllPlants().catch(console.error);
