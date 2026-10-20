const repo = require('../../shared/repository');
const { placement, scope } = require('../../shared/scope');
const { assert } = require('../../shared/errors');
const { paging, meta } = require('../../shared/pagination');
async function detail(c, actor, id, lock = false) {
  let e = await repo.one(c, 'SELECT * FROM evaluations WHERE id=?', [id]);
  assert(e, 404, 'NOT_FOUND', 'Evaluation not found');
  const p = await placement(c, actor, e.placement_id, lock);
  if (lock) e = await repo.one(c, 'SELECT * FROM evaluations WHERE id=? FOR UPDATE', [id]);
  assert(
    e && !(actor.role === 'student' && e.status !== 'finalized'),
    404,
    'NOT_FOUND',
    'Evaluation not found',
  );
  const scores = await repo.rows(
    c,
    'SELECT * FROM evaluation_scores WHERE evaluation_id=? ORDER BY id' +
      (lock ? ' FOR UPDATE' : ''),
    [id],
  );
  return { p, e, scores };
}
async function list(c, actor, query) {
  const pg = paging(query),
    s = scope(actor),
    v = [...s.values];
  let where = s.sql;
  if (actor.role === 'student') where += " AND e.status='finalized'";
  if (pg.placementId) {
    where += ' AND p.id=?';
    v.push(pg.placementId);
  }
  if (pg.status) {
    where += ' AND e.status=?';
    v.push(pg.status);
  }
  const from = 'evaluations e JOIN placements p ON p.id=e.placement_id';
  const n = await repo.one(c, 'SELECT COUNT(*) AS n FROM ' + from + ' WHERE ' + where, v);
  const data = await repo.rows(
    c,
    'SELECT e.* FROM ' +
      from +
      ' WHERE ' +
      where +
      ' ORDER BY e.id DESC LIMIT ' +
      pg.limit +
      ' OFFSET ' +
      (pg.page - 1) * pg.limit,
    v,
  );
  return { data, meta: meta(pg, Number(n.n)) };
}
module.exports = { ...repo, detail, list };
