const fs = require('node:fs/promises'),
  syncfs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto'),
  { spawnSync } = require('node:child_process');
const { loadEnv, backendRoot } = require('../src/config/env');
const { createPool } = require('../src/config/db');
const { safeFile } = require('../src/modules/files/files.service');
function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
async function backup(
  env,
  output,
  {
    writesPaused = false,
    dumpPath = process.env.MYSQL_DUMP_PATH || 'C:/xampp/mysql/bin/mysqldump.exe',
  } = {},
) {
  if (!writesPaused)
    throw new Error('Pause application writes and supply --writes-paused before backup');
  const dir = path.resolve(output);
  await fs.mkdir(dir, { recursive: false });
  const pool = createPool(env);
  try {
    const [migrations] = await pool.query(
      'SELECT version,checksum FROM schema_migrations ORDER BY version',
    );
    const [files] = await pool.query(
      'SELECT storage_key,sha256,size_bytes FROM uploaded_files ORDER BY id',
    );
    await fs.mkdir(path.join(dir, 'private'));
    for (const file of files) {
      const source = await safeFile(env.UPLOAD_ROOT, file.storage_key);
      const bytes = await fs.readFile(source);
      if (crypto.createHash('sha256').update(bytes).digest('hex') !== file.sha256)
        throw new Error('Private file checksum mismatch');
      await fs.copyFile(source, path.join(dir, 'private', file.storage_key));
    }
    const fd = syncfs.openSync(path.join(dir, 'database.sql'), 'wx');
    let result;
    try {
      result = spawnSync(
        dumpPath,
        [
          '--host=' + env.DB_HOST,
          '--port=' + env.DB_PORT,
          '--user=' + env.DB_USER,
          '--single-transaction',
          '--skip-lock-tables',
          '--skip-triggers',
          '--hex-blob',
          '--default-character-set=utf8mb4',
          env.DB_NAME,
        ],
        {
          env: { ...process.env, MYSQL_PWD: env.DB_PASSWORD },
          stdio: ['ignore', fd, 'pipe'],
          windowsHide: true,
        },
      );
    } finally {
      syncfs.closeSync(fd);
    }
    if (result.status !== 0)
      throw new Error(
        'Logical database dump failed (' + (result.error?.code || result.status) + ')',
      );
    const sql = await fs.readFile(path.join(dir, 'database.sql'));
    const manifest = {
      format: 1,
      createdAt: new Date().toISOString(),
      database: env.DB_NAME,
      databaseSha256: crypto.createHash('sha256').update(sql).digest('hex'),
      migrations,
      files,
    };
    await fs.writeFile(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    return { directory: dir, fileCount: files.length, migrationCount: migrations.length };
  } finally {
    await pool.end();
  }
}
if (require.main === module)
  (async () => {
    const output = arg('--output');
    if (!output) throw new Error('--output is required');
    console.log(
      JSON.stringify(
        await backup(loadEnv(arg('--env')), path.resolve(backendRoot, output), {
          writesPaused: process.argv.includes('--writes-paused'),
        }),
      ),
    );
  })().catch((e) => {
    console.error(e.code || e.message);
    process.exitCode = 1;
  });
module.exports = { backup, arg };
