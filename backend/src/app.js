const express = require('express'),
  helmet = require('helmet'),
  crypto = require('node:crypto'),
  path = require('node:path'),
  fs = require('node:fs');
const { createRouter } = require('./routes');
const { errorHandler } = require('./middleware/error-handler');
function createApp({ pool, env, sessionMiddleware }) {
  if (!pool || !env || !sessionMiddleware)
    throw new Error('Explicit database, environment and session middleware are required');
  const app = express();
  app.disable('x-powered-by');
  if (env.TRUST_PROXY !== 'false') app.set('trust proxy', env.TRUST_PROXY);
  app.use((req, res, next) => {
    req.id = crypto.randomUUID();
    res.set('X-Request-Id', req.id);
    res.on('finish', () => {
      if (env.NODE_ENV !== 'test')
        console.log(
          JSON.stringify({ requestId: req.id, method: req.method, status: res.statusCode }),
        );
    });
    next();
  });
  app.use(helmet({ strictTransportSecurity: env.NODE_ENV === 'production' ? undefined : false }));
  app.use(express.json({ limit: '256kb' }));
  app.use(
    '/api',
    sessionMiddleware,
    (req, res, next) => {
      res.set('Cache-Control', 'no-store');
      next();
    },
    createRouter(pool, env),
  );
  app.use('/api', (req, res) =>
    res
      .status(404)
      .json({ error: { code: 'NOT_FOUND', message: 'API route not found' }, requestId: req.id }),
  );
  const dist = path.resolve(__dirname, '../../frontend/dist');
  if (fs.existsSync(path.join(dist, 'index.html'))) {
    app.use(express.static(dist, { index: false }));
    app.get('/{*path}', (req, res) => res.sendFile(path.join(dist, 'index.html')));
  }
  app.use((req, res) =>
    res
      .status(404)
      .json({ error: { code: 'NOT_FOUND', message: 'Route not found' }, requestId: req.id }),
  );
  app.use(errorHandler);
  return app;
}
module.exports = { createApp };
