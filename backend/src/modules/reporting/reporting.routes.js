const { controller } = require('./reporting.controller');
function routes(router, pool) {
  const c = controller(pool);
  router.get('/dashboard/:role', c.dashboard);
  router.get('/reports/placements', c.reports);
  router.get('/reports/placements.csv', c.csv);
  router.get('/audit-logs', c.audits);
  router.get('/notifications', c.notifications);
  router.patch('/notifications/:id/read', c.read);
}
module.exports = { routes };
