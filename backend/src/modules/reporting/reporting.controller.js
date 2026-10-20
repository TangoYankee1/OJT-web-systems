const service = require('./reporting.service');
const { id, empty } = require('../../middleware/validate');
const { serialize } = require('../../shared/repository');
function controller(pool) {
  const listing = (fn) => async (req, res) => {
    const r = await service[fn](pool, req.actor, req.query);
    res.json({ ...r, data: serialize(r.data) });
  };
  return {
    dashboard: async (req, res) =>
      res.json({
        data: serialize(await service.dashboard(pool, req.actor, req.params.role, req.query)),
      }),
    reports: listing('reports'),
    audits: listing('audits'),
    notifications: listing('notifications'),
    read: async (req, res) => {
      empty.parse(req.body);
      res.json({ data: serialize(await service.read(pool, req.actor, id.parse(req.params.id))) });
    },
    csv: async (req, res) => {
      const text = await service.csv(pool, req.actor, req.query);
      res
        .set({
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="placements.csv"',
        })
        .send(text);
    },
  };
}
module.exports = { controller };
