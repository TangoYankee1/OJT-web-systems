const { controller } = require('./placements.controller');
function routes(router, pool) {
  const c = controller(pool);
  router.get('/placements', c.list);
  router.post('/placements', c.create);
  router.get('/placements/:id', c.detail);
  router.patch('/placements/:id', c.edit);
  router.patch('/placements/:id/status', c.status);
  router.get('/placements/:id/progress', c.progress);
}
module.exports = { routes };
