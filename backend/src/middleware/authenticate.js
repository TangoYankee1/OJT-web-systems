const { one } = require('../shared/repository');
const { fail } = require('../shared/errors');
function authenticate(pool, env) {
  return async (req, res, next) => {
    const s = req.session;
    if (!s.userId) return fail(401, 'UNAUTHENTICATED', 'Please sign in');
    const u = await one(pool, 'SELECT * FROM users WHERE id=?', [s.userId]);
    if (
      !u ||
      !u.is_active ||
      u.session_version !== s.sessionVersion ||
      !s.issuedAt ||
      Date.now() - s.issuedAt >= env.SESSION_MAX_AGE_MS
    ) {
      await new Promise((r) => s.destroy(() => r()));
      return fail(401, 'SESSION_EXPIRED', 'Please sign in again');
    }
    req.actor = { ...u, requestId: req.id };
    if (
      u.must_change_password &&
      !['/auth/me', '/auth/csrf', '/auth/logout', '/auth/change-password'].includes(req.path)
    )
      return fail(403, 'PASSWORD_CHANGE_REQUIRED', 'Change your temporary password first');
    next();
  };
}
module.exports = { authenticate };
