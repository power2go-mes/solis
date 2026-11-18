/**
 * Deep Forensic Audit of Solis System Anomaly: Nov 08 to Nov 17, 2026
 * Plant: Menu Karachi Office (1298491919450797504)
 */

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
const targetStationId = "1298491919450797504"; // Menu Karachi Office

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

    if (sessionCookie) headers["Cookie"] = sessionCookie;

    const url = new URL(SOLIS_API_BASE + apiPath);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: apiPath,
      method: "POST",
      headers: headers,
      timeout: 20000,
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
          resolve({ status: res.statusCode, rawText: raw.slice(0, 200) });
        }
      });
    });

    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("Timeout")));
    req.write(bodyStr);
    req.end();
  });
}

async function audit() {
  console.log("===============================================================================");
  console.log("          SOLIS SYSTEM FORENSIC AUDIT: NOVEMBER 08 - 17, 2026");
  console.log("===============================================================================");
  console.log(`Station: Menu Karachi Office (ID: ${targetStationId})\n`);

  // 1. Login
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
    console.error("Login failed:", loginRes.json);
    process.exit(1);
  }
  console.log("[1/5] Login successful.");

  // 2. Station Detail & Inverter / Collector Hardware
  const [stationRes, invListRes, collectorListRes] = await Promise.all([
    postRequest("/api/station/detail", { id: targetStationId, localTime: Date.now(), localTimeZone: 5, language: "2" }),
    postRequest("/api/inverter/list", { stationId: targetStationId, pageNo: 1, pageSize: 10 }),
    postRequest("/api/collector/list", { stationId: targetStationId, pageNo: 1, pageSize: 10 }),
  ]);

  const inverters = invListRes.json?.data?.page?.records || invListRes.json?.data?.records || [];
  const collectors = collectorListRes.json?.data?.page?.records || collectorListRes.json?.data?.records || [];
  console.log(`[2/5] Hardware Detected:`);
  console.log(`      Inverters (${inverters.length}):`);
  for (const inv of inverters) {
    console.log(`        - SN: ${inv.sn || inv.inverterSn}, Model: ${inv.model || inv.inverterType}, State: ${inv.state}, AlarmState: ${inv.alarmState}, Datalogger: ${inv.collectorSn || inv.collectorsn}`);
  }
  console.log(`      Dataloggers/Collectors (${collectors.length}):`);
  for (const col of collectors) {
    console.log(`        - SN: ${col.sn || col.collectorSn}, Model: ${col.model}, State: ${col.state}, ConnectStatus: ${col.connectStatus}, RSSI: ${col.rssi}`);
  }

  const primaryInvSn = inverters[0]?.sn || inverters[0]?.inverterSn || "1053050258110159";

  // 3. Query All Alarms / Faults (Active and Historical)
  console.log("\n[3/5] Querying SolisCloud Alarm & Protection Logs for Station & Inverter...");
  
  const alarmQueries = [
    { name: "All Alarms (no filter)", body: { pageNo: 1, pageSize: 100, stationId: targetStationId } },
    { name: "Alarms with state=0", body: { pageNo: 1, pageSize: 100, stationId: targetStationId, state: 0 } },
    { name: "Alarms with state=1", body: { pageNo: 1, pageSize: 100, stationId: targetStationId, state: 1 } },
    { name: "Alarms with state=2", body: { pageNo: 1, pageSize: 100, stationId: targetStationId, state: 2 } },
    { name: "Inverter Alarms by SN", body: { pageNo: 1, pageSize: 100, inverterSn: primaryInvSn } },
    { name: "Date Range Alarms (Nov 01 - Nov 18)", body: { pageNo: 1, pageSize: 100, stationId: targetStationId, startDate: "2026-11-01", endDate: "2026-11-18" } },
  ];

  const uniqueAlarms = new Map();
  for (const q of alarmQueries) {
    try {
      const res = await postRequest("/api/alarm/list", q.body);
      const records = res.json?.data?.records || res.json?.data?.page?.records || [];
      console.log(`      ${q.name}: returned ${records.length} records`);
      for (const a of records) {
        const idKey = a.id || `${a.alarmCode}_${a.alarmBeginTime}_${a.sn}`;
        if (!uniqueAlarms.has(idKey)) uniqueAlarms.set(idKey, a);
      }
    } catch (e) {
      console.log(`      ${q.name} query error: ${e.message}`);
    }
  }

  // Also try /api/alarm/pageList, /api/device/alarm, /api/station/alarm if available
  const altEndpoints = ["/api/alarm/pageList", "/api/inverter/alarm", "/api/collector/alarm"];
  for (const ep of altEndpoints) {
    try {
      const altRes = await postRequest(ep, { pageNo: 1, pageSize: 50, stationId: targetStationId });
      if (altRes.json?.success && altRes.json?.data) {
        const altRecords = altRes.json.data.records || altRes.json.data.page?.records || [];
        console.log(`      Endpoint ${ep} returned ${altRecords.length} records!`);
        for (const a of altRecords) {
          const idKey = a.id || `${a.alarmCode}_${a.alarmBeginTime}_${a.sn}`;
          if (!uniqueAlarms.has(idKey)) uniqueAlarms.set(idKey, a);
        }
      }
    } catch (e) {}
  }

  console.log(`\n      Total Unique Alarm Logs Found: ${uniqueAlarms.size}`);
  const allAlarmList = Array.from(uniqueAlarms.values());
  allAlarmList.sort((a, b) => (b.alarmBeginTime || 0) - (a.alarmBeginTime || 0));

  for (const a of allAlarmList) {
    const beginStr = a.alarmBeginTimeStr || (a.alarmBeginTime ? new Date(a.alarmBeginTime).toISOString() : "N/A");
    const endStr = a.alarmEndTimeStr || (a.alarmEndTime ? new Date(a.alarmEndTime).toISOString() : "Active");
    console.log(`      -> Code: ${a.alarmCode || a.code} | Msg: ${a.alarmMsg || a.msg} | Level: ${a.alarmLevel || a.level} | Begin: ${beginStr} | End: ${endStr} | Device: ${a.sn || a.deviceSn} | State: ${a.state}`);
  }

  // 4. Day-by-Day 5-Minute Telemetry Curves for Nov 08 to Nov 17
  console.log("\n[4/5] Pulling 5-Minute Telemetry Curves for Each Day (Nov 08 - Nov 17)...");
  const datesToAudit = [
    "2026-11-08",
    "2026-11-09",
    "2026-11-10",
    "2026-11-11",
    "2026-11-12",
    "2026-11-13",
    "2026-11-14",
    "2026-11-15",
    "2026-11-16",
    "2026-11-17",
  ];

  const dailyAudits = [];

  for (const d of datesToAudit) {
    const curveRes = await postRequest("/api/chart/station/day/v2", {
      id: targetStationId,
      time: d,
      timeZone: 5,
      money: "PKR",
    });

    const data = curveRes.json?.data || {};
    const times = data.timeStr || [];
    const batteryPower = data.batteryPower || [];
    const solarPower = data.pac || [];
    const gridPower = data.gridPower || [];
    const loadPower = data.loadPower || [];
    const batterySoc = data.batterySoc || [];
    const pointsCount = times.length;

    // Check data presence
    let nonZeroSolar = 0, nonZeroBattery = 0, nonZeroGrid = 0, nonZeroLoad = 0;
    let minSoc = 100, maxSoc = 0;
    let firstTime = times[0] || "N/A", lastTime = times[times.length - 1] || "N/A";

    for (let i = 0; i < pointsCount; i++) {
      const sp = Number(solarPower[i] || 0);
      const bp = Number(batteryPower[i] || 0);
      const gp = Number(gridPower[i] || 0);
      const lp = Number(loadPower[i] || 0);
      const soc = Number(batterySoc[i] || 0);

      if (sp > 0) nonZeroSolar++;
      if (bp !== 0) nonZeroBattery++;
      if (gp !== 0) nonZeroGrid++;
      if (lp > 0) nonZeroLoad++;
      if (soc > 0) {
        if (soc < minSoc) minSoc = soc;
        if (soc > maxSoc) maxSoc = soc;
      }
    }

    dailyAudits.push({
      date: d,
      points: pointsCount,
      firstTime,
      lastTime,
      nonZeroSolar,
      nonZeroBattery,
      nonZeroGrid,
      nonZeroLoad,
      minSoc: minSoc === 100 ? 0 : minSoc,
      maxSoc,
      rawCurve: data,
    });

    console.log(`      Date: ${d} | Points: ${pointsCount} | First: ${firstTime} | Last: ${lastTime} | SolarActive: ${nonZeroSolar} pts | BatteryActive: ${nonZeroBattery} pts | SOC Range: ${minSoc}%-${maxSoc}%`);
  }

  // 5. In-depth day analysis & diagnostics output
  console.log("\n[5/5] Analyzing Days Nov 10, 11, 12, 13, 14, 15...");
  for (const da of dailyAudits) {
    if (["2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15"].includes(da.date)) {
      console.log(`\n   --- Detailed Inspection for ${da.date} ---`);
      console.log(`   Total 5-min intervals: ${da.points}`);
      if (da.points > 0) {
        const rc = da.rawCurve;
        console.log(`   Sample Data points (first 5 and last 5):`);
        for (let i = 0; i < Math.min(5, da.points); i++) {
          console.log(`     ${rc.timeStr[i]} | Solar: ${rc.pac?.[i]} kW | Batt: ${rc.batteryPower?.[i]} kW | SOC: ${rc.batterySoc?.[i]}% | Grid: ${rc.gridPower?.[i]} kW | Load: ${rc.loadPower?.[i]} kW`);
        }
        if (da.points > 5) {
          console.log(`     ...`);
          for (let i = Math.max(0, da.points - 5); i < da.points; i++) {
            console.log(`     ${rc.timeStr[i]} | Solar: ${rc.pac?.[i]} kW | Batt: ${rc.batteryPower?.[i]} kW | SOC: ${rc.batterySoc?.[i]}% | Grid: ${rc.gridPower?.[i]} kW | Load: ${rc.loadPower?.[i]} kW`);
          }
        }
      } else {
        console.log(`   [CRITICAL] ZERO 5-minute curve points were recorded by SolisCloud on ${da.date}!`);
      }
    }
  }

  // Save audit data to scratch
  const auditReportPath = path.join(__dirname, "forensic_audit_nov08_17.json");
  fs.writeFileSync(
    auditReportPath,
    JSON.stringify(
      {
        stationId: targetStationId,
        inverters,
        collectors,
        alarms: allAlarmList,
        dailyAudits: dailyAudits.map(d => ({
          date: d.date,
          points: d.points,
          firstTime: d.firstTime,
          lastTime: d.lastTime,
          nonZeroSolar: d.nonZeroSolar,
          nonZeroBattery: d.nonZeroBattery,
          nonZeroGrid: d.nonZeroGrid,
          nonZeroLoad: d.nonZeroLoad,
          minSoc: d.minSoc,
          maxSoc: d.maxSoc,
        })),
      },
      null,
      2
    )
  );
  console.log(`\n[COMPLETE] Forensic audit data saved to: ${auditReportPath}`);
}

audit().catch(console.error);
