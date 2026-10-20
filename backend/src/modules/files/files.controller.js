const service = require('./files.service');
const { id } = require('../../middleware/validate');
const { serialize } = require('../../shared/repository');
function controller(pool, env) {
  return {
    list: async (req, res) =>
      res.json({ data: serialize(await service.list(pool, req.actor, id.parse(req.params.id))) }),
    authorize: async (req, res, next) => {
      await service.authorizeUpload(pool, req.actor, id.parse(req.params.id));
      next();
    },
    upload: async (req, res) =>
      res.status(201).json({
        data: serialize(
          await service.upload(pool, req.actor, id.parse(req.params.id), req.file, env),
        ),
      }),
    review: (reopen) => async (req, res) =>
      res.json({
        data: serialize(
          await service.review(pool, req.actor, id.parse(req.params.id), req.body, reopen),
        ),
      }),
    download: async (req, res, next) => {
      const result = await service.download(pool, req.actor, id.parse(req.params.id), env);
      res.set('X-Content-Type-Options', 'nosniff');
      res.download(
        result.path,
        result.file.original_name,
        {
          headers: { 'Content-Type': result.file.mime_type, 'Cache-Control': 'private, no-store' },
        },
        (e) => {
          if (e) next(e);
        },
      );
    },
  };
}
module.exports = { controller };
