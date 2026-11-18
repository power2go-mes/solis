const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/DATABASE_URL=([^\r\n]+)/);
const { Pool } = require('pg');
const pool = new Pool({ connectionString: match[1] });

const REMOVE_IDS = ['1298491919450734544', '1298491919450851319'];

async function run() {
  console.log("Checking and deleting P2G 15KW and P2G 20kw from database...");
  const tables = [
    'solis_telemetry_latest',
    'solis_telemetry',
    'solis_bms_telemetry',
    'solis_alarm_logs',
    'solis_battery_power_curve',
    'solis_daily_energy'
  ];

  for (const t of tables) {
    try {
      const countRes = await pool.query(
        `SELECT count(*) FROM ${t} WHERE station_id = ANY($1)`,
        [REMOVE_IDS]
      );
      const count = countRes.rows[0].count;
      console.log(`Table ${t}: found ${count} rows to delete`);
      if (parseInt(count) > 0) {
        await pool.query(
          `DELETE FROM ${t} WHERE station_id = ANY($1)`,
          [REMOVE_IDS]
        );
        console.log(`Table ${t}: successfully deleted ${count} rows`);
      }
    } catch (err) {
      console.error(`Table ${t} error:`, err.message);
    }
  }

  // Also check if any other tables exist with station_id or plant_id
  const tableCheck = await pool.query(`
    SELECT table_name, column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND column_name IN ('station_id', 'plant_id')
      AND table_name NOT LIKE 'pg_%'
  `);
  
  for (const row of tableCheck.rows) {
    if (!tables.includes(row.table_name)) {
      try {
        const cRes = await pool.query(
          `SELECT count(*) FROM "${row.table_name}" WHERE "${row.column_name}" = ANY($1)`,
          [REMOVE_IDS]
        );
        console.log(`Extra table ${row.table_name} (${row.column_name}): ${cRes.rows[0].count} rows`);
        if (parseInt(cRes.rows[0].count) > 0) {
          await pool.query(
            `DELETE FROM "${row.table_name}" WHERE "${row.column_name}" = ANY($1)`,
            [REMOVE_IDS]
          );
          console.log(`Extra table ${row.table_name}: deleted`);
        }
      } catch (e) {
        console.log(`Extra table check error on ${row.table_name}:`, e.message);
      }
    }
  }

  console.log("\nVerifying remaining stations in solis_telemetry_latest:");
  const remaining = await pool.query(`SELECT station_id, station_name FROM solis_telemetry_latest ORDER BY station_name`);
  console.table(remaining.rows);

  await pool.end();
}

run().catch(console.error);
