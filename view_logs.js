/**
 * View Saved Solis Telemetry, BMS & Alarm Logs from Supabase PostgreSQL
 */

const { Client } = require("pg");
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
const supabaseDbUrl = process.env.SUPABASE_DB_URL || localEnv.SUPABASE_DB_URL;

if (!supabaseDbUrl) {
  console.error("ERROR: SUPABASE_DB_URL is not configured in .env.test");
  process.exit(1);
}

async function viewLogs() {
  const client = new Client({
    connectionString: supabaseDbUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    // 1. Telemetry logs
    const countRes = await client.query("SELECT count(*) FROM solis_telemetry");
    const totalCount = countRes.rows[0].count;

    console.log("========================================================================================================================");
    console.log(`                             [1] SUPABASE STORED TELEMETRY LOGS (Total: ${totalCount} records)`);
    console.log("========================================================================================================================");

    const res = await client.query(`
      SELECT 
        id,
        TO_CHAR(recorded_at, 'YYYY-MM-DD HH24:MI:SS') as time,
        station_name,
        battery_soc || '%' as soc,
        battery_power_kw || ' kW' as batt_pwr,
        solar_power_kw || ' kW' as solar_pwr,
        grid_power_kw || ' kW' as grid_pwr,
        grid_direction,
        load_power_kw || ' kW' as load_pwr
      FROM solis_telemetry
      ORDER BY recorded_at DESC
      LIMIT 10;
    `);

    if (res.rows.length === 0) {
      console.log("No records found in table 'solis_telemetry'.");
    } else {
      console.table(res.rows);
    }

    // 2. BMS / BMU Logs
    console.log("\n========================================================================================================================");
    const bmsCountRes = await client.query("SELECT count(*) FROM solis_bms_telemetry");
    const totalBms = bmsCountRes.rows[0].count;
    console.log(`                        [2] SUPABASE STORED BMS / BMU CELL & HARDWARE LOGS (Total: ${totalBms} records)`);
    console.log("========================================================================================================================");

    const bmsRes = await client.query(`
      SELECT 
        id,
        TO_CHAR(recorded_at, 'YYYY-MM-DD HH24:MI:SS') as time,
        soc_percent || '%' as soc,
        soh_percent || '%' as soh,
        battery_voltage || ' V' as voltage,
        min_cell_voltage || ' V (' || min_cell_location || ')' as min_cell,
        max_cell_voltage || ' V (' || max_cell_location || ')' as max_cell,
        cell_voltage_delta_mv || ' mV' as delta,
        avg_temp_c || ' °C' as temp,
        module_count || ' mod' as modules,
        loop_cycles || ' cyc' as cycles
      FROM solis_bms_telemetry
      ORDER BY recorded_at DESC
      LIMIT 10;
    `);

    if (bmsRes.rows.length === 0) {
      console.log("No BMS records found in table 'solis_bms_telemetry'.");
    } else {
      console.table(bmsRes.rows);
    }

    // 3. Alarm Logs
    console.log("\n========================================================================================================================");
    const alarmCountRes = await client.query("SELECT count(*) FROM solis_alarm_logs");
    const totalAlarms = alarmCountRes.rows[0].count;
    console.log(`                            [3] SUPABASE STORED ALARM & BMS FAULT LOGS (Total: ${totalAlarms} records)`);
    console.log("========================================================================================================================");

    const alarmsRes = await client.query(`
      SELECT 
        id,
        alarm_code as code,
        alarm_msg as message,
        protection_category as category,
        protection_desc as classification,
        alarm_begin_time_str as start_time,
        alarm_duration_str as duration,
        state_str as status
      FROM solis_alarm_logs
      ORDER BY alarm_begin_time DESC
      LIMIT 15;
    `);

    if (alarmsRes.rows.length === 0) {
      console.log("No alarm records found in table 'solis_alarm_logs'.");
    } else {
      console.table(alarmsRes.rows);
    }

    // 4. Historical Battery Power Curve Points
    console.log("\n========================================================================================================================");
    const curveCountRes = await client.query("SELECT count(*) FROM solis_battery_power_curve");
    const totalCurve = curveCountRes.rows[0].count;
    console.log(`                 [4] SUPABASE STORED 5-MINUTE BATTERY POWER & GENERATION CURVE (Total: ${totalCurve} intervals)`);
    console.log("========================================================================================================================");

    const curveRes = await client.query(`
      SELECT 
        id,
        TO_CHAR(curve_date, 'YYYY-MM-DD') as date,
        time_str as time,
        battery_power_kw || ' kW' as batt_pwr,
        battery_state as state,
        battery_soc || '%' as soc,
        solar_power_kw || ' kW' as solar_pwr,
        grid_power_kw || ' kW' as grid_pwr,
        load_power_kw || ' kW' as load_pwr
      FROM solis_battery_power_curve
      ORDER BY curve_date DESC, timestamp_epoch DESC
      LIMIT 12;
    `);

    if (curveRes.rows.length === 0) {
      console.log("No curve intervals found in table 'solis_battery_power_curve'.");
    } else {
      console.table(curveRes.rows);
    }

    // 5. Historical Daily Energy Accounting (From Solis Monthly Audits)
    console.log("\n========================================================================================================================");
    const dailyCountRes = await client.query("SELECT count(*) FROM solis_daily_energy");
    const totalDaily = dailyCountRes.rows[0].count;
    console.log(`                     [5] SUPABASE STORED DAILY ENERGY ACCOUNTING (Total: ${totalDaily} days recorded)`);
    console.log("========================================================================================================================");

    const dailyRes = await client.query(`
      SELECT 
        id,
        TO_CHAR(energy_date, 'YYYY-MM-DD') as date,
        solar_pv_kwh || ' kWh' as solar,
        house_load_kwh || ' kWh' as load,
        battery_charge_kwh || ' kWh' as batt_charge,
        battery_discharge_kwh || ' kWh' as batt_discharge,
        grid_purchased_kwh || ' kWh' as grid_imported,
        grid_sold_kwh || ' kWh' as grid_exported,
        peak_sun_hours || ' h' as peak_sun
      FROM solis_daily_energy
      ORDER BY energy_date DESC
      LIMIT 10;
    `);

    if (dailyRes.rows.length === 0) {
      console.log("No daily energy records found in table 'solis_daily_energy'. Run 'node fetch_month.js' to sync.");
    } else {
      console.table(dailyRes.rows);
    }
    console.log("========================================================================================================================\n");
  } finally {
    await client.end();
  }
}

viewLogs().catch((err) => {
  console.error("Failed to query Supabase logs:", err.message);
  process.exit(1);
});
