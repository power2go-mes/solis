const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/DATABASE_URL=([^\r\n]+)/);
const { Pool } = require('pg');
const pool = new Pool({ connectionString: match[1] });

async function audit() {
  console.log('=== VERIFICATION AUDIT FOR 5 ACTIVE PLANTS IN SUPABASE ===\n');

  console.log('1. solis_telemetry_latest (Active plants only):');
  const lat = await pool.query(`
    SELECT station_id, station_name, solar_power_kw, battery_soc, battery_power_kw, battery_direction, grid_power_kw 
    FROM solis_telemetry_latest 
    ORDER BY station_name
  `);
  console.table(lat.rows);

  console.log('\n2. solis_battery_power_curve (5-Minute Power Curves in Supabase):');
  const cur = await pool.query(`
    SELECT station_id, count(*), MIN(curve_date)::text as min_date, MAX(curve_date)::text as max_date 
    FROM solis_battery_power_curve 
    GROUP BY station_id 
    ORDER BY station_id
  `);
  console.table(cur.rows);

  console.log('\n3. solis_daily_energy (Lifetime Day-1 to Today for All Plants):');
  const dly = await pool.query(`
    SELECT station_id, 
           count(*) as days_recorded, 
           MIN(energy_date)::text as day_01, 
           MAX(energy_date)::text as latest_day, 
           SUM(solar_pv_kwh)::numeric(12,1) as total_solar_kwh, 
           SUM(battery_charge_kwh)::numeric(12,1) as total_battery_charge_kwh, 
           SUM(battery_discharge_kwh)::numeric(12,1) as total_battery_discharge_kwh 
    FROM solis_daily_energy 
    GROUP BY station_id 
    ORDER BY station_id
  `);
  console.table(dly.rows);

  console.log('\n4. Verification: P2G 15KW and P2G 20kw completely removed across all tables:');
  const tables = [
    'solis_telemetry_latest',
    'solis_telemetry',
    'solis_bms_telemetry',
    'solis_alarm_logs',
    'solis_battery_power_curve',
    'solis_daily_energy'
  ];
  for (const t of tables) {
    const res = await pool.query(
      `SELECT count(*) FROM "${t}" WHERE station_id IN ('1298491919450734544', '1298491919450851319')`
    );
    console.log(`  Table ${t}: ${res.rows[0].count} rows remaining (Expected: 0)`);
  }

  await pool.end();
}

audit().catch(console.error);
