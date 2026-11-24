const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.jimlvgbbgomrhaqrzllx:Abdul1367453390@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;");
  console.log('Tables:', tables.rows.map(r => r.table_name));

  const latest = await client.query("SELECT * FROM solis_telemetry_latest WHERE station_name ILIKE '%Menu%' OR station_id = '1298491919450797504';");
  console.log('Telemetry Latest for Menu Karachi:');
  console.log(JSON.stringify(latest.rows[0], null, 2));

  const curve = await client.query("SELECT * FROM solis_battery_power_curve WHERE station_id = '1298491919450797504' AND curve_date >= CURRENT_DATE - 1 ORDER BY curve_date DESC, time_str DESC LIMIT 5;");
  console.log('Recent curve records:');
  console.log(curve.rows);

  // Check if there is an inverter or battery table or device details table
  for (const t of ['solis_inverters', 'solis_devices', 'solis_batteries', 'solis_dataloggers']) {
    try {
      const res = await client.query(`SELECT * FROM ${t} LIMIT 5;`);
      console.log(`Table ${t} rows:`, res.rows.length);
    } catch(e) {
      // not exists
    }
  }

  await client.end();
}

run().catch(console.error);
