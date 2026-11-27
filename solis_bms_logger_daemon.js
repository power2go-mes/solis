/**
 * Dedicated Solis BMS Raw Cell & Temperature 5-Minute Continuous Logger
 * Logs actual live hardware registers:
 * - bmsTemp (Average BMS temperature)
 * - bmsMinTemp, bmsMaxTemp
 * - bmsMintempLocStr, bmsMaxtempLocStr (exact raw coordinates, e.g. 0-0-220, 0-0-112)
 * - bmsMinU, bmsMaxU (minimum & maximum cell voltages)
 * - bmsMinuLocStr, bmsMaxuLocStr
 * - Pack voltage, current, power, SOC, SOH, and error codes
 *
 * Saves directly into Supabase table: solis_bms_telemetry
 * Includes strict single-instance PID protection.
 */

const https = require("https");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const ROOT_DIR = __dirname;
const LOGS_DIR = path.join(ROOT_DIR, "logs");
const HEARTBEAT_FILE = path.join(LOGS_DIR, "solis_bms_logger.heartbeat");
const PID_FILE = path.join(LOGS_DIR, "solis_bms_logger.pid");
// Max age (ms) for the heartbeat — if older than this, the previous instance is considered dead.
// Set to 3× the collection interval (5 min) = 15 minutes.
const HEARTBEAT_MAX_AGE_MS = 15 * 60 * 1000;

if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Single-instance protection via process check + heartbeat
if (fs.existsSync(HEARTBEAT_FILE)) {
  try {
    const hb = JSON.parse(fs.readFileSync(HEARTBEAT_FILE, "utf8").trim());
    let isAlive = false;
    if (hb.pid) {
      try {
        process.kill(hb.pid, 0);
        isAlive = true;
      } catch (e) {
        isAlive = false;
      }
    }
    const ageMs = Date.now() - hb.ts;
    if (isAlive && ageMs < HEARTBEAT_MAX_AGE_MS) {
      console.log(`[SingleInstance] BMS Logger is actively running (PID ${hb.pid}). Exiting.`);
      process.exit(0);
    } else {
      console.log(`[SingleInstance] Previous process (PID ${hb.pid}) is not running. Taking over.`);
    }
  } catch (e) {
    // Corrupted heartbeat — ignore and continue
  }
}

// Write initial heartbeat + PID
function writeHeartbeat() {
  try {
    fs.writeFileSync(HEARTBEAT_FILE, JSON.stringify({ ts: Date.now(), pid: process.pid }), "utf8");
    fs.writeFileSync(PID_FILE, process.pid.toString(), "utf8");
  } catch (e) {}
}

function cleanHeartbeat() {
  try {
    // Only remove files if they still record our PID
    if (fs.existsSync(HEARTBEAT_FILE)) {
      const hb = JSON.parse(fs.readFileSync(HEARTBEAT_FILE, "utf8"));
      if (hb.pid === process.pid) fs.unlinkSync(HEARTBEAT_FILE);
    }
    if (fs.existsSync(PID_FILE) && fs.readFileSync(PID_FILE, "utf8").trim() === process.pid.toString()) {
      fs.unlinkSync(PID_FILE);
    }
  } catch (e) {}
}

writeHeartbeat();
// Refresh heartbeat every 60s so the next instance knows we're alive
const heartbeatTimer = setInterval(writeHeartbeat, 60_000);

process.on("exit", () => { clearInterval(heartbeatTimer); cleanHeartbeat(); });
process.on("SIGINT", () => { clearInterval(heartbeatTimer); cleanHeartbeat(); process.exit(0); });
process.on("SIGTERM", () => { clearInterval(heartbeatTimer); cleanHeartbeat(); process.exit(0); });

const SOLIS_HMAC_SECRET = "5704383536604a8bb94c83ebc059aa8c";
const SOLIS_KEY_ID = "2424";
let sessionCookie = null;

// Read Database URL
let dbUrl = process.env.DATABASE_URL;
if (!dbUrl && fs.existsSync(path.join(__dirname, ".env.local"))) {
  fs.readFileSync(path.join(__dirname, ".env.local"), "utf8")
    .split("\n")
    .forEach((line) => {
      if (line.startsWith("DATABASE_URL=")) {
        dbUrl = line.split("=")[1].trim();
      }
    });
}
if (dbUrl && dbUrl.includes("pooler.supabase.com:5432")) {
  dbUrl = dbUrl.replace("pooler.supabase.com:5432", "pooler.supabase.com:6543");
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
});

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

    const req = https.request(
      "https://www.soliscloud.com" + apiPath,
      { method: "POST", headers, timeout: 25000 },
      (res) => {
        if (res.headers["set-cookie"]) {
          sessionCookie = res.headers["set-cookie"].map((c) => c.split(";")[0]).join("; ");
        }
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve({ raw: data });
          }
        });
      }
    );
    req.on("error", reject);
    req.write(bodyStr);
    req.end();
  });
}

async function ensureLogin() {
  const passMd5 = crypto.createHash("md5").update("POWER2GO").digest("hex");
  await solisPost("/api/user/login2", {
    userInfo: "Qasim Moosvi",
    passWord: passMd5,
    yingZhenType: 1,
    localTime: Date.now(),
    localTimeZone: 5,
    language: "2",
  });
}

