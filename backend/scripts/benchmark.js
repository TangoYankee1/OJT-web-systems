const fs = require('node:fs/promises'),
  path = require('node:path'),
  crypto = require('node:crypto'),
  bcrypt = require('bcryptjs'),
  { performance } = require('node:perf_hooks');
const { loadEnv, assertTest, backendRoot } = require('../src/config/env');
const { createPool } = require('../src/config/db');
const { rows, one, insert } = require('../src/shared/repository');
const { dashboard, reports } = require('../src/modules/reporting/reporting.service');
const { transaction } = require('../src/shared/transactions');
async function benchmark() {
  const env = loadEnv('.env.test');
  assertTest(env);
  const pool = createPool(env),
    tag = crypto.randomBytes(5).toString('hex');
  const ids = [],
    pids = [];
  let facultyId, schoolId, termId;
  try {
    const hash = await bcrypt.hash('Synthetic-benchmark-password-2026!', 12);
    const actor = { role: 'admin', id: null };
    await transaction(pool, async (c) => {
      schoolId = await insert(c, 'school_departments', {
        code: 'BENCH-' + tag,
        name: 'Synthetic benchmark department',
      });
      termId = await insert(c, 'academic_terms', {
        academic_year: '2096-2097',
        semester: tag,
        start_date: '2026-01-01',
        end_date: '2026-12-31',
      });
      const uid = await insert(c, 'users', {
        email: 'bench-f-' + tag + '@tests.invalid',
        password_hash: hash,
        full_name: 'Synthetic benchmark faculty',
        role: 'faculty',
      });
      ids.push(uid);
      facultyId = await insert(c, 'faculty', {
        user_id: uid,
        employee_number: 'BENCH-F-' + tag,
        school_department_id: schoolId,
      });
      for (let i = 0; i < 1000; i++) {
        const user = await insert(c, 'users', {
          email: 'bench-' + tag + '-' + i + '@tests.invalid',
          password_hash: hash,
          full_name: 'Synthetic benchmark ' + i,
          role: 'student',
        });
        ids.push(user);
        const st = await insert(c, 'students', {
          user_id: user,
          student_number: 'BENCH-' + tag + '-' + i,
          course: 'Synthetic IT',
          year_level: 4,
          school_department_id: schoolId,
        });
        const pid = await insert(c, 'placements', {
          student_id: st,
          faculty_id: facultyId,
          academic_term_id: termId,
          deployment_type: 'school',
          school_department_id: schoolId,
          start_date: '2026-01-01',
          end_date: '2026-12-31',
          required_minutes: 480,
          status: 'cancelled',
          status_remarks: 'Synthetic historical performance fixture',
        });
        pids.push(pid);
        await rows(
          c,
          'INSERT INTO placement_requirements (placement_id,requirement_id,title_snapshot,stage_snapshot,is_required_snapshot) SELECT ?,id,title,stage,is_required FROM requirements WHERE is_active=1',
          [pid],
        );
        const logs = [];
        for (let day = 1; day <= 10; day++) {
          const date = '2026-09-' + String(day).padStart(2, '0');
          logs.push([pid, date, date + ' 00:00:00', date + ' 01:00:00', 0, 60, 'approved']);
        }
        await c.query(
          'INSERT INTO duty_logs (placement_id,work_date,clock_in,clock_out,break_minutes,credited_minutes,status) VALUES ?',
          [logs],
        );
      }
    });
    const measurements = { list: [], dashboard: [] };
    for (let i = 0; i < 5; i++) {
      let start = performance.now();
      const result = await reports(pool, actor, { academicTermId: termId, limit: 20 });
      measurements.list.push(performance.now() - start);
      if (result.meta.total !== 1000) throw Error('Benchmark list count mismatch');
      start = performance.now();
      const d = await dashboard(pool, actor, 'admin', { academicTermId: termId });
      measurements.dashboard.push(performance.now() - start);
      if (d.approved_minutes !== 600000) throw Error('Benchmark duty total mismatch');
    }
    const [plan] = await pool.query(
      "EXPLAIN SELECT p.id FROM placements p WHERE p.academic_term_id=? AND p.status='cancelled' ORDER BY p.id DESC LIMIT 20",
      [termId],
    );
    const summary = Object.fromEntries(
      Object.entries(measurements).map(([key, values]) => [
        key,
        {
          samples: values.length,
          medianMs: Number([...values].sort((a, b) => a - b)[2].toFixed(2)),
          maxMs: Number(Math.max(...values).toFixed(2)),
        },
      ]),
    );
    const evidence = {
      measuredAt: new Date().toISOString(),
      fixture: { placements: 1000, dutyLogs: 10000, minutes: 600000 },
      targetMs: 500,
      measurements: summary,
      targetMet: Object.values(summary).every((s) => s.maxMs < 500),
      explain: plan.map((p) => ({
        table: p.table,
        type: p.type,
        possibleKeys: p.possible_keys,
        key: p.key,
        rows: p.rows,
        extra: p.Extra,
      })),
      scope: 'localhost synthetic demonstration; not institutional load acceptance',
    };
    await fs.writeFile(
      path.resolve(backendRoot, '../docs/evidence/performance.json'),
      JSON.stringify(evidence, null, 2) + '\n',
    );
    console.log(JSON.stringify(evidence, null, 2));
    if (!evidence.targetMet) throw Error('Demonstration response target exceeded');
  } finally {
    assertTest(env);
    if (pids.length) {
      const q = pids.map(() => '?').join(',');
      for (const table of ['duty_logs', 'placement_requirements'])
        await rows(pool, 'DELETE FROM ' + table + ' WHERE placement_id IN (' + q + ')', pids);
      await rows(pool, 'DELETE FROM placements WHERE id IN (' + q + ')', pids);
    }
    if (ids.length) {
      const q = ids.map(() => '?').join(',');
      await rows(pool, 'DELETE FROM students WHERE user_id IN (' + q + ')', ids);
      await rows(pool, 'DELETE FROM faculty WHERE user_id IN (' + q + ')', ids);
      await rows(pool, 'DELETE FROM users WHERE id IN (' + q + ')', ids);
    }
    if (schoolId) await rows(pool, 'DELETE FROM school_departments WHERE id=?', [schoolId]);
    if (termId) await rows(pool, 'DELETE FROM academic_terms WHERE id=?', [termId]);
    await pool.end();
  }
}
if (require.main === module)
  benchmark().catch((e) => {
    console.error(e.code || e.message);
    process.exitCode = 1;
  });
module.exports = { benchmark };
