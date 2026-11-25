/**
 * Power2Go SolisCloud Collector Guardian & Process Manager
 * ---------------------------------------------------------
 * - Manages both `solis_auto_daemon.js` and `solis_bms_logger_daemon.js` as resilient child processes
 * - Redirects stdout/stderr to respective logs
 * - Auto-restarts on unexpected crashes or network exits
 * - Tracks PIDs to prevent duplicate runs
 */

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT_DIR = __dirname;
const LOGS_DIR = path.join(ROOT_DIR, "logs");
const GUARDIAN_PID_FILE = path.join(LOGS_DIR, "guardian.pid");
const COLLECTOR_PID_FILE = path.join(LOGS_DIR, "collector.pid");
const BMS_PID_FILE = path.join(LOGS_DIR, "solis_bms_logger.pid");

const COLLECTOR_LOG = path.join(LOGS_DIR, "solis_collector.log");
const BMS_LOG = path.join(LOGS_DIR, "solis_bms_logger.log");

const SCRIPT_AUTO_DAEMON = path.join(ROOT_DIR, "solis_auto_daemon.js");
const SCRIPT_BMS_LOGGER = path.join(ROOT_DIR, "solis_bms_logger_daemon.js");

if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

function writeLog(logFile, message) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  const line = `[${ts} PKT-Guardian] ${message}\n`;
  try {
    fs.appendFileSync(logFile, line, "utf8");
    console.log(line.trim());
  } catch (e) {
    console.error("Error writing to log:", e);
  }
}

// Single Guardian check
if (fs.existsSync(GUARDIAN_PID_FILE)) {
  try {
    const existingPid = parseInt(fs.readFileSync(GUARDIAN_PID_FILE, "utf8").trim(), 10);
    if (existingPid && !isNaN(existingPid)) {
      let isRunning = false;
      try {
        process.kill(existingPid, 0);
        isRunning = true;
      } catch (e) {}

      if (isRunning && existingPid !== process.pid) {
        console.log(`Existing Guardian already running with PID ${existingPid}. Exiting.`);
        process.exit(0);
      }
    }
  } catch (err) {}
}

fs.writeFileSync(GUARDIAN_PID_FILE, process.pid.toString(), "utf8");

let isShuttingDown = false;

// Managed Services
const services = [
  {
    name: "Solis Main Collector",
    script: SCRIPT_AUTO_DAEMON,
    logFile: COLLECTOR_LOG,
    pidFile: COLLECTOR_PID_FILE,
    child: null,
    restartCount: 0
  },
  {
    name: "Solis BMS Logger (5-min)",
    script: SCRIPT_BMS_LOGGER,
    logFile: BMS_LOG,
    pidFile: BMS_PID_FILE,
    child: null,
    restartCount: 0
  }
];

function startService(svc) {
  if (isShuttingDown) return;

  writeLog(svc.logFile, `Starting ${svc.name} child process (attempt #${svc.restartCount + 1})...`);

  const child = spawn(process.execPath, [svc.script], {
    cwd: ROOT_DIR,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
  });

  svc.child = child;

  // Record child PID
  try {
    fs.writeFileSync(svc.pidFile, child.pid.toString(), "utf8");
  } catch (e) {}

  child.stdout.on("data", (data) => {
    try {
      fs.appendFileSync(svc.logFile, data);
      process.stdout.write(`[${svc.name}] ${data}`);
    } catch (e) {}
  });

  child.stderr.on("data", (data) => {
    try {
      fs.appendFileSync(svc.logFile, data);
      process.stderr.write(`[${svc.name} ERR] ${data}`);
    } catch (e) {}
  });

  child.on("exit", (code, signal) => {
    writeLog(svc.logFile, `${svc.name} exited with code ${code}, signal ${signal}.`);
    svc.child = null;

    if (!isShuttingDown) {
      svc.restartCount++;
      const delay = Math.min(30000, 5000 * Math.min(svc.restartCount, 6));
      writeLog(svc.logFile, `Auto-restarting ${svc.name} in ${delay / 1000} seconds...`);
      setTimeout(() => startService(svc), delay);
    }
  });

  child.on("error", (err) => {
    writeLog(svc.logFile, `Failed to start ${svc.name}: ${err.message}`);
  });
}

function handleShutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log("Guardian shutting down, terminating child processes...");

  services.forEach((svc) => {
    if (svc.child) {
      try {
        svc.child.kill("SIGTERM");
      } catch (e) {}
    }
    try {
      if (fs.existsSync(svc.pidFile)) fs.unlinkSync(svc.pidFile);
    } catch (e) {}
  });

  try {
    if (fs.existsSync(GUARDIAN_PID_FILE)) fs.unlinkSync(GUARDIAN_PID_FILE);
  } catch (e) {}

  setTimeout(() => process.exit(0), 1000);
}

process.on("SIGINT", handleShutdown);
process.on("SIGTERM", handleShutdown);

console.log("==========================================================");
console.log("  Power2Go Solis Unified Collector Guardian Active");
console.log(`  Directory: ${ROOT_DIR}`);
console.log(`  Guardian PID: ${process.pid}`);
console.log("==========================================================");

// Start both supervised services
services.forEach((svc) => startService(svc));
