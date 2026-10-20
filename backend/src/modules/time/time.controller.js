const service = require('./time.service');
const { id } = require('../../middleware/validate');
const { serialize } = require('../../shared/repository');
function controller(pool, env) {
  const send = (res, data, status = 200) => res.status(status).json({ data: serialize(data) });
  return {
    list: (table) => async (req, res) =>
      send(res, await service.list(pool, req.actor, id.parse(req.params.id), table)),
    createLog: async (req, res) =>
      send(
        res,
        await service.createLog(pool, req.actor, id.parse(req.params.id), req.body, env),
        201,
      ),
    editLog: (remove) => async (req, res) => {
      const r = await service.editLog(
        pool,
        req.actor,
        id.parse(req.params.id),
        req.body,
        env,
        remove,
      );
      if (remove) res.status(204).end();
      else send(res, r);
    },
    action: (kind) => async (req, res) =>
      send(
        res,
        await service.action(pool, req.actor, id.parse(req.params.id), kind, req.body, env),
      ),
    schedule: (edit, remove) => async (req, res) => {
      const r = await service.saveSchedule(
        pool,
        req.actor,
        id.parse(req.params.id),
        req.body,
        edit,
        remove,
      );
      if (remove) res.status(204).end();
      else send(res, r, edit ? 200 : 201);
    },
  };
}
module.exports = { controller };
