const { controller } = require('./time.controller');
function routes(router, pool, env) {
  const c = controller(pool, env);
  router.get('/placements/:id/schedules', c.list('work_schedules'));
  router.post('/placements/:id/schedules', c.schedule(false, false));
  router.patch('/schedules/:id', c.schedule(true, false));
  router.delete('/schedules/:id', c.schedule(true, true));
  router.get('/placements/:id/duty-logs', c.list('duty_logs'));
  router.post('/placements/:id/duty-logs', c.createLog);
  router.patch('/duty-logs/:id', c.editLog(false));
  router.delete('/duty-logs/:id', c.editLog(true));
  router.post('/duty-logs/:id/submit', c.action('submit'));
  router.patch('/duty-logs/:id/review', c.action('review'));
  router.post('/duty-logs/:id/reopen', c.action('reopen'));
}
module.exports = { routes };
