const bcrypt = require('bcryptjs');
const { z, id, text, password } = require('../../middleware/validate');
const { descriptors, profile, createUser, email } = require('./directories.schemas');
const { rows, one, insert, update } = require('./directories.repository');
const { paging, meta, like } = require('../../shared/pagination');
const { transaction } = require('../../shared/transactions');
const { audit } = require('../../shared/audit');
const { scope } = require('../../shared/scope');
const { assert } = require('../../shared/errors');
function admin(actor) {
  assert(actor.role === 'admin', 403, 'FORBIDDEN', 'Administrator access required');
}
function fields(body, map) {
  return Object.fromEntries(
    Object.entries(map)
      .filter(([k]) => body[k] !== undefined)
      .map(([k, col]) => [col, typeof body[k] === 'boolean' ? Number(body[k]) : body[k]]),
  );
}
function directoryScope(actor, resource) {
  if (actor.role === 'admin' || resource === 'academic-terms') return { sql: '1=1', values: [] };
  const s = scope(actor);
  const relate = {
    students: 'p.student_id=r.id',
    faculty: 'p.faculty_id=r.id',
    supervisors: 'p.supervisor_id=r.id',
    companies:
      'p.company_department_id IN (SELECT id FROM company_departments WHERE company_id=r.id)',
    'company-departments': 'p.company_department_id=r.id',
    'school-departments':
      '(p.school_department_id=r.id OR EXISTS (SELECT 1 FROM students ds WHERE ds.id=p.student_id AND ds.school_department_id=r.id))',
    requirements:
      'EXISTS (SELECT 1 FROM placement_requirements pr WHERE pr.placement_id=p.id AND pr.requirement_id=r.id)',
    'evaluation-criteria':
      'EXISTS (SELECT 1 FROM evaluations ev JOIN evaluation_scores es ON es.evaluation_id=ev.id WHERE ev.placement_id=p.id AND es.criterion_id=r.id)',
  }[resource];
  return {
    sql: 'EXISTS (SELECT 1 FROM placements p WHERE ' + s.sql + ' AND ' + relate + ')',
    values: s.values,
  };
}
async function list(pool, actor, resource, query, companyId) {
  const p = paging(query);
  const s = directoryScope(actor, resource);
  let from, select, search;
  if (['students', 'faculty', 'supervisors'].includes(resource)) {
    const t = { students: 'students', faculty: 'faculty', supervisors: 'company_supervisors' }[
      resource
    ];
    from = t + ' r JOIN users u ON u.id=r.user_id';
    select =
      resource === 'supervisors' && actor.role !== 'admin'
        ? 'r.id,r.user_id,r.company_department_id,r.position,u.full_name,u.is_active'
        : 'r.*,u.full_name,u.is_active';
    search = 'u.full_name';
  } else {
    const d = descriptors[resource];
    assert(d, 404, 'NOT_FOUND', 'Directory not found');
    from = d.table + ' r';
    select =
      actor.role === 'admin'
        ? 'r.*'
        : resource === 'companies'
          ? 'r.id,r.name,r.is_active'
          : resource === 'company-departments'
            ? 'r.id,r.company_id,r.department_name,r.is_active'
            : 'r.*';
    search = 'r.' + d.search;
  }
  let where = s.sql,
    values = [...s.values];
  if (companyId) {
    where += ' AND r.company_id=?';
    values.push(companyId);
  }
  if (p.search) {
    where += ' AND ' + search + " LIKE ? ESCAPE '!'";
    values.push(like(p.search));
  }
  const n = await one(pool, 'SELECT COUNT(*) AS n FROM ' + from + ' WHERE ' + where, values);
  const data = await rows(
    pool,
    'SELECT ' +
      select +
      ' FROM ' +
      from +
      ' WHERE ' +
      where +
      ' ORDER BY r.' +
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
async function detail(pool, actor, resource, key) {
  const s = directoryScope(actor, resource),
    d = descriptors[resource];
  let result;
  if (d)
    result = await one(pool, 'SELECT r.* FROM ' + d.table + ' r WHERE r.id=? AND ' + s.sql, [
      key,
      ...s.values,
    ]);
  else {
    const t = { students: 'students', faculty: 'faculty', supervisors: 'company_supervisors' }[
      resource
    ];
    result = await one(
      pool,
      'SELECT r.*,u.full_name,u.is_active FROM ' +
        t +
        ' r JOIN users u ON u.id=r.user_id WHERE r.id=? AND ' +
        s.sql,
      [key, ...s.values],
    );
  }
  assert(result, 404, 'NOT_FOUND', 'Record not found');
  if (actor.role !== 'admin' && resource === 'companies')
    return { id: result.id, name: result.name, is_active: result.is_active };
  if (actor.role !== 'admin' && resource === 'supervisors') delete result.contact_phone;
  return result;
}
async function save(pool, actor, resource, key, body, companyId) {
  admin(actor);
  const d = descriptors[resource];
  let schema = key ? d.schema.partial() : d.schema;
  if (key) {
    schema = schema
      .extend(resource === 'academic-terms' ? {} : { isActive: z.boolean().optional() })
      .strict();
    if (resource === 'school-departments') schema = schema.omit({ code: true });
  }
  body = schema.parse(body);
  return transaction(pool, async (c) => {
    const old = key
      ? await one(c, 'SELECT * FROM ' + d.table + ' WHERE id=? FOR UPDATE', [key])
      : null;
    if (key) assert(old, 404, 'NOT_FOUND', 'Record not found');
    const data = fields(body, { ...d.map, isActive: 'is_active' });
    if (resource === 'academic-terms') {
      const start = data.start_date || old?.start_date,
        end = data.end_date || old?.end_date;
      assert(end >= start, 422, 'VALIDATION_ERROR', 'End date must follow start date');
      if (key)
        assert(
          !(await one(c, 'SELECT id FROM placements WHERE academic_term_id=? LIMIT 1', [key])),
          409,
          'IMMUTABLE_RECORD',
          'A used term cannot be edited',
        );
    }
    if (resource === 'evaluation-criteria') {
      const version = old?.rubric_version || body.rubricVersion;
      await rows(
        c,
        'SELECT id FROM evaluation_criteria WHERE rubric_version=? ORDER BY id FOR UPDATE',
        [version],
      );
      if (await one(c, 'SELECT id FROM evaluations WHERE rubric_version=? LIMIT 1', [version]))
        assert(
          key && Object.keys(body).every((k) => k === 'isActive'),
          409,
          'IMMUTABLE_RECORD',
          'Create a new rubric version after use',
        );
    }
    if (companyId) {
      assert(
        await one(c, 'SELECT id FROM companies WHERE id=? AND is_active=1', [companyId]),
        422,
        'INVALID_REFERENCE',
        'Choose an active company',
      );
      data.company_id = companyId;
    }
    if (key) await update(c, d.table, key, data);
    else key = await insert(c, d.table, data);
    await audit(c, actor, resource + '.' + (old ? 'updated' : 'created'), resource, key, body);
    return one(c, 'SELECT * FROM ' + d.table + ' WHERE id=?', [key]);
  });
}
async function activate(pool, actor, key) {
  admin(actor);
  return transaction(pool, async (c) => {
    await rows(c, 'SELECT id FROM academic_terms ORDER BY id FOR UPDATE');
    assert(
      await one(c, 'SELECT id FROM academic_terms WHERE id=?', [key]),
      404,
      'NOT_FOUND',
      'Term not found',
    );
    await rows(c, 'UPDATE academic_terms SET is_active=0 WHERE is_active=1');
    await update(c, 'academic_terms', key, { is_active: 1 });
    await audit(c, actor, 'term.activated', 'academic_term', key);
    return one(c, 'SELECT * FROM academic_terms WHERE id=?', [key]);
  });
}
const profileMaps = {
  student: {
    studentNumber: 'student_number',
    course: 'course',
    yearLevel: 'year_level',
    schoolDepartmentId: 'school_department_id',
  },
  faculty: { employeeNumber: 'employee_number', schoolDepartmentId: 'school_department_id' },
  supervisor: {
    companyDepartmentId: 'company_department_id',
    position: 'position',
    contactPhone: 'contact_phone',
  },
  admin: {},
};
const profileTables = {
  student: 'students',
  faculty: 'faculty',
  supervisor: 'company_supervisors',
};
async function validateProfile(c, role, p) {
  if (p.schoolDepartmentId)
    assert(
      await one(c, 'SELECT id FROM school_departments WHERE id=? AND is_active=1', [
        p.schoolDepartmentId,
      ]),
      422,
      'INVALID_REFERENCE',
      'Select an active school department',
    );
  if (p.companyDepartmentId)
    assert(
      await one(
        c,
        'SELECT d.id FROM company_departments d JOIN companies co ON co.id=d.company_id WHERE d.id=? AND d.is_active=1 AND co.is_active=1',
        [p.companyDepartmentId],
      ),
      422,
      'INVALID_REFERENCE',
      'Select an active company department',
    );
}
async function createAccount(pool, actor, body) {
  admin(actor);
  body = createUser.parse(body);
  body.profile = profile[body.role].parse(body.profile);
  const hash = await bcrypt.hash(body.temporaryPassword, 12);
  return transaction(pool, async (c) => {
    await validateProfile(c, body.role, body.profile);
    const key = await insert(c, 'users', {
      email: body.email,
      full_name: body.fullName,
      role: body.role,
      password_hash: hash,
    });
    if (profileTables[body.role])
      await insert(c, profileTables[body.role], {
        user_id: key,
        ...fields(body.profile, profileMaps[body.role]),
      });
    await audit(c, actor, 'user.created', 'user', key, { email: body.email, role: body.role });
    return one(c, 'SELECT * FROM users WHERE id=?', [key]);
  });
}
async function userDetail(pool, actor, key) {
  assert(actor.role === 'admin' || actor.id === key, 404, 'NOT_FOUND', 'User not found');
  const u = await one(pool, 'SELECT * FROM users WHERE id=?', [key]);
  assert(u, 404, 'NOT_FOUND', 'User not found');
  return {
    ...u,
    profile: profileTables[u.role]
      ? await one(pool, 'SELECT * FROM ' + profileTables[u.role] + ' WHERE user_id=?', [key])
      : {},
  };
}
async function users(pool, actor, query) {
  admin(actor);
  const p = paging(query),
    v = p.search ? [like(p.search)] : [],
    where = p.search ? "full_name LIKE ? ESCAPE '!'" : '1=1';
  const count = await one(pool, 'SELECT COUNT(*) AS n FROM users WHERE ' + where, v);
  return {
    data: await rows(
      pool,
      'SELECT * FROM users WHERE ' +
        where +
        ' ORDER BY id DESC LIMIT ' +
        p.limit +
        ' OFFSET ' +
        (p.page - 1) * p.limit,
      v,
    ),
    meta: meta(p, Number(count.n)),
  };
}
async function editAccount(pool, actor, key, body) {
  const isAdmin = actor.role === 'admin';
  assert(isAdmin || key === actor.id, 404, 'NOT_FOUND', 'User not found');
  body = (
    isAdmin
      ? z
          .object({
            fullName: text(150).optional(),
            email: email.optional(),
            isActive: z.boolean().optional(),
            profile: z.unknown().optional(),
          })
          .strict()
      : z.object({ fullName: text(150) }).strict()
  ).parse(body);
  return transaction(pool, async (c) => {
    await rows(c, "SELECT id FROM users WHERE role='admin' ORDER BY id FOR UPDATE");
    const old = await one(c, 'SELECT * FROM users WHERE id=? FOR UPDATE', [key]);
    assert(old, 404, 'NOT_FOUND', 'User not found');
    const data = fields(body, { fullName: 'full_name', email: 'email', isActive: 'is_active' });
    if (body.isActive === false && old.is_active) {
      if (old.role === 'admin') {
        const n = await one(
          c,
          "SELECT COUNT(*) AS n FROM users WHERE role='admin' AND is_active=1",
        );
        assert(n.n > 1, 409, 'LAST_ADMIN', 'The last active administrator cannot be deactivated');
      }
      data.session_version = old.session_version + 1;
    }
    if (body.profile !== undefined) {
      assert(
        old.role !== 'admin',
        422,
        'VALIDATION_ERROR',
        'Administrator has no assignment profile',
      );
      const p = profile[old.role].partial().parse(body.profile);
      await validateProfile(c, old.role, p);
      if (Object.keys(p).length) {
        const assigned = await one(
          c,
          'SELECT id FROM placements WHERE ' +
            { student: 'student_id', faculty: 'faculty_id', supervisor: 'supervisor_id' }[
              old.role
            ] +
            ' IN (SELECT id FROM ' +
            profileTables[old.role] +
            ' WHERE user_id=?) LIMIT 1',
          [key],
        );
        if (assigned && old.role === 'supervisor' && p.companyDepartmentId)
          assert(
            false,
            409,
            'IMMUTABLE_RECORD',
            'Assigned supervisors cannot change host department',
          );
        const pr = await one(c, 'SELECT id FROM ' + profileTables[old.role] + ' WHERE user_id=?', [
          key,
        ]);
        await update(c, profileTables[old.role], pr.id, fields(p, profileMaps[old.role]));
      }
    }
    if (Object.keys(data).length) await update(c, 'users', key, data);
    else assert(body.profile !== undefined, 422, 'VALIDATION_ERROR', 'No fields supplied');
    await audit(
      c,
      actor,
      body.isActive === false ? 'user.deactivated' : 'user.updated',
      'user',
      key,
      body,
    );
    return one(c, 'SELECT * FROM users WHERE id=?', [key]);
  });
}
async function resetPassword(pool, actor, key, body) {
  admin(actor);
  body = z.object({ temporaryPassword: password }).strict().parse(body);
  const hash = await bcrypt.hash(body.temporaryPassword, 12);
  await transaction(pool, async (c) => {
    const old = await one(c, 'SELECT * FROM users WHERE id=? FOR UPDATE', [key]);
    assert(old, 404, 'NOT_FOUND', 'User not found');
    await update(c, 'users', key, {
      password_hash: hash,
      must_change_password: 1,
      session_version: old.session_version + 1,
    });
    await audit(c, actor, 'user.password_reset', 'user', key);
  });
}
module.exports = {
  list,
  detail,
  save,
  activate,
  createAccount,
  userDetail,
  users,
  editAccount,
  resetPassword,
};
