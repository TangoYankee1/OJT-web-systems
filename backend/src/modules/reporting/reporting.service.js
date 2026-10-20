const repo = require('./reporting.repository');
const placements = require('../placements/placements.repository');
const { progress } = require('../placements/placements.service');
const { scope } = require('../../shared/scope');
const { assert } = require('../../shared/errors');
const { paging, meta } = require('../../shared/pagination');
const { transaction } = require('../../shared/transactions');
async function dashboard(pool, actor, role, query) {
  assert(actor.role === role, 403, 'FORBIDDEN', 'Dashboard role must match your account');
  query = require('./reporting.schemas').dashboard.parse(query);
  let term = query.academicTermId;
  if (!term)
    term = (
      await repo.one(pool, 'SELECT id FROM academic_terms WHERE is_active=1 ORDER BY id LIMIT 1')
    )?.id;
  const s = scope(actor),
    values = [...s.values],
    termSql = term ? ' AND p.academic_term_id=?' : ' AND 1=0';
  if (term) values.push(term);
  const counts = await repo.one(
    pool,
    "SELECT COUNT(*) AS total,COALESCE(SUM(p.status='active'),0) AS active,COALESCE(SUM(p.status='completed'),0) AS completed,COALESCE(SUM(p.status='pending'),0) AS pending FROM placements p WHERE " +
      s.sql +
      termSql,
    values,
  );
  const duty = await repo.one(
    pool,
    "SELECT COALESCE(SUM(CASE WHEN d.status='approved' THEN d.credited_minutes ELSE 0 END),0) AS approved_minutes,COALESCE(SUM(d.status='submitted'),0) AS pending_duty_reviews FROM duty_logs d JOIN placements p ON p.id=d.placement_id WHERE " +
      s.sql +
      termSql,
    values,
  );
  const reqs = await repo.one(
    pool,
    "SELECT COUNT(*) AS pending_requirement_reviews FROM placement_requirements r JOIN placements p ON p.id=r.placement_id WHERE r.status='submitted' AND " +
      s.sql +
      termSql,
    values,
  );
  const grades = await repo.one(
    pool,
    "SELECT AVG(g.percentage) AS average_grade FROM evaluations e JOIN placements p ON p.id=e.placement_id JOIN (SELECT evaluation_id,100*SUM(score)/NULLIF(SUM(max_score_snapshot),0) AS percentage FROM evaluation_scores GROUP BY evaluation_id) g ON g.evaluation_id=e.id WHERE e.type='final' AND e.status='finalized' AND " +
      s.sql +
      termSql,
    values,
  );
  const denominator = Number(counts.active) + Number(counts.completed);
  const roster = term
    ? await placements.list(pool, actor, { academicTermId: term, limit: 5 })
    : { data: [] };
  let own = null;
  if (actor.role === 'student') {
    const mine = await repo.one(
      pool,
      'SELECT p.id FROM placements p WHERE ' +
        s.sql +
        " ORDER BY (p.status IN ('pending','approved','active')) DESC,p.id DESC LIMIT 1",
      s.values,
    );
    if (mine) own = await progress(pool, actor, mine.id);
  }
  const accountCounts =
    actor.role === 'admin'
      ? await repo.rows(
          pool,
          'SELECT role,COUNT(*) AS total FROM users WHERE is_active=1 GROUP BY role',
        )
      : [];
  return {
    academicTermId: term || null,
    ...Object.fromEntries(
      Object.entries({ ...counts, ...duty, ...reqs }).map(([k, v]) => [k, Number(v)]),
    ),
    completionRate: denominator ? (Number(counts.completed) / denominator) * 100 : 0,
    averageGrade: grades.average_grade === null ? null : Number(grades.average_grade),
    accounts: accountCounts,
    placements: roster.data,
    ownProgress: own,
  };
}
async function reports(pool, actor, query) {
  assert(actor.role !== 'student', 403, 'FORBIDDEN', 'Reports require a review role');
  const result = await placements.list(pool, actor, query);
  for (const p of result.data) {
    const x = await progress(pool, actor, p.id);
    Object.assign(p, {
      approved_minutes: x.approvedMinutes,
      pending_minutes: x.pendingMinutes,
      requirements_percent: x.requirementsPercent,
    });
  }
  return result;
}
function csvCell(value) {
  let s = String(value ?? '');
  if (/^[=+@-]/.test(s.trimStart()) || /^[\t\r\n]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}
async function csv(pool, actor, query) {
  return transaction(
    pool,
    async (c) => {
      const p = paging(query);
      let page = 1,
        all = [];
      do {
        const result = await reports(c, actor, { ...query, page, limit: 100 });
        all.push(...result.data);
        if (page >= result.meta.totalPages) break;
        page++;
      } while (true);
      const headings = [
        'Placement',
        'Student number',
        'Student',
        'Host',
        'Status',
        'Approved minutes',
        'Pending minutes',
        'Required minutes',
      ];
      return (
        '\ufeff' +
        [
          headings,
          ...all.map((r) => [
            r.id,
            r.student_number,
            r.student_name,
            r.host_name,
            r.status,
            r.approved_minutes,
            r.pending_minutes,
            r.required_minutes,
          ]),
        ]
          .map((r) => r.map(csvCell).join(','))
          .join('\r\n')
      );
    },
    { isolation: 'REPEATABLE READ' },
  );
}
async function notifications(pool, actor, query) {
  const p = paging(query),
    n = await repo.one(pool, 'SELECT COUNT(*) AS n FROM notifications WHERE recipient_id=?', [
      actor.id,
    ]);
  return {
    data: await repo.rows(
      pool,
      'SELECT * FROM notifications WHERE recipient_id=? ORDER BY id DESC LIMIT ' +
        p.limit +
        ' OFFSET ' +
        (p.page - 1) * p.limit,
      [actor.id],
    ),
    meta: meta(p, Number(n.n)),
  };
}
async function read(pool, actor, id) {
  const r = await repo.rows(
    pool,
    'UPDATE notifications SET read_at=COALESCE(read_at,UTC_TIMESTAMP(3)) WHERE id=? AND recipient_id=?',
    [id, actor.id],
  );
  assert(r.affectedRows, 404, 'NOT_FOUND', 'Notification not found');
  return repo.one(pool, 'SELECT * FROM notifications WHERE id=? AND recipient_id=?', [
    id,
    actor.id,
  ]);
}
async function audits(pool, actor, query) {
  assert(actor.role === 'admin', 403, 'FORBIDDEN', 'Administrator access required');
  const p = paging(query),
    n = await repo.one(pool, 'SELECT COUNT(*) AS n FROM audit_logs');
  return {
    data: await repo.rows(
      pool,
      'SELECT id,actor_id,action,entity_type,entity_id,request_id,created_at FROM audit_logs ORDER BY id DESC LIMIT ' +
        p.limit +
        ' OFFSET ' +
        (p.page - 1) * p.limit,
    ),
    meta: meta(p, Number(n.n)),
  };
}
module.exports = { dashboard, reports, csv, csvCell, notifications, read, audits };
