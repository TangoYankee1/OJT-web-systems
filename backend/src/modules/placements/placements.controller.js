const service = require('./placements.service'),
  repo = require('./placements.repository');
const { id } = require('../../middleware/validate');
const { serialize } = require('../../shared/repository');
function controller(pool) {
  return {
    list: async (req, res) => {
      const result = await repo.list(pool, req.actor, req.query);
      res.json({ ...result, data: serialize(result.data) });
    },
    detail: async (req, res) =>
      res.json({ data: serialize(await repo.placement(pool, req.actor, id.parse(req.params.id))) }),
    create: async (req, res) =>
      res.status(201).json({ data: serialize(await service.create(pool, req.actor, req.body)) }),
    edit: async (req, res) =>
      res.json({
        data: serialize(await service.edit(pool, req.actor, id.parse(req.params.id), req.body)),
      }),
    status: async (req, res) =>
      res.json({
        data: serialize(
          await service.transition(pool, req.actor, id.parse(req.params.id), req.body),
        ),
      }),
    progress: async (req, res) =>
      res.json({ data: await service.progress(pool, req.actor, id.parse(req.params.id)) }),
  };
}
module.exports = { controller };
