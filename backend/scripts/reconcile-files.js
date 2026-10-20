const fs = require('node:fs/promises'),
  path = require('node:path');
const { loadEnv } = require('../src/config/env');
const { createPool } = require('../src/config/db');
(async () => {
  const env = loadEnv(),
    pool = createPool(env);
  try {
    await require('../src/config/storage').prepareStorage(env);
    const [rows] = await pool.query('SELECT storage_key FROM uploaded_files');
    const keys = new Set(rows.map((r) => r.storage_key));
    let removed = 0;
    for (const dir of [env.UPLOAD_ROOT, path.join(env.UPLOAD_ROOT, '.staging')]) {
      for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        if (!entry.isFile() || entry.name === '.gitkeep') continue;
        const file = path.join(dir, entry.name),
          s = await fs.lstat(file);
        if (s.isSymbolicLink() || Date.now() - s.mtimeMs < 86400000) continue;
        if (dir !== env.UPLOAD_ROOT || !keys.has(entry.name)) {
          await fs.unlink(file);
          removed++;
        }
      }
    }
    console.log('Removed ' + removed + ' unreferenced files older than 24 hours.');
  } finally {
    await pool.end();
  }
})().catch((e) => {
  console.error(e.code || e.message);
  process.exitCode = 1;
});
