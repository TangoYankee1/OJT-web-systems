const express = require('express');
const { csrf } = require('../middleware/csrf');
const { authenticate } = require('../middleware/authenticate');
const auth = require('../modules/auth/auth.routes');
function createRouter(pool, env) {
  const r = express.Router();
  r.get('/health', (req, res) => res.json({ data: { status: 'ok' } }));
  r.get('/ready', async (req, res) => {
    try {
      await pool.execute('SELECT 1');
      res.json({ data: { status: 'ready' } });
    } catch {
      res
        .status(503)
        .json({ error: { code: 'NOT_READY', message: 'Service is not ready' }, requestId: req.id });
    }
  });
  r.use(csrf(env));
  auth.publicRoutes(r, pool, env);
  r.use(authenticate(pool, env));
  auth.privateRoutes(r, pool, env);
  for (const resource of ['directories', 'placements', 'files', 'time', 'evaluations', 'reporting'])
    require('../modules/' + resource + '/' + resource + '.routes').routes(r, pool, env);
  return r;
}
module.exports = { createRouter };
