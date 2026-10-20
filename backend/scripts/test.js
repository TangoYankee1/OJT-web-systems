const fs = require('node:fs'),
  path = require('node:path'),
  { spawnSync } = require('node:child_process');
const kind = process.argv[2];
const dirs = kind ? [kind] : ['unit', 'integration'];
const files = dirs.flatMap((d) =>
  fs
    .readdirSync(path.join(__dirname, '../tests', d))
    .filter((f) => f.endsWith('.test.js'))
    .map((f) => path.join('tests', d, f)),
);
if (!files.length) throw new Error('No tests found');
const r = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...files], {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit',
});
process.exitCode = r.status ?? 1;
