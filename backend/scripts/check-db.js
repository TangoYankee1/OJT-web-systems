const { loadEnv } = require('../src/config/env');
const { createPool } = require('../src/config/db');
(async () => {
  const pool = createPool(loadEnv());
  try {
    const [r] = await pool.query(
      'SELECT VERSION() AS version,@@sql_mode AS sqlMode,@@session.time_zone AS timeZone',
    );
    await pool.query('SELECT session_id FROM sessions LIMIT 0');
    console.log(JSON.stringify({ ready: true, ...r[0] }));
  } finally {
    await pool.end();
  }
})().catch((e) => {
  console.error('Database readiness failed: ' + (e.code || e.message));
  process.exitCode = 1;
});
