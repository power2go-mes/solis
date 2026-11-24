const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.jimlvgbbgomrhaqrzllx:Abdul1367453390@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const de = await pool.query("SELECT station_id, energy_date, solar_pv_kwh, house_load_kwh, updated_at FROM solis_daily_energy WHERE updated_at >= NOW() - INTERVAL '24 hours' ORDER BY updated_at ASC");
    console.log("solis_daily_energy updates in last 24h count:", de.rows.length);
    de.rows.forEach(r => {
      console.log(`Station: ${r.station_id} | Date: ${r.energy_date ? r.energy_date.toISOString().slice(0, 10) : 'null'} | UpdatedAt: ${r.updated_at ? r.updated_at.toISOString() : 'null'}`);
    });
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
