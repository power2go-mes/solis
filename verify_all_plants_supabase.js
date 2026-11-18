const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

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
const connectionString = process.env.SUPABASE_DB_URL || localEnv.SUPABASE_DB_URL;

async function verify() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log("=================================================================");
  console.log("      SUPABASE DATABASE VERIFICATION ACROSS ALL 7 PLANTS");
  console.log("=================================================================\n");

  // 1. solis_telemetry_latest
  const latestRes = await client.query(`
    SELECT station_id, station_name, location, installed_capacity_kw, inverter_sn, 
           battery_soc, battery_power_kw, solar_power_kw, grid_power_kw, load_power_kw, updated_at
    FROM solis_telemetry_latest
    ORDER BY station_name
  `);
  console.log(`--- [1] solis_telemetry_latest (${latestRes.rows.length} Plants Synchronized) ---`);
  latestRes.rows.forEach((r, idx) => {
    console.log(`[${idx + 1}] ${r.station_name} (${r.station_id})`);
    console.log(`    Capacity: ${r.installed_capacity_kw} kWp | Inverter: ${r.inverter_sn}`);
    console.log(`    Live Telemetry: Solar=${r.solar_power_kw} kW | Battery SOC=${r.battery_soc}% (${r.battery_power_kw} kW) | Grid=${r.grid_power_kw} kW | Load=${r.load_power_kw} kW`);
    console.log(`    Updated At: ${r.updated_at.toISOString()}`);
  });

  // 2. Counts per table per station
  console.log("\n--- [2] Stored Records Distribution per Table ---");
  const tables = [
    { name: "solis_telemetry", label: "Telemetry Snapshots" },
    { name: "solis_bms_telemetry", label: "BMS Diagnostic Records" },
    { name: "solis_alarm_logs", label: "Alarm / Fault Logs" },
    { name: "solis_battery_power_curve", label: "5-Min Power Curve Points" },
    { name: "solis_daily_energy", label: "Daily Energy Ledger Days" },
  ];

  for (const t of tables) {
    const res = await client.query(`
      SELECT station_id, COUNT(*) as cnt
      FROM ${t.name}
      GROUP BY station_id
      ORDER BY station_id
    `);
    console.log(`\nTable '${t.name}' (${t.label}):`);
    res.rows.forEach(r => {
      console.log(`  - Plant ${r.station_id}: ${r.cnt} records`);
    });
  }

  // 3. Alarm deduplication check
  console.log("\n--- [3] Alarm Deduplication & Uniqueness Verification ---");
  const dupesRes = await client.query(`
    SELECT alarm_pk, COUNT(*) 
    FROM solis_alarm_logs 
    GROUP BY alarm_pk 
    HAVING COUNT(*) > 1
  `);
  console.log(`Duplicate alarm_pk count: ${dupesRes.rows.length} (Must be 0)`);

  await client.end();
}

verify().catch(console.error);
