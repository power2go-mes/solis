const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.jimlvgbbgomrhaqrzllx:Abdul1367453390@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const lat = await pool.query('SELECT * FROM solis_telemetry_latest LIMIT 3');
    console.log('LATEST TABLE SAMPLE (solis_telemetry_latest):', lat.rows);

    const deCols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'solis_daily_energy'");
    console.log('solis_daily_energy COLS:', deCols.rows.map(r => r.column_name));

    const de = await pool.query('SELECT * FROM solis_daily_energy ORDER BY id DESC LIMIT 5');
    console.log('LATEST solis_daily_energy ENTRIES:', de.rows);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
