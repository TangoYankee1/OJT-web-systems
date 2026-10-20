const { assert } = require('./errors');
async function transaction(pool, fn, { isolation = 'READ COMMITTED' } = {}) {
  assert(
    ['READ COMMITTED', 'REPEATABLE READ'].includes(isolation),
    500,
    'INVALID_ISOLATION',
    'Invalid transaction isolation',
  );
  const c = await pool.getConnection();
  try {
    await c.query('SET TRANSACTION ISOLATION LEVEL ' + isolation);
    await c.beginTransaction();
    const result = await fn(c);
    await c.commit();
    return result;
  } catch (e) {
    await c.rollback();
    throw e;
  } finally {
    c.release();
  }
}
module.exports = { transaction };
