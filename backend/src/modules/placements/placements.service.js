const repo = require('./placements.repository');
const { rows, one, insert, update } = repo;
const { transaction } = require('../../shared/transactions');
const { assert } = require('../../shared/errors');
const { facultyReviewer } = require('../../shared/scope');
const { audit } = require('../../shared/audit');
const { notify } = require('../../shared/notifications');
const { localDate } = require('../../shared/time');
const schemas = require('./placements.schemas');
const map = {
  studentId: 'student_id',
  facultyId: 'faculty_id',
  supervisorId: 'supervisor_id',
  academicTermId: 'academic_term_id',
  deploymentType: 'deployment_type',
  companyDepartmentId: 'company_department_id',
  schoolDepartmentId: 'school_department_id',
  startDate: 'start_date',
  endDate: 'end_date',
  requiredMinutes: 'required_minutes',
};
const mapped = (b) => Object.fromEntries(Object.entries(map).map(([k, v]) => [v, b[k] ?? null]));
async function validateReferences(c, p) {
  assert(p.end_date >= p.start_date, 422, 'VALIDATION_ERROR', 'Placement dates must be ordered');
  const st = await one(
    c,
    'SELECT s.id FROM students s JOIN users u ON u.id=s.user_id JOIN school_departments d ON d.id=s.school_department_id WHERE s.id=? AND u.is_active=1 AND d.is_active=1',
    [p.student_id],
  );
  const f = await one(
    c,
    'SELECT f.id FROM faculty f JOIN users u ON u.id=f.user_id WHERE f.id=? AND u.is_active=1',
    [p.faculty_id],
  );
  const term = await one(c, 'SELECT * FROM academic_terms WHERE id=?', [p.academic_term_id]);
  assert(
    st && f && term,
    422,
    'INVALID_REFERENCE',
    'Choose active student/faculty and a valid term',
  );
  assert(
    p.start_date >= term.start_date && p.end_date <= term.end_date,
    422,
    'INVALID_DATES',
    'Placement dates must fall inside the academic term',
  );
  if (p.deployment_type === 'company') {
    assert(
      p.company_department_id && !p.school_department_id,
      422,
      'INVALID_HOST',
      'Company placement requires only a company department',
    );
    assert(
      await one(
        c,
        'SELECT d.id FROM company_departments d JOIN companies co ON co.id=d.company_id WHERE d.id=? AND d.is_active=1 AND co.is_active=1',
        [p.company_department_id],
      ),
      422,
      'INVALID_HOST',
      'Company and department must be active',
    );
    if (p.supervisor_id)
      assert(
        await one(
          c,
          'SELECT v.id FROM company_supervisors v JOIN users u ON u.id=v.user_id WHERE v.id=? AND v.company_department_id=? AND u.is_active=1',
          [p.supervisor_id, p.company_department_id],
        ),
        422,
        'INVALID_SUPERVISOR',
        'Supervisor must be active and belong to the host department',
      );
  } else {
    assert(
      p.school_department_id && !p.company_department_id && !p.supervisor_id,
      422,
      'INVALID_HOST',
      'School placement requires only a school host',
    );
    assert(
      await one(c, 'SELECT id FROM school_departments WHERE id=? AND is_active=1', [
        p.school_department_id,
      ]),
      422,
      'INVALID_HOST',
      'School host must be active',
    );
  }
}
async function liveConflict(c, studentId, except = 0) {
  assert(
    !(await one(
      c,
      "SELECT id FROM placements WHERE student_id=? AND status IN ('pending','approved','active') AND id<>? LIMIT 1",
      [studentId, except],
    )),
    409,
    'LIVE_PLACEMENT_EXISTS',
    'This student already has a live placement',
  );
}
async function lockStudent(c, id) {
  assert(
    await one(c, 'SELECT id FROM students WHERE id=? FOR UPDATE', [id]),
    422,
    'INVALID_REFERENCE',
    'Student not found',
  );
}
async function create(pool, actor, body, dependencies = {}) {
  assert(actor.role === 'admin', 403, 'FORBIDDEN', 'Administrator creates placements');
  body = schemas.placement.parse(body);
  const data = mapped(body);
  return transaction(pool, async (c) => {
    await lockStudent(c, data.student_id);
    await liveConflict(c, data.student_id);
    await validateReferences(c, data);
    const id = await insert(c, 'placements', data);
    await (dependencies.copyRequirements || repo.copyRequirements)(c, id);
    await audit(c, actor, 'placement.created', 'placement', id, body);
    const p = await repo.placement(c, actor, id);
    await notify(
      c,
      p.student_user_id,
      'placement.created',
      'placement',
      id,
      'A placement was created for you',
    );
    return p;
  });
}
async function progress(c, actor, id) {
  const p = await repo.placement(c, actor, id);
  const r = await one(
    c,
    "SELECT COALESCE(SUM(is_required_snapshot=1),0) AS required_count,COALESCE(SUM(is_required_snapshot=1 AND status='approved'),0) AS approved_count,COALESCE(SUM(status='submitted'),0) AS submitted_count FROM placement_requirements WHERE placement_id=?",
    [id],
  );
  const d = await one(
    c,
    "SELECT COALESCE(SUM(CASE WHEN status='approved' THEN credited_minutes ELSE 0 END),0) AS approved_minutes,COALESCE(SUM(CASE WHEN status='submitted' THEN credited_minutes ELSE 0 END),0) AS pending_minutes,COALESCE(SUM(status='submitted'),0) AS submitted_count FROM duty_logs WHERE placement_id=?",
    [id],
  );
  const evaluations = await rows(
    c,
    "SELECT type FROM evaluations WHERE placement_id=? AND status='finalized'",
    [id],
  );
  const requiredCount = Number(r.required_count),
    approvedRequirementCount = Number(r.approved_count),
    approvedMinutes = Number(d.approved_minutes),
    pendingMinutes = Number(d.pending_minutes),
    blockingReasons = [];
  if (approvedRequirementCount < requiredCount)
    blockingReasons.push('Required documents are not all approved');
  if (approvedMinutes < p.required_minutes)
    blockingReasons.push('Approved duty minutes are below the requirement');
  for (const type of ['midterm', 'final'])
    if (!evaluations.some((e) => e.type === type))
      blockingReasons.push('A finalized ' + type + ' evaluation is required');
  if (Number(r.submitted_count) || Number(d.submitted_count))
    blockingReasons.push('Submitted documents or duty logs still need review');
  return {
    placementId: id,
    requiredCount,
    approvedRequirementCount,
    submittedRequirementCount: Number(r.submitted_count),
    approvedMinutes,
    pendingMinutes,
    requiredMinutes: p.required_minutes,
    hoursPercent: Math.min(100, (approvedMinutes / p.required_minutes) * 100),
    requirementsPercent: requiredCount ? (approvedRequirementCount / requiredCount) * 100 : 100,
    completionEligible: blockingReasons.length === 0,
    blockingReasons,
  };
}
async function edit(pool, actor, id, body) {
  assert(actor.role === 'admin', 403, 'FORBIDDEN', 'Administrator access required');
  body = schemas.placement.omit({ studentId: true }).partial().parse(body);
  assert(Object.keys(body).length, 422, 'VALIDATION_ERROR', 'No changes supplied');
  return transaction(pool, async (c) => {
    const initial = await repo.placement(c, actor, id);
    await lockStudent(c, initial.student_id);
    const p = await repo.placement(c, actor, id, true);
    assert(
      p.status === 'pending',
      409,
      'IMMUTABLE_RECORD',
      'Only pending placements can be edited',
    );
    const data = { ...p };
    for (const [k, v] of Object.entries(body)) data[map[k]] = v;
    await validateReferences(c, data);
    await liveConflict(c, p.student_id, id);
    await update(
      c,
      'placements',
      id,
      Object.fromEntries(Object.keys(body).map((k) => [map[k], body[k]])),
    );
    await audit(c, actor, 'placement.updated', 'placement', id, body);
    return repo.placement(c, actor, id);
  });
}
async function transition(pool, actor, id, body) {
  body = schemas.status.parse(body);
  return transaction(pool, async (c) => {
    const initial = await repo.placement(c, actor, id);
    await lockStudent(c, initial.student_id);
    const p = await repo.placement(c, actor, id, true);
    const allowed = {
      pending: ['approved', 'rejected', 'cancelled'],
      approved: ['active', 'cancelled'],
      active: ['completed', 'cancelled'],
    };
    assert(
      allowed[p.status]?.includes(body.status),
      409,
      'INVALID_TRANSITION',
      'Placement transition is not allowed',
    );
    if (['active', 'cancelled'].includes(body.status))
      assert(actor.role === 'admin', 403, 'FORBIDDEN', 'Administrator access required');
    else facultyReviewer(actor, p);
    if (['cancelled', 'rejected'].includes(body.status))
      assert(body.remarks, 422, 'REMARKS_REQUIRED', 'A reason is required');
    if (['approved', 'active'].includes(body.status)) {
      await liveConflict(c, p.student_id, id);
      const missing = await one(
        c,
        "SELECT id FROM placement_requirements WHERE placement_id=? AND stage_snapshot='pre_deployment' AND is_required_snapshot=1 AND status<>'approved' LIMIT 1",
        [id],
      );
      assert(
        !missing,
        409,
        'PRE_DEPLOYMENT_BLOCKED',
        'Required pre-deployment documents must be approved',
      );
    }
    if (body.status === 'active') {
      await validateReferences(c, p);
      assert(
        localDate() >= p.start_date,
        409,
        'START_DATE_NOT_REACHED',
        'Start date has not been reached',
      );
      assert(localDate() <= p.end_date, 409, 'PLACEMENT_EXPIRED', 'Placement end date has passed');
      assert(
        p.deployment_type !== 'company' || p.supervisor_id,
        422,
        'SUPERVISOR_REQUIRED',
        'Assign an active supervisor before activation',
      );
    }
    if (body.status === 'completed') {
      const state = await progress(c, actor, id);
      assert(
        state.completionEligible,
        409,
        'COMPLETION_BLOCKED',
        'Placement is not eligible for completion',
        { blockingReasons: state.blockingReasons },
      );
    }
    await update(c, 'placements', id, {
      status: body.status,
      status_remarks: body.remarks || null,
    });
    await audit(c, actor, 'placement.status_changed', 'placement', id, {
      before: p.status,
      after: body.status,
      remarks: body.remarks,
    });
    await notify(
      c,
      p.student_user_id,
      'placement.status_changed',
      'placement',
      id,
      'Your placement is now ' + body.status,
    );
    return repo.placement(c, actor, id);
  });
}
module.exports = {
  create,
  edit,
  transition,
  progress,
  validateReferences,
  lockStudent,
  liveConflict,
};
