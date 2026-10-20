const { rows, one, insert, update } = require('../../shared/repository');
const { scope, placement } = require('../../shared/scope');
const { paging, meta, like } = require('../../shared/pagination');
async function list(c, actor, query) {
  const p = paging(query),
    s = scope(actor),
    values = [...s.values];
  let where = s.sql;
  if (p.status) {
    where += ' AND p.status=?';
    values.push(p.status);
  }
  if (p.academicTermId) {
    where += ' AND p.academic_term_id=?';
    values.push(p.academicTermId);
  }
  if (p.search) {
    where += " AND (u.full_name LIKE ? ESCAPE '!' OR st.student_number LIKE ? ESCAPE '!')";
    values.push(like(p.search), like(p.search));
  }
  const from =
    'placements p JOIN students st ON st.id=p.student_id JOIN users u ON u.id=st.user_id JOIN faculty f ON f.id=p.faculty_id JOIN users fu ON fu.id=f.user_id LEFT JOIN company_departments cd ON cd.id=p.company_department_id LEFT JOIN companies co ON co.id=cd.company_id LEFT JOIN school_departments sd ON sd.id=p.school_department_id';
  const n = await one(c, 'SELECT COUNT(*) AS n FROM ' + from + ' WHERE ' + where, values);
  const data = await rows(
    c,
    'SELECT p.*,u.full_name AS student_name,st.student_number,fu.full_name AS faculty_name,COALESCE(co.name,sd.name) AS host_name FROM ' +
      from +
      ' WHERE ' +
      where +
      ' ORDER BY p.' +
      (p.sortBy === 'createdAt' ? 'created_at' : 'id') +
      ' ' +
      p.sortOrder +
      ' LIMIT ' +
      p.limit +
      ' OFFSET ' +
      (p.page - 1) * p.limit,
    values,
  );
  return { data, meta: meta(p, Number(n.n)) };
}
async function copyRequirements(c, id) {
  await rows(
    c,
    'INSERT INTO placement_requirements (placement_id,requirement_id,title_snapshot,stage_snapshot,is_required_snapshot) SELECT ?,id,title,stage,is_required FROM requirements WHERE is_active=1',
    [id],
  );
}
module.exports = { rows, one, insert, update, placement, list, copyRequirements };
