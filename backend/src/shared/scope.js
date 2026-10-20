const { assert } = require('./errors');
function scope(actor, p = 'p') {
  if (actor.role === 'admin') return { sql: '1=1', values: [] };
  const map = {
    student: ['students', 'student_id'],
    faculty: ['faculty', 'faculty_id'],
    supervisor: ['company_supervisors', 'supervisor_id'],
  };
  const [t, key] = map[actor.role] || [];
  assert(t, 403, 'FORBIDDEN', 'Unknown role');
  return {
    sql: 'EXISTS (SELECT 1 FROM ' + t + ' sc WHERE sc.id=' + p + '.' + key + ' AND sc.user_id=?)',
    values: [actor.id],
  };
}
async function placement(c, actor, id, lock = false) {
  const { one } = require('./repository');
  const s = scope(actor);
  const p = await one(
    c,
    'SELECT p.* FROM placements p WHERE p.id=? AND ' + s.sql + (lock ? ' FOR UPDATE' : ''),
    [id, ...s.values],
  );
  assert(p, 404, 'NOT_FOUND', 'Placement not found');
  const identities = await one(
    c,
    'SELECT st.user_id AS student_user_id,u.full_name AS student_name,f.user_id AS faculty_user_id,v.user_id AS supervisor_user_id FROM students st JOIN users u ON u.id=st.user_id JOIN faculty f ON f.id=? LEFT JOIN company_supervisors v ON v.id=? WHERE st.id=?',
    [p.faculty_id, p.supervisor_id, p.student_id],
  );
  return { ...p, ...identities };
}
function facultyReviewer(actor, p) {
  assert(
    actor.role === 'admin' || (actor.role === 'faculty' && actor.id === p.faculty_user_id),
    403,
    'FORBIDDEN',
    'Assigned faculty review is required',
  );
}
function dutyReviewer(actor, p, remarks) {
  const uid = p.deployment_type === 'company' ? p.supervisor_user_id : p.faculty_user_id;
  assert(
    actor.role === 'admin' || (actor.id === uid && ['faculty', 'supervisor'].includes(actor.role)),
    403,
    'FORBIDDEN',
    'Assigned duty reviewer is required',
  );
  if (actor.role === 'admin')
    assert(
      remarks && remarks.trim(),
      422,
      'REMARKS_REQUIRED',
      'Administrator overrides require remarks',
    );
}
function owner(actor, p) {
  assert(
    actor.role === 'student' && actor.id === p.student_user_id,
    403,
    'FORBIDDEN',
    'Only the owning student can perform this action',
  );
}
function mutable(p) {
  assert(
    ['pending', 'approved', 'active'].includes(p.status),
    409,
    'IMMUTABLE_RECORD',
    'This placement is closed',
  );
}
module.exports = { scope, placement, facultyReviewer, dutyReviewer, owner, mutable };
