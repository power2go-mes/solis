const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.jimlvgbbgomrhaqrzllx:Abdul1367453390@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const res = await pool.query("SELECT * FROM solis_bms_telemetry ORDER BY id DESC LIMIT 10");
    console.log("solis_bms_telemetry rows count:", res.rows.length);
    res.rows.forEach(r => {
      console.log(`SN: ${r.inverter_sn} | Station: ${r.station_name} | Min: ${r.bms_min_cell_voltage} | Max: ${r.bms_max_cell_voltage}`);
    });

    const telem = await pool.query("SELECT * FROM solis_telemetry_latest WHERE station_name ILIKE '%Chenab%'");
    console.log("Chenab in solis_telemetry_latest:", telem.rows[0]);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
