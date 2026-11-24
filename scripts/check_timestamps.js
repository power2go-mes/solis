const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.jimlvgbbgomrhaqrzllx:Abdul1367453390@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'solis_telemetry'");
    console.log("COLUMNS:", cols.rows.map(r => r.column_name));

    const t = await pool.query("SELECT * FROM solis_telemetry ORDER BY id DESC LIMIT 5");
    console.log("LATEST TELEMETRY ROWS:");
    t.rows.forEach(r => {
      console.log(`- ID: ${r.id}, Plant: ${r.plant_id || r.station_id || r.name}, Time: ${r.time || r.timestamp || r.record_time || r.datetime}, Created: ${r.created_at || r.inserted_at || r.updated_at}`);
    });
    console.log("RAW FIRST ROW:", JSON.stringify(t.rows[0], null, 2));

    const netRes = await pool.query("SELECT * FROM net._http_response ORDER BY id DESC LIMIT 5");
    console.log("LATEST NET RESPONSES:", netRes.rows);
  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    await pool.end();
  }
}

main();
