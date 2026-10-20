const { assert } = require('./errors');
function localDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
function sqlUtc(value) {
  return new Date(value).toISOString().slice(0, 23).replace('T', ' ');
}
function dutyInterval(body, placement, limit = 480, now = new Date()) {
  const re = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\+08:00$/;
  assert(
    re.test(body.clockIn) && re.test(body.clockOut),
    422,
    'INVALID_CLOCK',
    'Clock values require +08:00 and whole-minute precision',
  );
  const day = body.clockIn.slice(0, 10);
  assert(
    day === body.clockOut.slice(0, 10),
    422,
    'OVERNIGHT_NOT_SUPPORTED',
    'Overnight duty is not supported',
  );
  const start = Date.parse(body.clockIn),
    end = Date.parse(body.clockOut);
  assert(
    Number.isFinite(start) &&
      Number.isFinite(end) &&
      new Date(start + 28800000).toISOString().slice(0, 16) === body.clockIn.slice(0, 16) &&
      new Date(end + 28800000).toISOString().slice(0, 16) === body.clockOut.slice(0, 16),
    422,
    'INVALID_CLOCK',
    'Invalid calendar date or time',
  );
  assert(end > start, 422, 'INVALID_INTERVAL', 'Clock out must follow clock in');
  assert(end <= now.getTime(), 422, 'FUTURE_LOG', 'Duty cannot be in the future');
  assert(
    day >= placement.start_date && day <= placement.end_date,
    422,
    'OUTSIDE_PLACEMENT',
    'Duty must fall within placement dates',
  );
  const elapsed = (end - start) / 60000,
    minutes = elapsed - body.breakMinutes;
  assert(minutes > 0, 422, 'INVALID_BREAK', 'Break must be shorter than the interval');
  assert(minutes <= limit, 422, 'DAILY_LIMIT_EXCEEDED', 'Daily duty limit exceeded');
  return {
    work_date: day,
    clock_in: sqlUtc(body.clockIn),
    clock_out: sqlUtc(body.clockOut),
    break_minutes: body.breakMinutes,
    credited_minutes: minutes,
  };
}
function grade(scores) {
  const max = scores.reduce((s, x) => s + Math.round(Number(x.max_score_snapshot) * 100), 0);
  const total = scores.reduce((s, x) => s + Math.round(Number(x.score || 0) * 100), 0);
  assert(max > 0, 422, 'INVALID_RUBRIC', 'Rubric maximum must be positive');
  return Math.round((total / max) * 10000) / 100;
}
module.exports = { localDate, sqlUtc, dutyInterval, grade };
