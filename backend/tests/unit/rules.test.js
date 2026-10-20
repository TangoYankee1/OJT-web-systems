const { test } = require('node:test'),
  assert = require('node:assert/strict');
const { dutyInterval, grade } = require('../../src/shared/time');
const { redact } = require('../../src/shared/audit');
const { password } = require('../../src/middleware/validate');
const { assertTest } = require('../../src/config/env');
const p = { start_date: '2026-01-01', end_date: '2026-12-31' },
  now = new Date('2026-10-20T12:00:00Z');
test('whole-minute Manila duty computes 480 approved-eligible minutes', () =>
  assert.equal(
    dutyInterval(
      {
        clockIn: '2026-10-20T08:00:00+08:00',
        clockOut: '2026-10-20T17:00:00+08:00',
        breakMinutes: 60,
      },
      p,
      480,
      now,
    ).credited_minutes,
    480,
  ));
test('reverse, overnight, ambiguous and excess logs fail', () => {
  for (const [clockIn, clockOut, code] of [
    ['2026-10-20T17:00:00+08:00', '2026-10-20T08:00:00+08:00', 'INVALID_INTERVAL'],
    ['2026-10-19T22:00:00+08:00', '2026-10-20T06:00:00+08:00', 'OVERNIGHT_NOT_SUPPORTED'],
    ['2026-10-20T08:00:00', '2026-10-20T09:00:00', 'INVALID_CLOCK'],
    ['2026-10-20T08:00:00+08:00', '2026-10-20T18:00:00+08:00', 'DAILY_LIMIT_EXCEEDED'],
  ])
    assert.throws(
      () => dutyInterval({ clockIn, clockOut, breakMinutes: 0 }, p, 480, now),
      (e) => e.code === code,
    );
});
test('rubric percentage uses total maxima, 81/100=81%', () =>
  assert.equal(
    grade([
      { max_score_snapshot: '60.00', score: '45.00' },
      { max_score_snapshot: '40.00', score: '36.00' },
    ]),
    81,
  ));
test('bcrypt password limits use UTF-8 bytes', () => {
  assert.throws(() => password.parse('a'.repeat(73)));
  assert.throws(() => password.parse('\u00e9'.repeat(37)));
  assert.equal(password.parse('a'.repeat(12)).length, 12);
});
test('audit recursively redacts credentials', () =>
  assert.deepEqual(redact({ password: 'secret', safe: { token: 'secret', status: 'active' } }), {
    safe: { status: 'active' },
  }));
test('reset refuses live and ambiguous database configurations', () => {
  assert.throws(() =>
    assertTest({ NODE_ENV: 'development', DB_NAME: 'x_test', UPLOAD_ROOT: 'test-private' }),
  );
  assert.throws(() =>
    assertTest({ NODE_ENV: 'test', DB_NAME: 'ojt_monitoring', UPLOAD_ROOT: 'test-private' }),
  );
});

test('IDs accept integer route strings and reject booleans or arrays', () => {
  const { id } = require('../../src/middleware/validate');
  assert.equal(id.parse('42'), 42);
  for (const value of [true, false, null, [1], 0, -1, 1.2, 'abc'])
    assert.throws(() => id.parse(value));
});

test('malformed multibyte CSRF headers fail with 403 instead of a buffer-length error', () => {
  const { csrf } = require('../../src/middleware/csrf');
  let error;
  const req = {
    method: 'POST',
    session: { csrfToken: 'a'.repeat(64) },
    get: (name) =>
      name === 'origin'
        ? 'http://localhost:5173'
        : name === 'x-csrf-token'
          ? '\u00e9'.repeat(64)
          : undefined,
  };
  csrf({ APP_ORIGIN: 'http://localhost:5173' })(req, {}, (e) => (error = e));
  assert.equal(error.status, 403);
  assert.equal(error.code, 'CSRF_INVALID');
});
