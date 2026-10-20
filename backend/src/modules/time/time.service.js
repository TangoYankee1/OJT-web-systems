const repo = require('./time.repository');
const { transaction } = require('../../shared/transactions');
const { assert } = require('../../shared/errors');
const { placement, owner, mutable, dutyReviewer } = require('../../shared/scope');
const { dutyInterval } = require('../../shared/time');
const { audit } = require('../../shared/audit');
const { notify } = require('../../shared/notifications');
const schema = require('./time.schemas');
async function list(c, actor, id, table) {
  await placement(c, actor, id);
  return repo.rows(c, 'SELECT * FROM ' + table + ' WHERE placement_id=? ORDER BY id DESC', [id]);
}
async function validateLog(c, p, body, id, env, checkDaily = false) {
  const data = dutyInterval(body, p, env.DAILY_LIMIT_MINUTES);
  const overlapping = await repo.one(
    c,
    'SELECT id FROM duty_logs WHERE placement_id=? AND id<>? AND clock_in<? AND clock_out>? LIMIT 1',
    [p.id, id || 0, data.clock_out, data.clock_in],
  );
  assert(!overlapping, 409, 'DUTY_OVERLAP', 'This duty interval overlaps a retained log');
  if (checkDaily) {
    const day = await repo.one(
      c,
      "SELECT COALESCE(SUM(credited_minutes),0) AS minutes FROM duty_logs WHERE placement_id=? AND work_date=? AND id<>? AND status IN ('submitted','approved')",
      [p.id, data.work_date, id || 0],
    );
    assert(
      Number(day.minutes) + data.credited_minutes <= env.DAILY_LIMIT_MINUTES,
      422,
      'DAILY_LIMIT_EXCEEDED',
      'Submitted and approved minutes exceed the daily limit',
    );
  }
  return data;
}
function bodyFrom(row) {
  const clock = (s) =>
    new Date(new Date(s.replace(' ', 'T') + 'Z').getTime() + 28800000).toISOString().slice(0, 19) +
    '+08:00';
  return {
    clockIn: clock(row.clock_in),
    clockOut: clock(row.clock_out),
    breakMinutes: row.break_minutes,
  };
}
async function createLog(pool, actor, id, body, env) {
  body = schema.duty.parse(body);
  return transaction(pool, async (c) => {
    const p = await placement(c, actor, id, true);
    owner(actor, p);
    assert(p.status === 'active', 409, 'PLACEMENT_NOT_ACTIVE', 'Duty requires an active placement');
    const data = await validateLog(c, p, body, null, env);
    const key = await repo.insert(c, 'duty_logs', { placement_id: id, ...data });
    await audit(c, actor, 'duty_log.created', 'duty_log', key, {
      workDate: data.work_date,
      creditedMinutes: data.credited_minutes,
    });
    return repo.one(c, 'SELECT * FROM duty_logs WHERE id=?', [key]);
  });
}
async function editLog(pool, actor, id, body, env, remove = false) {
  body = remove
    ? require('../../middleware/validate').empty.parse(body)
    : schema.duty.partial().parse(body);
  return transaction(pool, async (c) => {
    const { p, row } = await repo.child(c, actor, 'duty_logs', id, true);
    owner(actor, p);
    assert(p.status === 'active', 409, 'PLACEMENT_NOT_ACTIVE', 'Duty requires an active placement');
    assert(
      ['draft', 'rejected'].includes(row.status),
      409,
      'IMMUTABLE_RECORD',
      'Only draft/rejected duty can be edited',
    );
    if (remove) await repo.rows(c, 'DELETE FROM duty_logs WHERE id=?', [id]);
    else {
      assert(Object.keys(body).length, 422, 'VALIDATION_ERROR', 'No changes supplied');
      const data = await validateLog(c, p, { ...bodyFrom(row), ...body }, id, env);
      await repo.update(c, 'duty_logs', id, data);
    }
    await audit(c, actor, remove ? 'duty_log.deleted' : 'duty_log.updated', 'duty_log', id);
    return remove ? null : repo.one(c, 'SELECT * FROM duty_logs WHERE id=?', [id]);
  });
}
async function action(pool, actor, id, kind, body, env) {
  body = (
    kind === 'review'
      ? schema.review
      : kind === 'reopen'
        ? schema.reopen
        : require('../../middleware/validate').empty
  ).parse(body);
  return transaction(pool, async (c) => {
    const { p, row } = await repo.child(c, actor, 'duty_logs', id, true);
    assert(
      p.status === 'active',
      409,
      'PLACEMENT_NOT_ACTIVE',
      'Duty changes require an active placement',
    );
    let status;
    if (kind === 'submit') {
      owner(actor, p);
      assert(
        ['draft', 'rejected'].includes(row.status),
        409,
        'INVALID_TRANSITION',
        'Only draft/rejected duty can be submitted',
      );
      status = 'submitted';
    } else {
      dutyReviewer(actor, p, body.remarks);
      assert(
        row.status === (kind === 'reopen' ? 'approved' : 'submitted'),
        409,
        'INVALID_TRANSITION',
        'Duty is not in a reviewable state',
      );
      status = kind === 'reopen' ? 'rejected' : body.decision;
      if (status === 'rejected')
        assert(body.remarks, 422, 'REMARKS_REQUIRED', 'A reason is required');
    }
    if (status === 'submitted' || status === 'approved')
      await validateLog(c, p, bodyFrom(row), id, env, true);
    await repo.update(c, 'duty_logs', id, {
      status,
      reviewed_by: kind === 'submit' ? null : actor.id,
      reviewed_at: kind === 'submit' ? null : new Date(),
      remarks: body.remarks || null,
    });
    await audit(
      c,
      actor,
      'duty_log.' + (kind === 'review' ? 'reviewed' : kind === 'submit' ? 'submitted' : 'reopened'),
      'duty_log',
      id,
      { status, remarks: body.remarks },
    );
    await notify(
      c,
      kind === 'submit'
        ? p.deployment_type === 'company'
          ? p.supervisor_user_id
          : p.faculty_user_id
        : p.student_user_id,
      'duty_log.' + kind,
      'placement',
      p.id,
      kind === 'submit' ? 'A duty log needs review' : 'Your duty log is ' + status,
    );
    return repo.one(c, 'SELECT * FROM duty_logs WHERE id=?', [id]);
  });
}
function scheduleActor(actor, p) {
  assert(
    actor.role === 'admin' ||
      (p.deployment_type === 'company' ? p.supervisor_user_id : p.faculty_user_id) === actor.id,
    403,
    'FORBIDDEN',
    'Assigned duty reviewer or administrator required',
  );
}
function scheduleData(body, p) {
  assert(
    body.effectiveTo >= body.effectiveFrom &&
      body.effectiveFrom >= p.start_date &&
      body.effectiveTo <= p.end_date,
    422,
    'INVALID_DATES',
    'Schedule must fit within placement dates',
  );
  const mins = (s) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
  assert(
    mins(body.endTime) > mins(body.startTime) &&
      body.breakMinutes < mins(body.endTime) - mins(body.startTime),
    422,
    'INVALID_INTERVAL',
    'Schedule times or break are invalid',
  );
  return {
    weekday: body.weekday,
    start_time: body.startTime,
    end_time: body.endTime,
    break_minutes: body.breakMinutes,
    effective_from: body.effectiveFrom,
    effective_to: body.effectiveTo,
  };
}
async function saveSchedule(pool, actor, id, body, edit = false, remove = false) {
  body = (
    remove
      ? require('../../middleware/validate').empty
      : edit
        ? schema.schedule.partial()
        : schema.schedule
  ).parse(body);
  return transaction(pool, async (c) => {
    let p, row;
    if (edit || remove) ({ p, row } = await repo.child(c, actor, 'work_schedules', id, true));
    else p = await placement(c, actor, id, true);
    scheduleActor(actor, p);
    mutable(p);
    if (remove) await repo.rows(c, 'DELETE FROM work_schedules WHERE id=?', [id]);
    else {
      const previous = row
        ? {
            weekday: row.weekday,
            startTime: row.start_time.slice(0, 5),
            endTime: row.end_time.slice(0, 5),
            breakMinutes: row.break_minutes,
            effectiveFrom: row.effective_from,
            effectiveTo: row.effective_to,
          }
        : {};
      const data = scheduleData({ ...previous, ...body }, p);
      if (edit) await repo.update(c, 'work_schedules', id, data);
      else id = await repo.insert(c, 'work_schedules', { placement_id: p.id, ...data });
    }
    await audit(
      c,
      actor,
      remove ? 'schedule.deleted' : edit ? 'schedule.updated' : 'schedule.created',
      'work_schedule',
      id,
    );
    return remove ? null : repo.one(c, 'SELECT * FROM work_schedules WHERE id=?', [id]);
  });
}
module.exports = { list, createLog, editLog, action, saveSchedule, validateLog };
