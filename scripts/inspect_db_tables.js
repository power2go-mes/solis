const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.jimlvgbbgomrhaqrzllx:Abdul1367453390@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const t = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log("PUBLIC TABLES:", t.rows.map(r => r.table_name));

    for (const row of t.rows) {
      const name = row.table_name;
      try {
        const count = await pool.query(`SELECT count(*) FROM "${name}"`);
        console.log(`Table ${name}: count = ${count.rows[0].count}`);
      } catch (e) {
        console.log(`Table ${name} error: ${e.message}`);
      }
    }
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
