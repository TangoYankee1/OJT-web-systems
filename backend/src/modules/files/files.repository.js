const { one, rows, insert, update } = require('../../shared/repository');
const { assert } = require('../../shared/errors');
const { placement } = require('../../shared/scope');
async function requirement(c, actor, id, lock = false) {
  const r = await one(c, 'SELECT * FROM placement_requirements WHERE id=?', [id]);
  assert(r, 404, 'NOT_FOUND', 'Requirement not found');
  const p = await placement(c, actor, r.placement_id, lock);
  return {
    p,
    r: lock ? await one(c, 'SELECT * FROM placement_requirements WHERE id=? FOR UPDATE', [id]) : r,
  };
}
module.exports = { one, rows, insert, update, requirement };
