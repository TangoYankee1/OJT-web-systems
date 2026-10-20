const repo = require('../../shared/repository');
const { assert } = require('../../shared/errors');
const { placement } = require('../../shared/scope');
async function child(c, actor, table, id, lock = false) {
  let row = await repo.one(c, 'SELECT * FROM ' + table + ' WHERE id=?', [id]);
  assert(row, 404, 'NOT_FOUND', 'Record not found');
  const p = await placement(c, actor, row.placement_id, lock);
  if (lock) row = await repo.one(c, 'SELECT * FROM ' + table + ' WHERE id=? FOR UPDATE', [id]);
  assert(row, 404, 'NOT_FOUND', 'Record not found');
  return { p, row };
}
module.exports = { ...repo, child };
