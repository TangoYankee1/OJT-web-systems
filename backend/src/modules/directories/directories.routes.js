const { controller } = require('./directories.controller');
const { roles } = require('../../middleware/authorize');
function routes(router, pool) {
  const c = controller(pool);
  for (const r of [
    'companies',
    'school-departments',
    'academic-terms',
    'requirements',
    'evaluation-criteria',
  ]) {
    router.get('/' + r, c.list(r));
    router.post('/' + r, roles('admin'), c.save(r));
    router.get('/' + r + '/:id', c.detail(r));
    router.patch('/' + r + '/:id', roles('admin'), c.save(r));
  }
  for (const r of ['students', 'faculty', 'supervisors']) {
    router.get('/' + r, c.list(r));
    router.get('/' + r + '/:id', c.detail(r));
  }
  router.get('/companies/:companyId/departments', c.list('company-departments'));
  router.post('/companies/:companyId/departments', roles('admin'), c.save('company-departments'));
  router.get('/company-departments', c.list('company-departments'));
  router.patch('/company-departments/:id', roles('admin'), c.save('company-departments'));
  router.post('/academic-terms/:id/activate', roles('admin'), c.activate);
  router.get('/users', roles('admin'), c.users);
  router.post('/users', roles('admin'), c.createAccount);
  router.get('/users/:id', c.userDetail);
  router.patch('/users/:id', c.editAccount);
  router.post('/users/:id/reset-password', roles('admin'), c.resetPassword);
}
module.exports = { routes };
