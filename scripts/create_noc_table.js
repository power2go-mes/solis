const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.jimlvgbbgomrhaqrzllx:Abdul1367453390@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS noc_incidents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        station_id TEXT NOT NULL,
        station_name TEXT NOT NULL,
        severity VARCHAR(10) NOT NULL CHECK (severity IN ('P0', 'P1', 'P2')),
        category VARCHAR(50) NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(25) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'ACKNOWLEDGED', 'RESOLVED')),
        acknowledged_by TEXT,
        acknowledged_at TIMESTAMP WITH TIME ZONE,
        resolved_by TEXT,
        resolved_at TIMESTAMP WITH TIME ZONE,
        resolution_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_noc_incidents_status ON noc_incidents(status);
      CREATE INDEX IF NOT EXISTS idx_noc_incidents_station ON noc_incidents(station_id);
    `);
    console.log('✅ TABLE_READY: noc_incidents table successfully created/verified');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration Error:', err);
    process.exit(1);
  }
}

runMigration();
