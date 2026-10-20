const service = require('./evaluations.service'),
  repo = require('./evaluations.repository');
const { id, empty } = require('../../middleware/validate');
const { serialize } = require('../../shared/repository');
function controller(pool) {
  return {
    list: async (req, res) => {
      const r = await repo.list(pool, req.actor, req.query);
      res.json({ ...r, data: serialize(r.data) });
    },
    create: async (req, res) =>
      res.status(201).json({ data: await service.create(pool, req.actor, req.body) }),
    detail: async (req, res) =>
      res.json({ data: serialize(await service.detail(pool, req.actor, id.parse(req.params.id))) }),
    edit: async (req, res) =>
      res.json({
        data: serialize(await service.edit(pool, req.actor, id.parse(req.params.id), req.body)),
      }),
    action: (finalize) => async (req, res) => {
      empty.parse(req.body);
      res.json({
        data: serialize(await service.action(pool, req.actor, id.parse(req.params.id), finalize)),
      });
    },
  };
}
module.exports = { controller };
