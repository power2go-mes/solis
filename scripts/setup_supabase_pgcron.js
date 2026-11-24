const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.jimlvgbbgomrhaqrzllx:Abdul1367453390@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function setupSupabaseCron() {
  try {
    // 1. Unschedule any prior job
    await pool.query(`
      DO $$
      BEGIN
        PERFORM cron.unschedule('p2g-solis-10min-sync');
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END $$;
    `);

    // 2. Schedule 10-minute sync directly via pg_cron + pg_net
    await pool.query(`
      SELECT cron.schedule(
        'p2g-solis-10min-sync',
        '*/10 * * * *',
        $cron$
        SELECT net.http_get(
          url := 'https://power2go-knock.vercel.app/api/cron/sync-live'
        );
        $cron$
      );
    `);

    const res = await pool.query('SELECT jobid, jobname, schedule, active FROM cron.job;');
    console.log('✅ SUPABASE_PG_CRON_ACTIVE:', JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('❌ CRON_SETUP_ERROR:', err);
    process.exit(1);
  }
}

setupSupabaseCron();
