const fs = require('fs');
let dbUrl = '';
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
  if (line.startsWith('DATABASE_URL=')) dbUrl = line.split('=')[1].trim();
});
if (dbUrl.includes('pooler.supabase.com:5432')) dbUrl = dbUrl.replace('pooler.supabase.com:5432', 'pooler.supabase.com:6543');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS solis_inverter_day_curve (
      id BIGSERIAL PRIMARY KEY,
      inverter_sn TEXT NOT NULL,
      curve_date DATE NOT NULL,
      time_str TEXT NOT NULL,
      pac_kw NUMERIC DEFAULT 0,
      battery_power_kw NUMERIC DEFAULT 0,
      battery_soc NUMERIC DEFAULT 0,
      battery_voltage NUMERIC DEFAULT 0,
      inverter_temp_c NUMERIC DEFAULT 0,
      e_today NUMERIC DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(inverter_sn, curve_date, time_str)
    );
    CREATE INDEX IF NOT EXISTS idx_solis_inverter_day_curve_sn_date ON solis_inverter_day_curve(inverter_sn, curve_date);
  `);
  console.log('solis_inverter_day_curve table created/verified successfully!');
  pool.end();
}
init().catch(console.error);
