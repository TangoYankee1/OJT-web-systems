const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs/promises'),
  path = require('node:path'),
  crypto = require('node:crypto');
const { prepareStorage } = require('../../src/config/storage');
const { safeFile } = require('../../src/modules/files/files.service');
test('private storage rejects staging junctions, traversal and missing attachments', async () => {
  const parent = path.resolve(__dirname, '..');
  const temp = await fs.mkdtemp(path.join(parent, '.temp-storage-'));
  try {
    const root = path.join(temp, 'private'),
      outside = path.join(temp, 'outside');
    await fs.mkdir(outside);
    await fs.mkdir(root);
    await fs.symlink(outside, path.join(root, '.staging'), 'junction');
    await assert.rejects(prepareStorage({ UPLOAD_ROOT: root }), /symlink/);
    await assert.rejects(safeFile(root, '../outside'), (e) => e.code === 'FILE_NOT_FOUND');
    await assert.rejects(safeFile(root, crypto.randomUUID()), (e) => e.code === 'FILE_NOT_FOUND');
  } finally {
    assert(path.resolve(temp).startsWith(parent + path.sep + '.temp-storage-'));
    await fs.rm(temp, { recursive: true, force: true });
  }
});
