const fs = require('node:fs/promises'),
  path = require('node:path'),
  crypto = require('node:crypto'),
  mysql = require('mysql2/promise');
const { options } = require('../src/config/db');
const { loadEnv } = require('../src/config/env');
async function migrate(env, credentials) {
  const user = credentials?.user || process.env.MIGRATION_DB_USER,
    password = credentials?.password ?? process.env.MIGRATION_DB_PASSWORD;
  if (!user || password === undefined)
    throw new Error('MIGRATION_DB_USER and MIGRATION_DB_PASSWORD are required');
  const c = await mysql.createConnection({
    ...options(env),
    user,
    password,
    multipleStatements: true,
  });
  let locked = false;
  try {
    await c.query("SET time_zone='+00:00'");
    const [[lock]] = await c.query('SELECT GET_LOCK(?,10) AS acquired', [
      'ojt_migrate_' + env.DB_NAME,
    ]);
    if (!lock.acquired) throw new Error('Migration lock unavailable');
    locked = true;
    await c.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,version VARCHAR(150) NOT NULL UNIQUE,checksum CHAR(64) NOT NULL,applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
    );
    const dir = path.resolve(__dirname, '../../database/migrations');
    for (const version of (await fs.readdir(dir)).filter((x) => /^\d{3}-.+\.sql$/.test(x)).sort()) {
      const sql = await fs.readFile(path.join(dir, version), 'utf8'),
        checksum = crypto.createHash('sha256').update(sql).digest('hex');
      const [[old]] = await c.execute('SELECT checksum FROM schema_migrations WHERE version=?', [
        version,
      ]);
      if (old) {
        if (old.checksum !== checksum)
          throw new Error('Applied migration checksum changed: ' + version);
        continue;
      }
      try {
        await c.query(sql);
        await c.execute('INSERT INTO schema_migrations (version,checksum) VALUES (?,?)', [
          version,
          checksum,
        ]);
        console.log('Applied ' + version);
      } catch (e) {
        throw new Error(
          'Migration failed: ' +
            version +
            ' (' +
            e.code +
            '). Inspect partial DDL and apply a forward repair; no tables were auto-dropped.',
        );
      }
    }
  } finally {
    if (locked) await c.query('SELECT RELEASE_LOCK(?)', ['ojt_migrate_' + env.DB_NAME]);
    await c.end();
  }
}
if (require.main === module)
  migrate(loadEnv(process.argv.includes('--test') ? '.env.test' : '.env')).catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
module.exports = { migrate };
