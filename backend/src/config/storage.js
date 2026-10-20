const fs = require('node:fs/promises'),
  path = require('node:path');
async function prepareStorage(env) {
  const root = path.resolve(env.UPLOAD_ROOT);
  await fs.mkdir(root, { recursive: true });
  if ((await fs.lstat(root)).isSymbolicLink())
    throw new Error('Private storage root cannot be a symlink');
  const staging = path.join(root, '.staging');
  await fs.mkdir(staging, { recursive: true });
  if ((await fs.lstat(staging)).isSymbolicLink())
    throw new Error('Private staging directory cannot be a symlink');
  return root;
}
module.exports = { prepareStorage };
