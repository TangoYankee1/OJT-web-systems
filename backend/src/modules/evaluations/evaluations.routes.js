const { controller } = require('./evaluations.controller');
function routes(router, pool) {
  const c = controller(pool);
  router.get('/evaluations', c.list);
  router.post('/evaluations', c.create);
  router.get('/evaluations/:id', c.detail);
  router.patch('/evaluations/:id', c.edit);
  router.post('/evaluations/:id/submit', c.action(false));
  router.patch('/evaluations/:id/finalize', c.action(true));
}
module.exports = { routes };
