/**
 * SolisCloud — Pull Latest 6 Hours Data for All 7 Clients
 * Target Window: 08:45 PKT – 14:45 PKT on November 18, 2026
 * Collects 5-minute telemetry curves, live power flows, BMS cell registers,
 * and alarm logs, then synchronizes to Supabase PostgreSQL.
 */

const https = require("https");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { saveTelemetryToSupabase } = require("./supabase");

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

const plants = [
  { id: "1298491919450958553", name: "OPL Residence", capacity: 55.5 },
  { id: "1298491919450873747", name: "36 Chenab", capacity: 25.155 },
  { id: "1298491919450851319", name: "P2G 20kw", capacity: 18.0 },
  { id: "1298491919450840394", name: "P2G 1ST 6kw", capacity: 20.0 },
  { id: "1298491919450797504", name: "Menu Karachi Office", capacity: 80.0 },
  { id: "1298491919450740581", name: "P2G 50KW", capacity: 32.0 },
  { id: "1298491919450734544", name: "P2G 15KW", capacity: 20.0 }
];

async function pullLatest6Hours() {
  console.log("=================================================================");
  console.log("   SOLISCLOUD — LATEST 6-HOUR TELEMETRY PULL (ALL 7 CLIENTS)");
  console.log("=================================================================");
  console.log(`Current Time (PKT): 14:45 PKT (18 Nov 2026)`);
  console.log(`Window Analyzed:    08:45 PKT — 14:45 PKT (Latest 6 Hours)`);
  console.log(`User:               ${solisUser.replace(/(.{3})(.*)(@.*)/, "$1***$3")}`);
  console.log("=================================================================\n");

  // Step 1: Login
  console.log("[1/3] Authenticating to SolisCloud...");
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
  console.log("[OK] Authenticated successfully! Session active.\n");

  const todayDateStr = "2026-11-18";
  const sixHourResults = [];

  for (let i = 0; i < plants.length; i++) {
    const p = plants[i];
    console.log(`>>> [${i + 1}/7] Pulling latest telemetry for: ${p.name} (${p.id})...`);

    try {
      // 1. Station detailMix (Current Instantaneous snapshot at ~14:45 PKT)
      const mixRes = await postRequest("/api/station/detailMix", {
        id: p.id,
        localTime: Date.now(),
        localTimeZone: 5,
        language: "2",
      });
      const mix = mixRes.json?.data || {};

      // 2. Day 5-minute curve for today (up to 14:45 PKT)
      const curveRes = await postRequest("/api/chart/station/day/v2", {
        id: p.id,
        money: mix.money || "PKR",
        time: todayDateStr,
        timeZone: 5,
      });
      const dayCurve = curveRes.json?.data || {};

      // 3. Inverter detail & BMS
      const inverters = [];
      if (mix.batteryJump?.inverterSn) inverters.push(mix.batteryJump.inverterSn);
      if (p.id === "1298491919450797504") {
        ["1053050258140015", "1053050258180057"].forEach(sn => {
          if (!inverters.includes(sn)) inverters.push(sn);
        });
      }
      if (p.id === "1298491919450958553" && inverters.length === 0) {
        inverters.push("1053050258110159");
      }
      if (inverters.length === 0) {
        inverters.push(`INV_${p.id.slice(-8)}`);
      }

      const invDetails = [];
      for (const sn of inverters) {
        const invRes = await postRequest("/api/inverter/detail", { sn }).catch(() => ({}));
        invDetails.push(invRes.json?.data || {});
      }

      // 4. Alarms list
      const alarmRes = await postRequest("/api/alarm/list", {
        pageNo: 1,
        pageSize: 50,
        stationId: p.id,
      }).catch(() => ({}));
      const alarmRecords = alarmRes.json?.data?.page?.records || [];

      // Parse 5-minute curve parallel arrays as returned by SolisCloud /api/chart/station/day/v2
      const timeArray = dayCurve.time || [];
      const timeStrArray = dayCurve.timeStr || [];
      const solarPowerArray = dayCurve.pvAndAcCoupledPowerList || dayCurve.powerList || [];
      const batteryPowerArray = dayCurve.batteryPower || [];
      const gridPowerArray = dayCurve.psum || dayCurve.gridPowerList || [];
      const loadPowerArray = dayCurve.familyLoadPowerList || dayCurve.bypassLoadPowerList || [];
      const socArray = dayCurve.batteryCapacitySocList || [];

      const allPoints = [];
      for (let idx = 0; idx < timeArray.length; idx++) {
        const tStr = timeStrArray[idx] || (timeArray[idx] ? new Date(Number(timeArray[idx]) + 5 * 3600 * 1000).toISOString().slice(11, 16) : null);
        if (!tStr) continue;

        const sW = Number(solarPowerArray[idx] || 0);
        const bW = Number(batteryPowerArray[idx] || 0);
        const gW = Number(gridPowerArray[idx] || 0);
        const lW = Number(loadPowerArray[idx] || 0);
        const soc = Number(socArray[idx] || 0);

        allPoints.push({
          epoch: Number(timeArray[idx]),
          time: tStr,
          solarKw: Number((sW / 1000).toFixed(2)),
          batteryKw: Number((bW / 1000).toFixed(2)),
          gridKw: Number((gW / 1000).toFixed(2)),
          loadKw: Number((lW / 1000).toFixed(2)),
          soc: soc,
        });
      }

      // Filter for latest 6 hours: 08:45 PKT to 14:45 PKT
      const sixHourPoints = allPoints.filter(pt => pt.time >= "08:45" && pt.time <= "14:45");

      // Calculate 6-hour integrals and stats
      let sixHourPvKwh = 0;
      let sixHourChargeKwh = 0;
      let sixHourDischargeKwh = 0;
      let sixHourImportKwh = 0;
      let sixHourExportKwh = 0;
      let sixHourLoadKwh = 0;
      let peakSolarKw = 0;
      let peakSolarTime = "N/A";
      let minSoc = 100;
      let maxSoc = 0;

      sixHourPoints.forEach(pt => {
        const pSolar = Math.max(0, pt.solarKw);
        const pBat = pt.batteryKw;
        const pGrid = pt.gridKw;
        const pLoad = Math.max(0, pt.loadKw);
        const soc = pt.soc;

        sixHourPvKwh += pSolar * (5 / 60);
        if (pSolar > peakSolarKw) {
          peakSolarKw = pSolar;
          peakSolarTime = pt.time;
        }

        if (pBat > 0.05) sixHourChargeKwh += pBat * (5 / 60);
        else if (pBat < -0.05) sixHourDischargeKwh += Math.abs(pBat) * (5 / 60);

        if (pGrid > 0.05) sixHourExportKwh += pGrid * (5 / 60);
        else if (pGrid < -0.05) sixHourImportKwh += Math.abs(pGrid) * (5 / 60);

        sixHourLoadKwh += pLoad * (5 / 60);

        if (soc > 0) {
          if (soc < minSoc) minSoc = soc;
          if (soc > maxSoc) maxSoc = soc;
        }
      });

      // Filter alarms in last 6 hours (since 08:45 PKT today)
      const sixHourAlarms = alarmRecords.filter(a => {
        const t = a.alarmBeginTimeStr || "";
        return t.includes("2026-11-18") && t.slice(11, 16) >= "08:45";
      });

      const clientSummary = {
        stationId: p.id,
        stationName: p.name,
        capacityKwp: p.capacity,
        currentTime: "14:45 PKT",
        currentStatus: {
          solarKw: Number(mix.pvAndAcCoupledPower || mix.power || 0),
          batterySoc: Number(mix.batteryPercent || 0),
          batteryPowerKw: Number(mix.batteryPower || 0),
          gridPowerKw: Number(mix.gridPower || 0),
          loadPowerKw: Number(mix.totalLoadPower || 0),
          inverterState: invDetails[0]?.state ?? (mix.power > 0 ? "Normal" : "Idle"),
        },
        sixHourTotals: {
          intervalCount: sixHourPoints.length,
          solarEnergyKwh: Math.round(sixHourPvKwh * 10) / 10,
          peakSolarKw: Math.round(peakSolarKw * 10) / 10,
          peakSolarTime: peakSolarTime,
          batteryChargeKwh: Math.round(sixHourChargeKwh * 10) / 10,
          batteryDischargeKwh: Math.round(sixHourDischargeKwh * 10) / 10,
          socProgression: minSoc <= maxSoc ? `${minSoc}% → ${maxSoc}%` : `${mix.batteryPercent || 0}%`,
          gridImportKwh: Math.round(sixHourImportKwh * 10) / 10,
          gridExportKwh: Math.round(sixHourExportKwh * 10) / 10,
          loadEnergyKwh: Math.round(sixHourLoadKwh * 10) / 10,
          alarmsCount: sixHourAlarms.length,
          alarms: sixHourAlarms.map(a => `${a.alarmCode} (${a.alarmMsg}) at ${a.alarmBeginTimeStr?.slice(11, 16)}`),
        },
        hourlySamples: [
          sixHourPoints.find(pt => pt.time.startsWith("09:00")),
          sixHourPoints.find(pt => pt.time.startsWith("10:00")),
          sixHourPoints.find(pt => pt.time.startsWith("11:00")),
          sixHourPoints.find(pt => pt.time.startsWith("12:00")),
          sixHourPoints.find(pt => pt.time.startsWith("13:00")),
          sixHourPoints.find(pt => pt.time.startsWith("14:00")),
          sixHourPoints[sixHourPoints.length - 1],
        ].filter(Boolean)
      };

      sixHourResults.push(clientSummary);

      // Save fresh data into Supabase
      const primaryInv = invDetails[0] || {};
      const primaryBattery = primaryInv.batteryList?.[0] || {};
      const batteryObj = primaryBattery.batteryData || {};

      let bDir = "Idle";
      const bPow = mix.batteryPower ?? primaryInv.batteryPower;
      if (bPow > 0.05) bDir = "Discharging";
      else if (bPow < -0.05) bDir = "Charging";

      const combinedPayload = {
        collectedAt: new Date().toISOString(),
        stationId: p.id,
        inverterSn: inverters[0],
        summary: {
          battery: {
            socPercent: mix.batteryPercent ?? primaryInv.batteryPercent ?? batteryObj.soc,
            sohPercent: batteryObj.soh ?? 100,
            powerKw: bPow ? Math.abs(bPow) : 0,
            direction: bDir,
            voltageV: primaryInv.batteryVoltage ?? batteryObj.bmsU,
            currentA: primaryInv.batteryCurrent ?? batteryObj.bmsI,
            bmsPowerKw: batteryObj.bmsPower ? batteryObj.bmsPower / 1000 : 0,
            bmsTempC: batteryObj.bmsTemp,
            bmsMinTempC: batteryObj.bmsMinTemp,
            bmsMaxTempC: batteryObj.bmsMaxTemp,
            bmsMinCellVoltageV: batteryObj.bmsMinU,
            bmsMaxCellVoltageV: batteryObj.bmsMaxU,
            cellDeltaMv: (batteryObj.bmsMaxU && batteryObj.bmsMinU) ? Math.round((batteryObj.bmsMaxU - batteryObj.bmsMinU) * 1000) : null,
            capacityAh: batteryObj.bmsCapacityTotal,
            cycles: batteryObj.bmsLoopNum,
            batteryType: batteryObj.batteryTypeName || primaryInv.batteryType,
            batterySn: primaryBattery.sn || batteryObj.batterySn || mix.batteryJump?.batterySn,
            chargeEnergyTodayKwh: primaryBattery.dayChargeEnergy ?? mix.batteryChargeEnergy,
            dischargeEnergyTodayKwh: primaryBattery.dayDischargeEnergy ?? mix.batteryDischargeEnergy,
            chargeEnergyTotalMwh: mix.batteryChargeTotalEnergy ?? primaryInv.batteryTotalChargeEnergy,
            dischargeEnergyTotalMwh: mix.batteryDischargeTotalEnergy ?? primaryInv.batteryTotalDischargeEnergy,
          },
          solar: {
            activePowerKw: mix.pvAndAcCoupledPower || primaryInv.power || mix.power,
            strings: [
              { string: 1, voltageV: primaryInv.uPv1, currentA: primaryInv.iPv1, powerW: primaryInv.pow1 },
              { string: 2, voltageV: primaryInv.uPv2, currentA: primaryInv.iPv2, powerW: primaryInv.pow2 },
              { string: 3, voltageV: primaryInv.uPv3, currentA: primaryInv.iPv3, powerW: primaryInv.pow3 },
              { string: 4, voltageV: primaryInv.uPv4, currentA: primaryInv.iPv4, powerW: primaryInv.pow4 },
            ],
            yieldTodayKwh: mix.dayEnergyStorage ?? primaryInv.eToday,
            yieldMonthMwh: primaryInv.eMonth,
            yieldTotalMwh: primaryInv.eTotal,
          },
          grid: {
            direction: mix.gridPower > 0.05 ? "Exporting / Selling" : "Importing / Purchasing",
            activePowerKw: primaryInv.gridDetailVo?.gridPower ?? mix.gridPower,
            frequencyHz: primaryInv.gridDetailVo?.gridFac ?? primaryInv.fac,
            powerFactor: primaryInv.gridDetailVo?.gridPowerFactor,
            reactivePowerKvar: primaryInv.gridDetailVo?.gridReactivePower,
            apparentPowerKva: primaryInv.gridDetailVo?.gridLookedPower,
            phases: {
              A: { voltageV: primaryInv.gridDetailVo?.gridVoltageA, currentA: primaryInv.gridDetailVo?.gridCurrentA, powerKw: primaryInv.gridDetailVo?.gridPowerA ? primaryInv.gridDetailVo.gridPowerA / 1000 : undefined },
              B: { voltageV: primaryInv.gridDetailVo?.gridVoltageB, currentA: primaryInv.gridDetailVo?.gridCurrentB, powerKw: primaryInv.gridDetailVo?.gridPowerB ? primaryInv.gridDetailVo.gridPowerB / 1000 : undefined },
              C: { voltageV: primaryInv.gridDetailVo?.gridVoltageC, currentA: primaryInv.gridDetailVo?.gridCurrentC, powerKw: primaryInv.gridDetailVo?.gridPowerC ? primaryInv.gridDetailVo.gridPowerC / 1000 : undefined },
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
            model: primaryInv.model || "Hybrid",
            serialNumber: inverters[0],
            temperatureC: primaryInv.inverterTemperature,
            dcBusVoltageV: primaryInv.dcBus,
            pacOutputKw: primaryInv.pac,
            state: primaryInv.state,
            alarmState: primaryInv.alarmState,
            collectorSn: primaryInv.collectorsn,
          },
          alarmsCount: alarmRecords.length,
        },
        raw: {
          detailMix: mix,
          inverterDetail: primaryInv,
          stationDetail: { stationName: p.name, capacity: p.capacity },
          alarmList: { page: { records: alarmRecords } },
          batteryList: primaryInv.batteryList || [],
          dayCurve: dayCurve,
          dayCurveDate: todayDateStr,
        },
      };

      await saveTelemetryToSupabase(supabaseDbUrl, combinedPayload);
      console.log(`  [OK] Saved fresh 14:45 PKT telemetry & ${allPoints.length} curve points into Supabase!`);
    } catch (err) {
      console.error(`  [ERROR] Plant ${p.name}:`, err.message);
    }

    await sleep(500);
  }

  // Write JSON artifact
  const outPath = path.join(__dirname, "latest_6hours_all_clients.json");
  fs.writeFileSync(outPath, JSON.stringify(sixHourResults, null, 2), "utf8");
  console.log(`\n[SUCCESS] Full 6-hour dataset exported to: ${outPath}`);

  return sixHourResults;
}

pullLatest6Hours().catch(console.error);
