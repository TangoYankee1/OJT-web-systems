const fs = require('node:fs/promises'),
  syncfs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto'),
  mysql = require('mysql2/promise'),
  { spawnSync } = require('node:child_process');
const { loadEnv, backendRoot, assertTest } = require('../src/config/env');
const { options } = require('../src/config/db');
const { arg } = require('./backup');
async function restore(
  env,
  input,
  targetDatabase,
  targetUploads,
  { clientPath = process.env.MYSQL_CLIENT_PATH || 'C:/xampp/mysql/bin/mysql.exe' } = {},
) {
  const target = {
    ...env,
    NODE_ENV: 'test',
    DB_NAME: targetDatabase,
    UPLOAD_ROOT: path.resolve(targetUploads),
  };
  assertTest(target);
  if (!/^[a-zA-Z0-9_]+_test$/.test(targetDatabase) || targetDatabase === env.DB_NAME)
    throw new Error('Restore must target a different isolated _test database');
  const source = path.resolve(input),
    manifest = JSON.parse(await fs.readFile(path.join(source, 'manifest.json'), 'utf8'));
  if (manifest.format !== 1) throw new Error('Unsupported backup format');
  const sqlPath = path.join(source, 'database.sql'),
    sql = await fs.readFile(sqlPath);
  if (crypto.createHash('sha256').update(sql).digest('hex') !== manifest.databaseSha256)
    throw new Error('Database dump checksum mismatch');
  if (!process.env.MIGRATION_DB_USER || process.env.MIGRATION_DB_PASSWORD === undefined)
    throw new Error('Migration credentials are required for isolated restore');
  const c = await mysql.createConnection({
    ...options(env),
    database: undefined,
    user: process.env.MIGRATION_DB_USER,
    password: process.env.MIGRATION_DB_PASSWORD,
  });
  try {
    const [[exists]] = await c.execute(
      'SELECT COUNT(*) n FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=?',
      [targetDatabase],
    );
    if (exists.n) throw new Error('Restore target database already exists; refusing overwrite');
    await fs.mkdir(target.UPLOAD_ROOT, { recursive: false });
    await c.query(
      'CREATE DATABASE ' + targetDatabase + ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
    );
    const fd = syncfs.openSync(sqlPath, 'r');
    let result;
    try {
      result = spawnSync(
        clientPath,
        [
          '--host=' + env.DB_HOST,
          '--port=' + env.DB_PORT,
          '--user=' + process.env.MIGRATION_DB_USER,
          '--default-character-set=utf8mb4',
          targetDatabase,
        ],
        {
          env: { ...process.env, MYSQL_PWD: process.env.MIGRATION_DB_PASSWORD },
          stdio: [fd, 'ignore', 'pipe'],
          windowsHide: true,
        },
      );
    } finally {
      syncfs.closeSync(fd);
    }
    if (result.status !== 0)
      throw new Error('Restore import failed; inspect the isolated target before retrying');
    await c.changeUser({ database: targetDatabase });
    await c.query("SET time_zone='+00:00'");
    await c.query('DELETE FROM sessions');
    await c.query('DELETE FROM password_reset_tokens');
    await c.query('UPDATE users SET session_version=session_version+1');
    for (const file of manifest.files) {
      if (!/^[a-f0-9-]{36}$/.test(file.storage_key)) throw new Error('Invalid backup storage key');
      const original = path.join(source, 'private', file.storage_key);
      if ((await fs.lstat(original)).isSymbolicLink())
        throw new Error('Backup files cannot be symlinks');
      const bytes = await fs.readFile(original);
      if (crypto.createHash('sha256').update(bytes).digest('hex') !== file.sha256)
        throw new Error('Backup file checksum mismatch');
      await fs.writeFile(path.join(target.UPLOAD_ROOT, file.storage_key), bytes, { flag: 'wx' });
    }
    await fs.mkdir(path.join(target.UPLOAD_ROOT, '.staging'));
    await c.query('GRANT SELECT,INSERT,UPDATE,DELETE ON ' + targetDatabase + '.* TO ?@?', [
      env.DB_USER,
      '127.0.0.1',
    ]);
    const [versions] = await c.query(
      'SELECT version,checksum FROM schema_migrations ORDER BY version',
    );
    if (JSON.stringify(versions) !== JSON.stringify(manifest.migrations))
      throw new Error('Restored migration history mismatch');
    return {
      database: targetDatabase,
      uploadRoot: target.UPLOAD_ROOT,
      fileCount: manifest.files.length,
      migrationCount: versions.length,
      sessionsInvalidated: true,
    };
  } finally {
    await c.end();
  }
}
if (require.main === module)
  (async () => {
    const input = arg('--input'),
      database = arg('--database'),
      uploads = arg('--uploads');
    if (!input || !database || !uploads)
      throw new Error('--input, --database and --uploads are required');
    console.log(
      JSON.stringify(
        await restore(
          loadEnv(arg('--env')),
          path.resolve(backendRoot, input),
          database,
          path.resolve(backendRoot, uploads),
        ),
      ),
    );
  })().catch((e) => {
    console.error(e.code || e.message);
    process.exitCode = 1;
  });
module.exports = { restore };
