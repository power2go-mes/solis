/**
 * Power2Go SolisCloud Collector Guardian & Process Manager
 * ---------------------------------------------------------
 * - Runs solis_auto_daemon.js as a resilient child process
 * - Redirects stdout/stderr to logs/solis_collector.log
 * - Auto-restarts on unexpected crashes or network exits
 * - Tracks PID in logs/collector.pid to prevent duplicate runs
 */

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT_DIR = __dirname;
const LOGS_DIR = path.join(ROOT_DIR, "logs");
const LOG_FILE = path.join(LOGS_DIR, "solis_collector.log");
const PID_FILE = path.join(LOGS_DIR, "collector.pid");
const DAEMON_SCRIPT = path.join(ROOT_DIR, "solis_auto_daemon.js");

if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

function writeLog(message) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  const line = `[${ts} PKT-Guardian] ${message}\n`;
  try {
    fs.appendFileSync(LOG_FILE, line, "utf8");
    console.log(line.trim());
  } catch (e) {
    console.error("Error writing to log:", e);
  }
}

// Check if another instance is already running
if (fs.existsSync(PID_FILE)) {
  try {
    const existingPid = parseInt(fs.readFileSync(PID_FILE, "utf8").trim(), 10);
    if (existingPid && !isNaN(existingPid)) {
      // Check if process exists
      let isRunning = false;
      try {
        process.kill(existingPid, 0);
        isRunning = true;
      } catch (e) {
        isRunning = false;
      }

      if (isRunning) {
        writeLog(`Existing Solis Collector instance already running with PID ${existingPid}. Exiting guardian.`);
        process.exit(0);
      }
    }
  } catch (err) {
    // Ignore invalid PID file
  }
}

// Write current guardian PID
fs.writeFileSync(PID_FILE, process.pid.toString(), "utf8");

let child = null;
let restartCount = 0;
let isShuttingDown = false;

function startChild() {
  if (isShuttingDown) return;

  writeLog(`Starting Solis Daemon child process (attempt #${restartCount + 1})...`);

  child = spawn(process.execPath, [DAEMON_SCRIPT], {
    cwd: ROOT_DIR,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
  });

  child.stdout.on("data", (data) => {
    try {
      fs.appendFileSync(LOG_FILE, data);
      process.stdout.write(data);
    } catch (e) {}
  });

  child.stderr.on("data", (data) => {
    try {
      fs.appendFileSync(LOG_FILE, data);
      process.stderr.write(data);
    } catch (e) {}
  });

  child.on("exit", (code, signal) => {
    writeLog(`Child daemon process exited with code ${code}, signal ${signal}.`);
    child = null;

    if (!isShuttingDown) {
      restartCount++;
      const delay = Math.min(30000, 5000 * Math.min(restartCount, 6));
      writeLog(`Auto-restarting in ${delay / 1000} seconds...`);
      setTimeout(startChild, delay);
    }
  });

  child.on("error", (err) => {
    writeLog(`Failed to start child daemon process: ${err.message}`);
  });
}

// Clean shutdown handlers
function handleShutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  writeLog("Guardian shutting down, terminating child daemon...");

  if (child) {
    try {
      child.kill("SIGTERM");
    } catch (e) {}
  }

  try {
    if (fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE);
    }
  } catch (e) {}

  setTimeout(() => process.exit(0), 1000);
}

process.on("SIGINT", handleShutdown);
process.on("SIGTERM", handleShutdown);
process.on("exit", () => {
  try {
    if (fs.existsSync(PID_FILE)) {
      const recordedPid = fs.readFileSync(PID_FILE, "utf8").trim();
      if (recordedPid === process.pid.toString()) {
        fs.unlinkSync(PID_FILE);
      }
    }
  } catch (e) {}
});

writeLog("==========================================================");
writeLog("  Power2Go Solis Collector Guardian Active");
writeLog(`  Directory: ${ROOT_DIR}`);
writeLog(`  Logging to: ${LOG_FILE}`);
writeLog("==========================================================");

startChild();
