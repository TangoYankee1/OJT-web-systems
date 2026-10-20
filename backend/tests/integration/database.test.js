const { test } = require('node:test'),
  assert = require('node:assert/strict');
const { loadEnv, assertTest } = require('../../src/config/env');
const { createPool } = require('../../src/config/db');
const { migrate } = require('../../scripts/migrate');
const { referenceSeed } = require('../../scripts/seed');
const { rows, one } = require('../../src/shared/repository');
test('real MariaDB migrations, seed idempotency, constraints and restricted runtime account', async () => {
  const env = loadEnv('.env.test');
  assertTest(env);
  await migrate(env);
  const p = createPool(env);
  try {
    await referenceSeed(p);
    const before = await one(p, 'SELECT COUNT(*) n FROM requirements');
    await referenceSeed(p);
    assert.deepEqual(await one(p, 'SELECT COUNT(*) n FROM requirements'), before);
    assert.equal((await one(p, 'SELECT COUNT(*) n FROM schema_migrations')).n, 6);
    assert.equal((await one(p, 'SELECT @@session.time_zone AS tz')).tz, '+00:00');
    await assert.rejects(
      rows(p, 'CREATE TABLE forbidden_runtime_ddl (id INT)'),
      (e) => e.code === 'ER_TABLEACCESS_DENIED_ERROR',
    );
    await assert.rejects(
      rows(
        p,
        "INSERT INTO students (user_id,student_number,course,year_level,school_department_id) VALUES (4294967294,'INVALID-FK','IT',4,4294967294)",
      ),
      (e) => e.code === 'ER_NO_REFERENCED_ROW_2',
    );
    await assert.rejects(
      rows(p, "INSERT INTO school_departments (code,name) VALUES ('DEMO-IT','Duplicate')"),
      (e) => e.code === 'ER_DUP_ENTRY',
    );
    await assert.rejects(
      rows(
        p,
        "INSERT INTO academic_terms (academic_year,semester,start_date,end_date) VALUES ('9998-9999','INVALID','2026-10-20','2026-01-01')",
      ),
      (e) =>
        e.errno === 4025 ||
        ['ER_CONSTRAINT_FAILED', 'ER_CHECK_CONSTRAINT_VIOLATED'].includes(e.code),
    );
  } finally {
    await p.end();
  }
});
