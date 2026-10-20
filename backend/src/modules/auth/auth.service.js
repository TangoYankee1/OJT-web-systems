const bcrypt = require('bcryptjs');
const repo = require('./auth.repository');
const { assert } = require('../../shared/errors');
const { transaction } = require('../../shared/transactions');
const { audit } = require('../../shared/audit');
const { serialize } = require('../../shared/repository');
const dummy = bcrypt.hashSync('unused-random-auth-comparison', 12);
async function login(pool, body) {
  const u = await repo.byEmail(pool, body.email);
  const validLength = Buffer.byteLength(body.password, 'utf8') <= 72;
  const ok = await bcrypt.compare(body.password, validLength ? u?.password_hash || dummy : dummy);
  assert(
    u && u.is_active && ok && validLength,
    401,
    'INVALID_CREDENTIALS',
    'Invalid email or password',
  );
  return u;
}
async function me(pool, actor) {
  return {
    ...serialize(actor),
    profile: serialize(await repo.profile(pool, actor)),
    requestId: undefined,
  };
}
async function change(pool, actor, body) {
  assert(
    await bcrypt.compare(body.currentPassword, actor.password_hash),
    401,
    'INVALID_CREDENTIALS',
    'Current password is incorrect',
  );
  assert(
    body.newPassword !== body.currentPassword,
    422,
    'VALIDATION_ERROR',
    'Choose a different password',
  );
  const hash = await bcrypt.hash(body.newPassword, 12);
  await transaction(pool, async (c) => {
    const { one } = require('../../shared/repository');
    const current = await one(c, 'SELECT session_version FROM users WHERE id=? FOR UPDATE', [
      actor.id,
    ]);
    assert(
      current.session_version === actor.session_version,
      409,
      'SESSION_CHANGED',
      'Sign in again before changing your password',
    );
    await repo.update(c, 'users', actor.id, {
      password_hash: hash,
      must_change_password: 0,
      session_version: current.session_version + 1,
    });
    await audit(c, actor, 'user.password_changed', 'user', actor.id);
  });
}
module.exports = { login, me, change };