// Plant Fleet Registry
const FLEET_PLANTS = [
  { name: "Menu Karachi Office", stationId: "1298491919450797504", inverters: ["1053050258180057", "1053050258140015"] },
  { name: "OPL Residence", stationId: "1298491919450958553", inverters: ["1053050258110159"] },
  { name: "36 Chenab", stationId: "1298491919450873747", inverters: ["1053010259280019"] },
  { name: "Towfiq chinoy", stationId: "1298491919451014032", inverters: ["1053050258180112"] },
  { name: "P2G 50KW", stationId: "1298491919450740581", inverters: ["1053050255210107"] },
  { name: "P2G 1ST 6kw", stationId: "1298491919450840394", inverters: ["1031731257050184"] },
  { name: "P2G 20kw", stationId: "1298491919450851319", inverters: ["1033161256090193"] },
  { name: "P2G 15KW", stationId: "1298491919450734544", inverters: ["1033320253150969"] },
];

let isCycleRunning = false;

async function collectBmsTelemetryCycle() {
  if (isCycleRunning) {
    console.log(`[${new Date().toISOString()}] BMS Collection Cycle already in progress, skipping.`);
    return;
  }
  isCycleRunning = true;
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] --- Starting 5-Minute BMS Telemetry Log Cycle ---`);

  try {
    await ensureLogin();

    let totalRacksLogged = 0;

    for (const plant of FLEET_PLANTS) {
      for (const sn of plant.inverters) {
        try {
          const invRes = await solisPost("/api/inverter/detail", { sn });
          const bList = invRes.data?.batteryList || [];

          for (const b of bList) {
            const minV = b.bmsMinU !== undefined ? Number(b.bmsMinU) : null;
            const maxV = b.bmsMaxU !== undefined ? Number(b.bmsMaxU) : null;
            const deltaMv = (minV !== null && maxV !== null) ? Math.round((maxV - minV) * 1000) : null;

            const query = `
              INSERT INTO solis_bms_telemetry (
                station_id, inverter_sn, battery_sn,
                soc_percent, soh_percent, bms_state, bms_alarm,
                failure_info_01, failure_info_02, loop_cycles,
                battery_voltage, battery_current, bms_power_kw,
                charging_voltage_target, charge_current_limit,
                discharge_current_limit, discharge_cutoff_voltage,
                min_cell_voltage, max_cell_voltage, cell_voltage_delta_mv,
                min_cell_location, max_cell_location,
                avg_temp_c, min_temp_c, max_temp_c,
                min_temp_location, max_temp_location,
                module_count, string_count, capacity_ah, rated_kwh,
                battery_type, discharge_cutoff_soc, charge_reserve_soc,
                uvp_protection_v, ovp_protection_v, fcv_float_v, acv_absorption_v,
                raw, recorded_at
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
                $31, $32, $33, $34, $35, $36, $37, $38, $39, NOW()
              )
            `;

            const values = [
              plant.stationId,
              sn,
              b.batterySn || `${sn}BAT01`,
              b.batteryCapacitySoc ?? 0,
              b.batteryHealthSoh ?? 100,
              b.bmsBmsState ?? b.bmsState ?? 0,
              Number(b.batteryAlarm ?? 0),
              String(b.batteryFailureInformation01 ?? "0"),
              String(b.batteryFailureInformation02 ?? "0"),
              b.bmsLoopNum ?? 0,
              b.storageBatteryVoltage || b.batteryVoltage || 0,
              b.bstteryCurrent || b.storageBatteryCurrent || 0,
              b.batteryPowerBms !== undefined ? (Number(b.batteryPowerBms) / 1000) : 0,
              b.batteryChargingVoltage ?? 0,
              b.batteryChargingCurrent ?? 0,
              b.batteryDischargeLimiting ?? 0,
              b.bmsDischargeU ?? 0,
              minV,
              maxV,
              deltaMv,
              b.bmsMinuLocStr || "0-0-0",
              b.bmsMaxuLocStr || "0-0-0",
              b.bmsTemp !== undefined ? Number(b.bmsTemp) : null,
              b.bmsMinTemp !== undefined ? Number(b.bmsMinTemp) : null,
              b.bmsMaxTemp !== undefined ? Number(b.bmsMaxTemp) : null,
              b.bmsMintempLocStr || "0-0-0",
              b.bmsMaxtempLocStr || "0-0-0",
              b.bmsMNum ?? 9,
              b.bmsStrNum ?? 24,
              b.bmsCapacityTotal ?? 100,
              b.capacity ?? 45,
              b.batteryTypeName || "PYLON_HV",
              b.socDischargeSet ?? 20,
              b.socChargingSet ?? 10,
              b.batteryUvpSet ?? 150,
              b.batteryOvpSet ?? 800,
              b.batteryFcvSet ?? 590,
              b.batteryAcvSet ?? 800,
              JSON.stringify(b)
            ];

            await pool.query(query, values);
            totalRacksLogged++;
            console.log(`  ✓ Logged: ${plant.name} | Rack: ${b.batterySn || sn} | Min: ${b.bmsMinTemp}°C (${b.bmsMintempLocStr}) | Max: ${b.bmsMaxTemp}°C (${b.bmsMaxtempLocStr}) | Avg: ${b.bmsTemp}°C`);
          }
        } catch (invErr) {
          console.error(`  ✗ Error querying inverter ${sn} for ${plant.name}:`, invErr.message);
        }
      }
    }

    console.log(`[${new Date().toISOString()}] Successfully logged ${totalRacksLogged} battery racks into Supabase solis_bms_telemetry.\n`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] BMS Collector Cycle Error:`, err.message);
  } finally {
    isCycleRunning = false;
  }
}

// Execute immediately on startup
collectBmsTelemetryCycle();

// Schedule repeat every 5 minutes (300,000 ms)
const INTERVAL_MS = 5 * 60 * 1000;
setInterval(collectBmsTelemetryCycle, INTERVAL_MS);

console.log(`Solis BMS Background Daemon active with single-instance protection. Interval: 5 minutes (${INTERVAL_MS} ms). PID: ${process.pid}`);
