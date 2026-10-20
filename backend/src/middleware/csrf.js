const crypto = require('node:crypto');
const { assert } = require('../shared/errors');
function token(req) {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  return req.session.csrfToken;
}
function csrf(env) {
  return (req, res, next) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
    try {
      let origin = req.get('origin');
      if (!origin && req.get('referer')) {
        try {
          origin = new URL(req.get('referer')).origin;
        } catch {
          origin = 'invalid';
        }
      }
      assert(
        origin === new URL(env.APP_ORIGIN).origin,
        403,
        'INVALID_ORIGIN',
        'Request origin is not allowed',
      );
      const sent = Buffer.from(req.get('x-csrf-token') || '', 'utf8'),
        expected = Buffer.from(req.session.csrfToken || '', 'utf8');
      assert(
        sent.length === expected.length &&
          sent.length === 64 &&
          crypto.timingSafeEqual(sent, expected),
        403,
        'CSRF_INVALID',
        'Refresh the page and try again',
      );
      next();
    } catch (e) {
      next(e);
    }
  };
}
module.exports = { csrf, token };
