const crypto = require('node:crypto');
const service = require('./auth.service'),
  schema = require('./auth.schemas');
const { token } = require('../../middleware/csrf');
const { serialize } = require('../../shared/repository');
const { empty } = require('../../middleware/validate');
const call = (s, m) => new Promise((resolve, reject) => s[m]((e) => (e ? reject(e) : resolve())));
function controller(pool, env) {
  return {
    csrf: async (req, res) => res.json({ data: { csrfToken: token(req) } }),
    login: async (req, res) => {
      const u = await service.login(pool, schema.login.parse(req.body));
      await call(req.session, 'regenerate');
      Object.assign(req.session, {
        userId: u.id,
        sessionVersion: u.session_version,
        issuedAt: Date.now(),
        csrfToken: crypto.randomBytes(32).toString('hex'),
      });
      await call(req.session, 'save');
      res.json({ data: serialize(u) });
    },
    me: async (req, res) => res.json({ data: await service.me(pool, req.actor) }),
    logout: async (req, res) => {
      empty.parse(req.body);
      await call(req.session, 'destroy');
      res.clearCookie(env.SESSION_NAME, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: env.NODE_ENV === 'production',
      });
      res.status(204).end();
    },
    change: async (req, res) => {
      await service.change(pool, req.actor, schema.change.parse(req.body));
      await call(req.session, 'destroy');
      res.clearCookie(env.SESSION_NAME, { path: '/' });
      res.status(204).end();
    },
  };
}
module.exports = { controller };
