const { rateLimit } = require('express-rate-limit');
const { controller } = require('./auth.controller');
function publicRoutes(router, pool, env) {
  const c = controller(pool, env);
  router.get('/auth/csrf', c.csrf);
  router.post(
    '/auth/login',
    rateLimit({
      windowMs: 900000,
      limit: 10,
      skipSuccessfulRequests: true,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler: (req, res) =>
        res.status(429).json({
          error: { code: 'RATE_LIMITED', message: 'Too many login attempts; try again later' },
          requestId: req.id,
        }),
    }),
    c.login,
  );
}
function privateRoutes(router, pool, env) {
  const c = controller(pool, env);
  router.get('/auth/me', c.me);
  router.post('/auth/logout', c.logout);
  router.post('/auth/change-password', c.change);
}
module.exports = { publicRoutes, privateRoutes };
