const multer = require('multer'),
  crypto = require('node:crypto'),
  path = require('node:path');
const { controller } = require('./files.controller');
function routes(router, pool, env) {
  const c = controller(pool, env);
  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) =>
        require('../../config/storage')
          .prepareStorage(env)
          .then((root) => cb(null, path.join(root, '.staging')), cb),
      filename: (req, file, cb) => cb(null, crypto.randomUUID()),
    }),
    limits: { fileSize: env.MAX_UPLOAD_BYTES, files: 1, fields: 0 },
  });
  router.get('/placements/:id/requirements', c.list);
  router.post('/placement-requirements/:id/uploads', c.authorize, upload.single('file'), c.upload);
  router.patch('/placement-requirements/:id/review', c.review(false));
  router.post('/placement-requirements/:id/reopen', c.review(true));
  router.get('/files/:id/download', c.download);
}
module.exports = { routes };
