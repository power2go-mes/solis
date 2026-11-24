const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split('\n');
let dbUrl = '';
for (const line of lines) {
  if (line.startsWith('DATABASE_URL=')) {
    dbUrl = line.replace('DATABASE_URL=', '').trim().replace(/^["']|["']$/g, '');
    break;
  }
}

const { Pool } = require('pg');
const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function run() {
  const client = await pool.connect();
  try {
    const plants = await client.query('SELECT plant_id, plant_name, create_date FROM solis_plants');
    console.log('ALL PLANTS:');
    plants.rows.forEach(p => console.log('  ID: ' + p.plant_id + ' | Name: ' + p.plant_name));

    const chenab = plants.rows.filter(p => p.plant_name.toLowerCase().includes('chenab') || p.plant_name.toLowerCase().includes('chanab') || p.plant_name.includes('36'));
    console.log('\nMATCHED CHENAB:');
    console.log(chenab);

    if (chenab.length > 0) {
      const pid = chenab[0].plant_id;
      const invs = await client.query('SELECT inverter_sn, model, rated_power_kw, commissioned_date FROM solis_inverters WHERE plant_id = $1', [pid]);
      console.log('\nINVERTERS AT CHENAB:', invs.rows);
    }
  } finally {
    client.release();
    pool.end();
  }
}

run().catch(console.error);
