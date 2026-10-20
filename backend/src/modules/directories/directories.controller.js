const service = require('./directories.service');
const { id, empty } = require('../../middleware/validate');
const { serialize } = require('../../shared/repository');
function send(res, data, status = 200) {
  res.status(status).json({ data: serialize(data) });
}
function controller(pool) {
  return {
    list: (resource) => async (req, res) => {
      const result = await service.list(
        pool,
        req.actor,
        resource,
        req.query,
        req.params.companyId ? id.parse(req.params.companyId) : undefined,
      );
      res.json({ ...result, data: serialize(result.data) });
    },
    detail: (resource) => async (req, res) =>
      send(res, await service.detail(pool, req.actor, resource, id.parse(req.params.id))),
    save: (resource) => async (req, res) =>
      send(
        res,
        await service.save(
          pool,
          req.actor,
          resource,
          req.params.id ? id.parse(req.params.id) : null,
          req.body,
          req.params.companyId ? id.parse(req.params.companyId) : undefined,
        ),
        req.params.id ? 200 : 201,
      ),
    activate: async (req, res) => {
      empty.parse(req.body);
      send(res, await service.activate(pool, req.actor, id.parse(req.params.id)));
    },
    users: async (req, res) => {
      const r = await service.users(pool, req.actor, req.query);
      res.json({ ...r, data: serialize(r.data) });
    },
    createAccount: async (req, res) =>
      send(res, await service.createAccount(pool, req.actor, req.body), 201),
    userDetail: async (req, res) =>
      send(res, await service.userDetail(pool, req.actor, id.parse(req.params.id))),
    editAccount: async (req, res) =>
      send(res, await service.editAccount(pool, req.actor, id.parse(req.params.id), req.body)),
    resetPassword: async (req, res) => {
      await service.resetPassword(pool, req.actor, id.parse(req.params.id), req.body);
      res.status(204).end();
    },
  };
}
module.exports = { controller };
