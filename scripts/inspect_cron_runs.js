const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.jimlvgbbgomrhaqrzllx:Abdul1367453390@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const jobs = await pool.query('SELECT jobid, jobname, schedule, active, command FROM cron.job');
    console.log('CRON JOBS:', jobs.rows);

    const runs = await pool.query('SELECT jobid, runid, status, return_message, start_time, end_time FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20');
    console.log('JOB RUNS:');
    for (const r of runs.rows) {
      console.log(`Job ${r.jobid} (${r.status}) at ${r.start_time ? r.start_time.toISOString() : 'null'} - Msg: ${r.return_message}`);
    }

    const net = await pool.query('SELECT id, status_code, error_msg, timed_out, created FROM net._http_response ORDER BY id DESC LIMIT 10');
    console.log('PG_NET HTTP RESPONSES:');
    for (const n of net.rows) {
      console.log(`Req ${n.id} status ${n.status_code} at ${n.created ? n.created.toISOString() : 'null'} - Err: ${n.error_msg}`);
    }
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
