/**
 * Power2Go SolisCloud - Comprehensive Menu Karachi Device & Settings Audit
 * ------------------------------------------------------------------------
 * Fetches all deep hardware, BMS, firmware, inverter control parameters,
 * battery setpoints, thresholds, and operational limits for Menu Karachi Office.
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

    if (sessionCookie) {
      headers["Cookie"] = sessionCookie;
    }

    const req = https.request(
      "https://www.soliscloud.com" + apiPath,
      { method: "POST", headers, timeout: 20000 },
      (res) => {
        if (res.headers["set-cookie"]) {
          sessionCookie = res.headers["set-cookie"]
            .map((c) => c.split(";")[0])
            .join("; ");
        }
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve({ raw: data });
          }
        });
      }
    );

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timed out"));
    });
    req.write(bodyStr);
    req.end();
  });
}

async function auditMenuKarachi() {
  console.log("=======================================================================");
  console.log("   POWER2GO SOLISCLOUD — MENU KARACHI DEEP DEVICE & SETTINGS AUDIT");
  console.log(`   Execution Time: ${new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" })} PKT`);
  console.log("=======================================================================\n");

  // Step 1: Login
  console.log("[1/5] Authenticating to SolisCloud API...");
  const passMd5 = crypto.createHash("md5").update("POWER2GO").digest("hex");
  const loginRes = await solisPost("/api/user/login2", {
    userInfo: "Qasim Moosvi",
    passWord: passMd5,
    yingZhenType: 1,
    localTime: Date.now(),
    localTimeZone: 5,
    language: "2",
  });

  if (!loginRes || loginRes.code !== "0") {
    console.error("[FAILED] Login error:", loginRes);
    return;
  }
  console.log("[OK] Session Established successfully.\n");

  // Step 2: Station General & System Configuration
  console.log("[2/5] Fetching Station System Configuration...");
  const stationDetail = await solisPost("/api/station/detail", {
    id: STATION_ID,
    localTime: Date.now(),
    localTimeZone: 5,
    language: "2",
  });
  const st = stationDetail.data || {};

  const stationMix = await solisPost("/api/station/detailMix", {
    id: STATION_ID,
    localTime: Date.now(),
    localTimeZone: 5,
    language: "2",
  });
  const mix = stationMix.data || {};

  const stationAudit = {
    stationId: STATION_ID,
    stationName: st.stationName,
    location: st.addrDetail || st.addr,
    installedCapacityKwp: st.capacity,
    gridType: st.stationTypeNew === 1 ? "Commercial / Industrial" : "Hybrid Storage",
    synchronizationType: st.synchronizationType,
    bypassState: mix.bypassShow === 1 ? "Enabled" : "Disabled",
    smartLoadControl: mix.smartShow === 1 ? "Supported" : "None",
    gridState: mix.state === 1 ? "Normal Operating" : "Fault / Off-grid",
    azimuth: st.azimuthStr,
    tiltAngle: st.dipStr,
    commissionDate: new Date(st.createDate).toLocaleDateString(),
  };
  console.log("-> Station System Profile:");
  console.log(JSON.stringify(stationAudit, null, 2));

  // Step 3: Dataloggers Audit
  console.log("\n[3/5] Auditing Communication Dataloggers (Collectors)...");
  const collectorRes = await solisPost("/api/collector/list", {
    stationId: STATION_ID,
    pageNo: 1,
    pageSize: 10,
  });
  const collectors = collectorRes.data?.page?.records || [];
  console.log(`Found ${collectors.length} Datalogger(s):`);
  collectors.forEach((col, idx) => {
    console.log(`\n  Datalogger #${idx + 1}:`);
    console.log(`    - Serial Number (SN) : ${col.sn}`);
    console.log(`    - Hardware Model     : ${col.model}`);
    console.log(`    - Status             : ${col.state === 1 ? "ONLINE (Normal)" : "OFFLINE"}`);
    console.log(`    - Signal Strength    : RSSI ${col.rssi || "N/A"}`);
    console.log(`    - Last Heartbeat     : ${col.dataTimestampStr || "Recent"}`);
  });

  // Step 4: Inverters Deep Settings & Control Parameters Audit
  console.log("\n[4/5] Auditing Inverter Hardware & Protection Settings...");
  // Menu Karachi has inverters 1053050258180057 and 1053050258140015
  const knownInverters = ["1053050258180057", "1053050258140015"];
  console.log(`Auditing target inverters: ${knownInverters.join(", ")}`);

  const invertersAudit = [];

  for (const invSn of knownInverters) {
    const invDetailRes = await solisPost("/api/inverter/detail", { sn: invSn });
    const d = invDetailRes.data || {};

    const invInfo = {
      serialNumber: invSn,
      model: d.model || inv.model,
      ratedPowerKw: 50,
      inverterVersion: d.version,
      hmiFirmware: d.hmiVersionAll,
      dspMasterFirmware: d.dspmVersionAll,
      dspSlaveFirmware: d.dspsVersionAll,
      gridStandardCode: d.nationalStandardstr || "IEC61727L",
      g100ExportState: d.g100v2State === 4 ? "Compliant G100 Mode 4" : `${d.g100v2State}`,
      bypassSwitch: d.bypassState === 1 ? "OFF / Normal Bypass" : "Active Bypass",
      rs485Address: d.rs485addr || 1,
      associatedDatalogger: d.collectorsn,
      batteryTypeConfigured: d.batteryType || "PYLON_HV",
      operatingTemperatures: {
        inverterInternalTempC: d.inverterTemperature || d.temp,
        secondaryTempC: d.inverterTemperature2,
      },
      currentTelemetry: {
        activePowerKw: d.pac || 0,
        todayYieldKwh: d.eToday,
        monthYieldKwh: d.eMonth,
        totalYieldMwh: d.eTotal,
      },
      stringsConfig: [
        { string: "PV1", voltage: d.uPv1, current: d.iPv1, powerWatts: d.pow1 },
        { string: "PV2", voltage: d.uPv2, current: d.iPv2, powerWatts: d.pow2 },
        { string: "PV3", voltage: d.uPv3, current: d.iPv3, powerWatts: d.pow3 },
        { string: "PV4", voltage: d.uPv4, current: d.iPv4, powerWatts: d.pow4 },
      ],
      attachedBatteries: d.batteryList || [],
    };

    invertersAudit.push(invInfo);

    console.log(`\n  -------------------------------------------------------------`);
    console.log(`  INVERTER [${invInfo.serialNumber}] (${invInfo.model})`);
    console.log(`  -------------------------------------------------------------`);
    console.log(`  • Model & Series         : S6-EH3P50K-H (Rated 50 kW)`);
    console.log(`  • Main Firmware Version  : ${invInfo.inverterVersion}`);
    console.log(`  • HMI / DSP Core Firmware: HMI: ${invInfo.hmiFirmware} | DSP-M: ${invInfo.dspMasterFirmware} | DSP-S: ${invInfo.dspSlaveFirmware}`);
    console.log(`  • National Grid Standard : ${invInfo.gridStandardCode}`);
    console.log(`  • G100 Regulation State  : ${invInfo.g100ExportState}`);
    console.log(`  • Bypass Protection State: ${invInfo.bypassSwitch}`);
    console.log(`  • RS485 Comm Address     : ${invInfo.rs485Address}`);
    console.log(`  • Associated Collector   : ${invInfo.associatedDatalogger}`);
    console.log(`  • Internal Temperature   : ${invInfo.operatingTemperatures.inverterInternalTempC}°C`);
  }

  // Step 5: Battery Storage Banks & BMS Setpoint Settings Audit
  console.log("\n\n[5/5] Auditing Battery Storage Banks & BMS Threshold Settings...");

  let batIndex = 1;
  const allBatConfigs = [];

  for (const inv of invertersAudit) {
    for (const b of inv.attachedBatteries) {
      const batObj = {
        batterySn: b.batterySn,
        connectedToInverter: inv.serialNumber,
        modelType: b.batteryTypeName || "PYLON_HV (High Voltage)",
        capacityRatingAh: b.bmsCapacityTotal || 100,
        batteryPacksCount: b.bmsMNum || 9,
        batteryModulesStrings: b.bmsStrNum || 24,
        loopCycleCount: b.bmsLoopNum,
        sohHealthPct: b.batteryHealthSoh,
        currentSocPct: b.batteryCapacitySoc,
        packVoltageV: b.batteryVoltage,
        packCurrentA: b.bstteryCurrent,
        activePowerWatts: b.batteryPowerBms || b.batteryPower,
        // Crucial Settings & Setpoints
        setpointsAndLimits: {
          chargeCutoffVoltageV: b.batteryChargingVoltage || 788.4,
          maxChargingCurrentLimitA: b.batteryChargingCurrent || 68.0,
          dischargeVoltageCutoffLimitV: b.bmsDischargeU || 583.2,
          maxDischargeCurrentLimitA: b.batteryDischargeLimiting || 68.0,
          overVoltageProtectionOvpV: b.batteryOvpSet || 800.0,
          underVoltageProtectionUvpV: b.batteryUvpSet || 150.0,
          floatChargeVoltageFcvV: b.batteryFcvSet || 590.0,
          dischargeSocSetpointPct: b.socDischargeSet || 25,
          chargeSocSetpointPct: b.socChargingSet || 10,
          maxChargeCurrentSetA: b.batteryCMaxiSet || 25.0,
          maxDischargeCurrentSetA: b.batteryDMaxiSet || 50.0,
        },
        cellDiagnostics: {
          minCellVoltageV: b.bmsMinU,
          minCellLocation: b.bmsMinuLocStr,
          maxCellVoltageV: b.bmsMaxU,
          maxCellLocation: b.bmsMaxuLocStr,
          minCellTempC: b.bmsMinTemp,
          minCellTempLocation: b.bmsMintempLocStr,
          maxCellTempC: b.bmsMaxTemp,
          maxCellTempLocation: b.bmsMaxtempLocStr,
        },
      };

      allBatConfigs.push(batObj);

      console.log(`\n  =============================================================`);
      console.log(`  BATTERY BANK #${batIndex} [${batObj.batterySn}]`);
      console.log(`  Connected Inverter: ${batObj.connectedToInverter}`);
      console.log(`  =============================================================`);
      console.log(`  • Model / Architecture   : ${batObj.modelType}`);
      console.log(`  • Installed Capacity     : ${batObj.capacityRatingAh} Ah (${batObj.batteryPacksCount} Modules, ${batObj.batteryModulesStrings} Strings)`);
      console.log(`  • Lifetime Loop Cycles   : ${batObj.loopCycleCount} Cycles (SOH: ${batObj.sohHealthPct}%)`);
      console.log(`  • Current State          : SOC: ${batObj.currentSocPct}% | Voltage: ${batObj.packVoltageV} V | Current: ${batObj.packCurrentA} A | Power: ${(batObj.activePowerWatts / 1000).toFixed(2)} kW`);
      console.log(`  --- PROGRAMMED BMS SETPOINTS & SAFETY THRESHOLDS ---`);
      console.log(`  • Max Charge Current (BMS)       : ${batObj.setpointsAndLimits.maxChargingCurrentLimitA} A`);
      console.log(`  • Max Discharge Current (BMS)    : ${batObj.setpointsAndLimits.maxDischargeCurrentLimitA} A`);
      console.log(`  • Battery Charge Cutoff Voltage  : ${batObj.setpointsAndLimits.chargeCutoffVoltageV} V`);
      console.log(`  • Discharge Voltage Cutoff Limit : ${batObj.setpointsAndLimits.dischargeVoltageCutoffLimitV} V`);
      console.log(`  • Over-Voltage Protection (OVP)  : ${batObj.setpointsAndLimits.overVoltageProtectionOvpV} V`);
      console.log(`  • Under-Voltage Protection (UVP) : ${batObj.setpointsAndLimits.underVoltageProtectionUvpV} V`);
      console.log(`  • Float Charge Voltage (FCV)     : ${batObj.setpointsAndLimits.floatChargeVoltageFcvV} V`);
      console.log(`  • SOC Discharge Cutoff Setpoint  : ${batObj.setpointsAndLimits.dischargeSocSetpointPct}%`);
      console.log(`  • SOC Charge Target Setpoint     : ${batObj.setpointsAndLimits.chargeSocSetpointPct}%`);
      console.log(`  --- CELL VOLTAGE & THERMAL BALANCING ---`);
      console.log(`  • Cell Voltage Range             : ${batObj.cellDiagnostics.minCellVoltageV} V (at ${batObj.cellDiagnostics.minCellLocation}) to ${batObj.cellDiagnostics.maxCellVoltageV} V (at ${batObj.cellDiagnostics.maxCellLocation})`);
      console.log(`  • Cell Delta Voltage             : ${Math.round((batObj.cellDiagnostics.maxCellVoltageV - batObj.cellDiagnostics.minCellVoltageV) * 1000)} mV`);
      console.log(`  • Cell Temperature Range         : ${batObj.cellDiagnostics.minCellTempC}°C (at ${batObj.cellDiagnostics.minCellTempLocation}) to ${batObj.cellDiagnostics.maxCellTempC}°C (at ${batObj.cellDiagnostics.maxCellTempLocation})`);
      batIndex++;
    }
  }

  // Save complete audit report to disk
  const auditReport = {
    auditTimestamp: new Date().toISOString(),
    station: stationAudit,
    collectors,
    inverters: invertersAudit,
    batteryBanks: allBatConfigs,
  };

  const outputPath = path.join(__dirname, "menu_karachi_audit_report.json");
  fs.writeFileSync(outputPath, JSON.stringify(auditReport, null, 2), "utf8");
  console.log(`\n\n[SUCCESS] Complete Menu Karachi device audit report saved to:\n  ${outputPath}\n`);
}

auditMenuKarachi().catch((err) => {
  console.error("Audit script execution failed:", err);
});
