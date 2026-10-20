const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises'),
  path = require('node:path'),
  crypto = require('node:crypto');
const request = require('supertest'),
  bcrypt = require('bcryptjs');
const { loadEnv, assertTest } = require('../../src/config/env');
const { createPool } = require('../../src/config/db');
const { createSession } = require('../../src/config/session');
const { createApp } = require('../../src/app');
const { rows, one, insert, serialize } = require('../../src/shared/repository');
const { referenceSeed } = require('../../scripts/seed');
const directory = require('../../src/modules/directories/directories.service');
const placements = require('../../src/modules/placements/placements.service');
const files = require('../../src/modules/files/files.service');
const { localDate } = require('../../src/shared/time');
const testPassword = 'Synthetic-test-password-2026!';
async function raceWhilePlacementLocked(pool, placementId, action, mutate) {
  const holder = await pool.getConnection();
  let signal, timeout, pending;
  const barrier = new Promise((resolve) => (signal = resolve));
  const observed = {
    getConnection: async () => {
      const c = await pool.getConnection();
      return new Proxy(c, {
        get(target, key) {
          if (key === 'execute')
            return (sql, values) => {
              const result = target.execute(sql, values);
              if (sql.includes('FROM placements p') && sql.includes('FOR UPDATE')) signal();
              return result;
            };
          const value = target[key];
          return typeof value === 'function' ? value.bind(target) : value;
        },
      });
    },
  };
  try {
    await holder.beginTransaction();
    await holder.execute('SELECT id FROM placements WHERE id=? FOR UPDATE', [placementId]);
    pending = action(observed).then(
      (value) => ({ value }),
      (error) => ({ error }),
    );
    await Promise.race([
      barrier,
      new Promise((resolve, reject) => {
        timeout = setTimeout(
          () => reject(Error('Concurrent action never reached placement lock')),
          10000,
        );
      }),
    ]);
    clearTimeout(timeout);
    await mutate(holder);
    await holder.commit();
    return await pending;
  } finally {
    clearTimeout(timeout);
    await holder.rollback();
    holder.release();
    if (pending) await pending;
  }
}

function shifted(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return localDate(d);
}
test('real MariaDB HTTP workflows and authorization boundaries', { timeout: 180000 }, async (t) => {
  const env = loadEnv('.env.test');
  assertTest(env);
  const pool = createPool(env);
  await fs.mkdir(path.join(env.UPLOAD_ROOT, '.staging'), { recursive: true });
  await referenceSeed(pool);
  const session = await createSession(pool, env);
  const app = createApp({ pool, env, sessionMiddleware: session.middleware });
  const tag = crypto.randomBytes(5).toString('hex');
  const ids = [],
    fixtureFiles = [];
  let admin,
    term,
    school,
    host,
    host2,
    faculty1,
    faculty2,
    student1,
    student2,
    supervisor1,
    supervisor2,
    pid,
    schoolPid,
    finalEval;
  const actors = {},
    agents = {};
  async function actor(role, n, profile) {
    const user = await directory.createAccount(pool, admin, {
      email: role + n + '-' + tag + '@tests.invalid',
      fullName: role + ' ' + n + ' ' + tag,
      role,
      temporaryPassword: testPassword,
      profile,
    });
    ids.push(user.id);
    await rows(pool, 'UPDATE users SET must_change_password=0 WHERE id=?', [user.id]);
    const u = await one(pool, 'SELECT * FROM users WHERE id=?', [user.id]);
    const tables = { faculty: 'faculty', student: 'students', supervisor: 'company_supervisors' };
    const pr = tables[role]
      ? await one(pool, 'SELECT * FROM ' + tables[role] + ' WHERE user_id=?', [u.id])
      : {};
    actors[role + n] = u;
    return pr;
  }
  async function login(name, user) {
    const agent = request.agent(app);
    let csrf = (await agent.get('/api/auth/csrf').expect(200)).body.data.csrfToken;
    const response = await agent
      .post('/api/auth/login')
      .set('Origin', env.APP_ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ email: user.email, password: testPassword })
      .expect(200);
    assert(!('passwordHash' in response.body.data));
    csrf = (await agent.get('/api/auth/csrf').expect(200)).body.data.csrfToken;
    agents[name] = { agent, csrf };
    return agents[name];
  }
  async function call(name, method, url, body = {}, expected = 200) {
    const a = agents[name];
    return a.agent[method]('/api' + url)
      .set('Origin', env.APP_ORIGIN)
      .set('X-CSRF-Token', a.csrf)
      .send(body)
      .expect(expected);
  }
  async function upload(
    name,
    id,
    buffer = Buffer.from('%PDF-1.4\nSynthetic document\n%%EOF'),
    filename = 'test.pdf',
    mime = 'application/pdf',
    expected = 201,
  ) {
    const a = agents[name];
    return a.agent
      .post('/api/placement-requirements/' + id + '/uploads')
      .set('Origin', env.APP_ORIGIN)
      .set('X-CSRF-Token', a.csrf)
      .attach('file', buffer, { filename, contentType: mime })
      .expect(expected);
  }
  const placementBody = () => ({
    studentId: student1.id,
    facultyId: faculty1.id,
    supervisorId: supervisor1.id,
    academicTermId: term,
    deploymentType: 'company',
    companyDepartmentId: host,
    startDate: shifted(-10),
    endDate: shifted(60),
    requiredMinutes: 180,
  });
  try {
    await t.test('create atomic prerequisites and all seven role fixtures', async () => {
      const hash = await bcrypt.hash(testPassword, 12);
      const aid = await insert(pool, 'users', {
        email: 'admin-' + tag + '@tests.invalid',
        password_hash: hash,
        full_name: 'Synthetic admin ' + tag,
        role: 'admin',
        must_change_password: 0,
      });
      ids.push(aid);
      admin = await one(pool, 'SELECT * FROM users WHERE id=?', [aid]);
      actors.admin1 = admin;
      school = (
        await directory.save(pool, admin, 'school-departments', null, {
          code: 'T-' + tag,
          name: 'Synthetic school',
        })
      ).id;
      term = (
        await directory.save(pool, admin, 'academic-terms', null, {
          academicYear: '2098-2099',
          semester: tag,
          startDate: shifted(-30),
          endDate: shifted(100),
        })
      ).id;
      await directory.activate(pool, admin, term);
      const company = (
        await directory.save(pool, admin, 'companies', null, {
          name: '=Unsafe ' + tag,
          address: 'Synthetic test address',
        })
      ).id;
      const company2 = (
        await directory.save(pool, admin, 'companies', null, {
          name: 'Other ' + tag,
          address: 'Synthetic test address',
        })
      ).id;
      host = (
        await directory.save(
          pool,
          admin,
          'company-departments',
          null,
          { departmentName: 'Host one' },
          company,
        )
      ).id;
      host2 = (
        await directory.save(
          pool,
          admin,
          'company-departments',
          null,
          { departmentName: 'Host two' },
          company2,
        )
      ).id;
      faculty1 = await actor('faculty', 1, {
        employeeNumber: 'F1-' + tag,
        schoolDepartmentId: school,
      });
      faculty2 = await actor('faculty', 2, {
        employeeNumber: 'F2-' + tag,
        schoolDepartmentId: school,
      });
      student1 = await actor('student', 1, {
        studentNumber: 'S1-' + tag,
        course: 'IT',
        yearLevel: 4,
        schoolDepartmentId: school,
      });
      student2 = await actor('student', 2, {
        studentNumber: 'S2-' + tag,
        course: 'IT',
        yearLevel: 4,
        schoolDepartmentId: school,
      });
      supervisor1 = await actor('supervisor', 1, { companyDepartmentId: host });
      supervisor2 = await actor('supervisor', 2, { companyDepartmentId: host2 });
      for (const [name, user] of Object.entries(actors)) await login(name, user);
    });
    await t.test(
      'CSRF, refresh session, self-escalation, profile transaction rollback and duplicate handling',
      async () => {
        await agents.student1.agent.get('/api/auth/me').expect(200);
        await agents.student1.agent
          .post('/api/auth/logout')
          .set('Origin', env.APP_ORIGIN)
          .send({})
          .expect(403);
        await call('student1', 'patch', '/users/' + actors.student1.id, { role: 'admin' }, 422);
        await call('student1', 'get', '/users', {}, 403);
        const response = await call(
          'admin1',
          'post',
          '/users',
          {
            email: 'bad-' + tag + '@tests.invalid',
            fullName: 'Bad profile',
            role: 'student',
            temporaryPassword: testPassword,
            profile: {
              studentNumber: 'BAD-' + tag,
              course: 'IT',
              yearLevel: 4,
              schoolDepartmentId: 4294967294,
            },
          },
          422,
        );
        assert.equal(
          await one(pool, 'SELECT id FROM users WHERE email=?', ['bad-' + tag + '@tests.invalid']),
          undefined,
        );
        await call(
          'admin1',
          'post',
          '/school-departments',
          { code: 'T-' + tag, name: 'Duplicate' },
          409,
        );
      },
    );
    await t.test(
      'placement copy failure rolls back business, audit and notification writes',
      async () => {
        const before = await one(pool, 'SELECT COUNT(*) n FROM audit_logs WHERE actor_id=?', [
          admin.id,
        ]);
        await assert.rejects(
          placements.create(pool, admin, placementBody(), {
            copyRequirements: async () => {
              throw new Error('injected copy failure');
            },
          }),
        );
        assert.equal(
          await one(pool, 'SELECT id FROM placements WHERE student_id=?', [student1.id]),
          undefined,
        );
        assert.deepEqual(
          await one(pool, 'SELECT COUNT(*) n FROM audit_logs WHERE actor_id=?', [admin.id]),
          before,
        );
      },
    );
    await t.test('database host CHECK and assignment validation reject invalid hosts', async () => {
      await assert.rejects(
        rows(
          pool,
          "INSERT INTO placements (student_id,faculty_id,academic_term_id,deployment_type,start_date,end_date,required_minutes) VALUES (?,?,?,'company',?,?,180)",
          [student1.id, faculty1.id, term, shifted(-10), shifted(60)],
        ),
        (e) => e.errno === 4025,
      );
      await call(
        'admin1',
        'post',
        '/placements',
        { ...placementBody(), supervisorId: supervisor2.id },
        422,
      );
    });
    await t.test(
      'concurrent live placement creation returns one success and one conflict',
      async () => {
        const result = await Promise.all([
          call('admin1', 'post', '/placements', placementBody(), 201).catch((e) => e),
          call('admin1', 'post', '/placements', placementBody(), 201).catch((e) => e),
        ]);
        const successes = result.filter((x) => x.status === 201);
        assert.equal(successes.length, 1);
        pid = successes[0].body.data.id;
        const r = await call('admin1', 'post', '/placements', placementBody(), 409);
        assert.equal(r.body.error.code, 'LIVE_PLACEMENT_EXISTS');
      },
    );
    await t.test(
      'unassigned real users cannot read placement, children, exports or aggregates',
      async () => {
        for (const name of ['faculty2', 'student2', 'supervisor2']) {
          for (const url of [
            '/placements/' + pid,
            '/placements/' + pid + '/requirements',
            '/placements/' + pid + '/duty-logs',
            '/placements/' + pid + '/schedules',
            '/placements/' + pid + '/progress',
          ])
            await call(name, 'get', url, {}, 404);
          const list = await call(name, 'get', '/placements');
          assert(!list.body.data.some((x) => x.id === pid));
          const dashboard = await call(
            name,
            'get',
            '/dashboard/' + actors[name].role + '?academicTermId=' + term,
          );
          assert.equal(dashboard.body.data.total, 0);
          if (name !== 'student2') {
            const csv = await call(name, 'get', '/reports/placements.csv?academicTermId=' + term);
            assert(!csv.text.includes('S1-' + tag));
          }
        }
        await call('faculty1', 'get', '/placements/' + pid);
        await call('student1', 'get', '/placements/' + pid);
        await call('supervisor1', 'get', '/placements/' + pid);
      },
    );
    let requirements;
    await t.test(
      'private file signatures, upload authorization, cleanup on failure and predeployment approval',
      async () => {
        requirements = (await call('student1', 'get', '/placements/' + pid + '/requirements')).body
          .data;
        assert.equal(requirements.length, 2);
        const pre = requirements.find((x) => x.stageSnapshot === 'pre_deployment');
        await upload(
          'student1',
          pre.id,
          Buffer.from('not-a-pdf'),
          'test.pdf',
          'application/pdf',
          422,
        );
        await upload('student2', pre.id, undefined, 'test.pdf', 'application/pdf', 404);
        await upload(
          'student1',
          pre.id,
          Buffer.alloc(env.MAX_UPLOAD_BYTES + 1, 65),
          'test.pdf',
          'application/pdf',
          413,
        );
        const staged = path.join(env.UPLOAD_ROOT, '.staging', crypto.randomUUID());
        await fs.writeFile(staged, '%PDF-1.4\nSynthetic failure fixture\n%%EOF');
        const before = (await fs.readdir(env.UPLOAD_ROOT)).filter((x) => x !== '.staging');
        await assert.rejects(
          files.upload(
            pool,
            actors.student1,
            pre.id,
            { path: staged, originalname: 'test.pdf', mimetype: 'application/pdf', size: 40 },
            env,
            {
              insert: async () => {
                throw new Error('injected metadata failure');
              },
            },
          ),
        );
        assert.deepEqual(
          (await fs.readdir(env.UPLOAD_ROOT)).filter((x) => x !== '.staging'),
          before,
        );
        await upload('student1', pre.id);
        const metadata = await one(
          pool,
          'SELECT * FROM uploaded_files WHERE placement_requirement_id=?',
          [pre.id],
        );
        fixtureFiles.push(metadata.storage_key);
        await call('student2', 'get', '/files/' + metadata.id + '/download', {}, 404);
        const download = await call('student1', 'get', '/files/' + metadata.id + '/download');
        assert.match(download.headers['content-disposition'], /attachment/);
        await call(
          'faculty1',
          'patch',
          '/placement-requirements/' + pre.id + '/review',
          { decision: 'rejected' },
          422,
        );
        await call('faculty1', 'patch', '/placement-requirements/' + pre.id + '/review', {
          decision: 'rejected',
          remarks: 'Please replace',
        });
        await upload('student1', pre.id);
        const version = await one(
          pool,
          'SELECT MAX(version) n FROM uploaded_files WHERE placement_requirement_id=?',
          [pre.id],
        );
        assert.equal(version.n, 2);
        await call('faculty1', 'patch', '/placement-requirements/' + pre.id + '/review', {
          decision: 'approved',
        });
        await call('faculty1', 'patch', '/placements/' + pid + '/status', { status: 'approved' });
        await call('admin1', 'patch', '/placements/' + pid + '/status', { status: 'active' });
      },
    );
    let logIds = [];
    await t.test(
      'planned schedules have no duty credit and require assigned reviewer access',
      async () => {
        const body = {
          weekday: 1,
          startTime: '08:00',
          endTime: '17:00',
          breakMinutes: 60,
          effectiveFrom: shifted(-10),
          effectiveTo: shifted(60),
        };
        const schedule = (
          await call('supervisor1', 'post', '/placements/' + pid + '/schedules', body, 201)
        ).body.data;
        await call('student1', 'post', '/placements/' + pid + '/schedules', body, 403);
        await call('supervisor2', 'patch', '/schedules/' + schedule.id, { breakMinutes: 30 }, 404);
        await call('supervisor1', 'patch', '/schedules/' + schedule.id, { breakMinutes: 30 });
        assert.equal(
          (await call('student1', 'get', '/placements/' + pid + '/progress')).body.data
            .approvedMinutes,
          0,
        );
        await call('supervisor1', 'delete', '/schedules/' + schedule.id, {}, 204);
      },
    );
    await t.test(
      'three approved hours stay 180 despite two requirement rows; draft edits, overlap and correction',
      async () => {
        const date = shifted(-1);
        for (const hour of [8, 10, 12]) {
          const pad = (h) => String(h).padStart(2, '0');
          const r = await call(
            'student1',
            'post',
            '/placements/' + pid + '/duty-logs',
            {
              clockIn: date + 'T' + pad(hour) + ':00:00+08:00',
              clockOut: date + 'T' + pad(hour + 1) + ':00:00+08:00',
              breakMinutes: 0,
            },
            201,
          );
          const id = r.body.data.id;
          logIds.push(id);
          await call('student1', 'post', '/duty-logs/' + id + '/submit');
          await call(
            'supervisor2',
            'patch',
            '/duty-logs/' + id + '/review',
            { decision: 'approved' },
            404,
          );
          await call(
            'faculty1',
            'patch',
            '/duty-logs/' + id + '/review',
            { decision: 'approved' },
            403,
          );
          await call('supervisor1', 'patch', '/duty-logs/' + id + '/review', {
            decision: 'approved',
          });
          await call('student1', 'patch', '/duty-logs/' + id, { breakMinutes: 1 }, 409);
        }
        const submitted = await call(
          'student1',
          'post',
          '/placements/' + pid + '/duty-logs',
          {
            clockIn: date + 'T14:00:00+08:00',
            clockOut: date + 'T15:00:00+08:00',
            breakMinutes: 0,
          },
          201,
        );
        await call('student1', 'post', '/duty-logs/' + submitted.body.data.id + '/submit');
        const p = (await call('student1', 'get', '/placements/' + pid + '/progress')).body.data;
        assert.equal(p.approvedMinutes, 180);
        assert.equal(p.pendingMinutes, 60);
        await call(
          'student1',
          'post',
          '/placements/' + pid + '/duty-logs',
          {
            clockIn: date + 'T08:30:00+08:00',
            clockOut: date + 'T09:30:00+08:00',
            breakMinutes: 0,
          },
          409,
        );
        await call('supervisor1', 'post', '/duty-logs/' + logIds[0] + '/reopen', {
          remarks: 'Correction needed',
        });
        assert.equal(
          (await call('student1', 'get', '/placements/' + pid + '/progress')).body.data
            .approvedMinutes,
          120,
        );
        await call('student1', 'post', '/duty-logs/' + logIds[0] + '/submit');
        await call('supervisor1', 'patch', '/duty-logs/' + logIds[0] + '/review', {
          decision: 'approved',
        });
        await call('supervisor1', 'patch', '/duty-logs/' + submitted.body.data.id + '/review', {
          decision: 'rejected',
          remarks: 'Exclude from completion fixture',
        });
      },
    );
    await t.test(
      'concurrent overlapping logs serialize; daily cap is enforced at submission',
      async () => {
        const date = shifted(-2),
          body = {
            clockIn: date + 'T08:00:00+08:00',
            clockOut: date + 'T17:00:00+08:00',
            breakMinutes: 60,
          };
        const a = agents.student1;
        const result = await Promise.all([
          a.agent
            .post('/api/placements/' + pid + '/duty-logs')
            .set('Origin', env.APP_ORIGIN)
            .set('X-CSRF-Token', a.csrf)
            .send(body),
          a.agent
            .post('/api/placements/' + pid + '/duty-logs')
            .set('Origin', env.APP_ORIGIN)
            .set('X-CSRF-Token', a.csrf)
            .send(body),
        ]);
        assert.deepEqual(result.map((r) => r.status).sort(), [201, 409]);
        const id = result.find((r) => r.status === 201).body.data.id;
        assert.equal(result.find((r) => r.status === 201).body.data.creditedMinutes, 480);
        await call('student1', 'post', '/duty-logs/' + id + '/submit');
        const extra = await call(
          'student1',
          'post',
          '/placements/' + pid + '/duty-logs',
          {
            clockIn: date + 'T18:00:00+08:00',
            clockOut: date + 'T19:00:00+08:00',
            breakMinutes: 0,
          },
          201,
        );
        assert.equal(
          (await call('student1', 'post', '/duty-logs/' + extra.body.data.id + '/submit', {}, 422))
            .body.error.code,
          'DAILY_LIMIT_EXCEEDED',
        );
        await call('supervisor1', 'patch', '/duty-logs/' + id + '/review', {
          decision: 'rejected',
          remarks: 'Cap check only',
        });
      },
    );
    await t.test(
      'rubric snapshot privacy, missing scores, 81/100 grade, finalization and immutability',
      async () => {
        for (const type of ['midterm', 'final']) {
          const created = await call(
            'supervisor1',
            'post',
            '/evaluations',
            { placementId: pid, type },
            201,
          );
          const id = created.body.data.id;
          if (type === 'final') finalEval = id;
          await call('student1', 'get', '/evaluations/' + id, {}, 404);
          await call('supervisor2', 'get', '/evaluations/' + id, {}, 404);
          await call('supervisor1', 'post', '/evaluations/' + id + '/submit', {}, 422);
          const e = (await call('supervisor1', 'get', '/evaluations/' + id)).body.data;
          await call(
            'supervisor1',
            'patch',
            '/evaluations/' + id,
            {
              scores: [
                { criterionId: e.scores[0].criterionId, score: e.scores[0].maxScoreSnapshot + 1 },
              ],
            },
            422,
          );
          await call(
            'supervisor1',
            'patch',
            '/evaluations/' + id,
            {
              scores: [
                { criterionId: e.scores[0].criterionId, score: 1 },
                { criterionId: e.scores[0].criterionId, score: 1 },
              ],
            },
            422,
          );
          const scores = e.scores.map((s, i) => ({
            criterionId: s.criterionId,
            score: i === 0 ? 45 : 36,
          }));
          const edited = await call('supervisor1', 'patch', '/evaluations/' + id, { scores });
          assert.equal(edited.body.data.percentage, 81);
          const criterion = e.scores[0].criterionId;
          await call(
            'admin1',
            'patch',
            '/evaluation-criteria/' + criterion,
            { label: 'Changed used rubric' },
            409,
          );
          if (type === 'midterm') {
            const result = await raceWhilePlacementLocked(
              pool,
              pid,
              (p) =>
                require('../../src/modules/evaluations/evaluations.service').action(
                  p,
                  actors.supervisor1,
                  id,
                  false,
                ),
              (c) =>
                rows(
                  c,
                  'UPDATE evaluation_scores SET score=NULL WHERE evaluation_id=? AND criterion_id=?',
                  [id, e.scores[0].criterionId],
                ),
            );
            assert.equal(result.error?.code, 'INCOMPLETE_SCORES');
            await call('supervisor1', 'patch', '/evaluations/' + id, { scores });
          }
          await call('supervisor1', 'post', '/evaluations/' + id + '/submit');
          await call('faculty1', 'patch', '/evaluations/' + id + '/finalize');
          await call('supervisor1', 'patch', '/evaluations/' + id, { scores }, 409);
          assert.equal(
            (await call('student1', 'get', '/evaluations/' + id)).body.data.percentage,
            81,
          );
        }
        await call(
          'faculty1',
          'patch',
          '/placements/' + pid + '/status',
          { status: 'completed' },
          409,
        );
      },
    );
    await t.test(
      'completion blockers, concurrent reopening, notifications and safe filtered exports',
      async () => {
        const final = requirements.find((r) => r.stageSnapshot === 'completion');
        await upload('student1', final.id);
        await call('faculty1', 'patch', '/placement-requirements/' + final.id + '/review', {
          decision: 'approved',
        });
        const pre = requirements.find((r) => r.stageSnapshot === 'pre_deployment');
        const concurrent = await raceWhilePlacementLocked(
          pool,
          pid,
          (p) => placements.transition(p, actors.faculty1, pid, { status: 'completed' }),
          (c) =>
            rows(
              c,
              "UPDATE placement_requirements SET status='rejected',verified_by=NULL,verified_at=NULL,remarks='Synthetic concurrent reopen' WHERE id=?",
              [pre.id],
            ),
        );
        assert.equal(concurrent.error?.code, 'COMPLETION_BLOCKED');
        await upload('student1', pre.id);
        await call('faculty1', 'patch', '/placement-requirements/' + pre.id + '/review', {
          decision: 'approved',
        });
        await call('faculty1', 'post', '/placement-requirements/' + pre.id + '/reopen', {
          remarks: 'Reconfirm document',
        });
        assert.equal(
          (await call('student1', 'get', '/placements/' + pid + '/progress')).body.data
            .completionEligible,
          false,
        );
        await upload('student1', pre.id);
        await call('faculty1', 'patch', '/placement-requirements/' + pre.id + '/review', {
          decision: 'approved',
        });
        assert.equal(
          (await call('student1', 'get', '/placements/' + pid + '/progress')).body.data
            .completionEligible,
          true,
        );
        await call('faculty1', 'patch', '/placements/' + pid + '/status', { status: 'completed' });
        const dashboard = (await call('admin1', 'get', '/dashboard/admin?academicTermId=' + term))
          .body.data;
        assert.equal(dashboard.approvedMinutes, 180);
        assert.equal(dashboard.averageGrade, 81);
        assert.equal(dashboard.completionRate, 100);
        const csv = await call('faculty1', 'get', '/reports/placements.csv?academicTermId=' + term);
        assert(csv.text.includes("'=Unsafe"));
        const notifications = (await call('student1', 'get', '/notifications')).body.data;
        assert(notifications.length);
        await call('student2', 'patch', '/notifications/' + notifications[0].id + '/read', {}, 404);
        await call('student1', 'patch', '/notifications/' + notifications[0].id + '/read');
      },
    );
    await t.test('school host follows faculty duty/evaluation workflow and completes', async () => {
      const b = {
        ...placementBody(),
        studentId: student2.id,
        deploymentType: 'school',
        supervisorId: null,
        companyDepartmentId: null,
        schoolDepartmentId: school,
        requiredMinutes: 60,
      };
      schoolPid = (await call('admin1', 'post', '/placements', b, 201)).body.data.id;
      const reqs = (await call('student2', 'get', '/placements/' + schoolPid + '/requirements'))
        .body.data;
      for (const r of reqs) {
        await upload('student2', r.id);
        await call('faculty1', 'patch', '/placement-requirements/' + r.id + '/review', {
          decision: 'approved',
        });
      }
      await call('faculty1', 'patch', '/placements/' + schoolPid + '/status', {
        status: 'approved',
      });
      await call('admin1', 'patch', '/placements/' + schoolPid + '/status', { status: 'active' });
      const date = shifted(-1);
      const log = (
        await call(
          'student2',
          'post',
          '/placements/' + schoolPid + '/duty-logs',
          {
            clockIn: date + 'T08:00:00+08:00',
            clockOut: date + 'T09:00:00+08:00',
            breakMinutes: 0,
          },
          201,
        )
      ).body.data;
      await call('student2', 'post', '/duty-logs/' + log.id + '/submit');
      await call('faculty1', 'patch', '/duty-logs/' + log.id + '/review', { decision: 'approved' });
      for (const type of ['midterm', 'final']) {
        const id = (
          await call('faculty1', 'post', '/evaluations', { placementId: schoolPid, type }, 201)
        ).body.data.id;
        const e = (await call('faculty1', 'get', '/evaluations/' + id)).body.data;
        await call('faculty1', 'patch', '/evaluations/' + id, {
          scores: e.scores.map((s) => ({ criterionId: s.criterionId, score: s.maxScoreSnapshot })),
        });
        await call('faculty1', 'post', '/evaluations/' + id + '/submit');
        await call('faculty1', 'patch', '/evaluations/' + id + '/finalize');
      }
      await call('faculty1', 'patch', '/placements/' + schoolPid + '/status', {
        status: 'completed',
      });
    });
    await t.test(
      'a new rubric version leaves finalized historical snapshots unchanged',
      async () => {
        const before = (await call('student1', 'get', '/evaluations/' + finalEval)).body.data;
        const version = 1000000 + parseInt(tag.slice(0, 5), 16);
        try {
          await call(
            'admin1',
            'post',
            '/evaluation-criteria',
            {
              rubricVersion: version,
              code: 'NEW-' + tag,
              label: 'New synthetic criterion',
              maxScore: 20,
              sortOrder: 1,
            },
            201,
          );
          const after = (await call('student1', 'get', '/evaluations/' + finalEval)).body.data;
          assert.deepEqual(after.scores, before.scores);
          assert.equal(after.percentage, 81);
        } finally {
          await rows(pool, 'DELETE FROM evaluation_criteria WHERE rubric_version=?', [version]);
        }
        await assert.rejects(
          files.safeFile(env.UPLOAD_ROOT, '../escape'),
          (e) => e.code === 'FILE_NOT_FOUND',
        );
      },
    );
    await t.test(
      'logout invalidates captured cookies and account deactivation revokes sessions',
      async () => {
        const csrf = await agents.faculty2.agent.get('/api/auth/csrf');
        const raw = csrf.headers['set-cookie'];
        const loginAgent = request.agent(app);
        const token = (await loginAgent.get('/api/auth/csrf')).body.data.csrfToken;
        const logged = await loginAgent
          .post('/api/auth/login')
          .set('Origin', env.APP_ORIGIN)
          .set('X-CSRF-Token', token)
          .send({ email: actors.faculty2.email, password: testPassword });
        assert.equal(logged.status, 200);
        const captured = logged.headers['set-cookie'][0].split(';')[0];
        const fresh = (await loginAgent.get('/api/auth/csrf')).body.data.csrfToken;
        await loginAgent
          .post('/api/auth/logout')
          .set('Origin', env.APP_ORIGIN)
          .set('X-CSRF-Token', fresh)
          .send({})
          .expect(204);
        await request(app).get('/api/auth/me').set('Cookie', captured).expect(401);
        await call('admin1', 'patch', '/users/' + actors.supervisor2.id, { isActive: false });
        await agents.supervisor2.agent.get('/api/auth/me').expect(401);
      },
    );
  } finally {
    const pids = (
      await rows(
        pool,
        'SELECT id FROM placements WHERE student_id IN (SELECT id FROM students WHERE user_id IN (' +
          ids.map(() => '?').join(',') +
          '))',
        ids,
      )
    ).map((x) => x.id);
    if (pids.length) {
      const marks = pids.map(() => '?').join(',');
      const frows = await rows(
        pool,
        'SELECT storage_key FROM uploaded_files WHERE placement_requirement_id IN (SELECT id FROM placement_requirements WHERE placement_id IN (' +
          marks +
          '))',
        pids,
      );
      for (const f of frows)
        await fs.rm(path.join(env.UPLOAD_ROOT, f.storage_key), { force: true });
      await rows(
        pool,
        'UPDATE placement_requirements SET current_upload_id=NULL WHERE placement_id IN (' +
          marks +
          ')',
        pids,
      );
      await rows(
        pool,
        'DELETE FROM uploaded_files WHERE placement_requirement_id IN (SELECT id FROM placement_requirements WHERE placement_id IN (' +
          marks +
          '))',
        pids,
      );
      await rows(
        pool,
        'DELETE FROM evaluation_scores WHERE evaluation_id IN (SELECT id FROM evaluations WHERE placement_id IN (' +
          marks +
          '))',
        pids,
      );
      for (const table of ['evaluations', 'duty_logs', 'work_schedules', 'placement_requirements'])
        await rows(pool, 'DELETE FROM ' + table + ' WHERE placement_id IN (' + marks + ')', pids);
      await rows(pool, 'DELETE FROM placements WHERE id IN (' + marks + ')', pids);
    }
    if (ids.length) {
      const marks = ids.map(() => '?').join(',');
      await rows(pool, 'DELETE FROM notifications WHERE recipient_id IN (' + marks + ')', ids);
      await rows(pool, 'DELETE FROM audit_logs WHERE actor_id IN (' + marks + ')', ids);
      for (const table of ['company_supervisors', 'students', 'faculty'])
        await rows(pool, 'DELETE FROM ' + table + ' WHERE user_id IN (' + marks + ')', ids);
      await rows(pool, 'DELETE FROM users WHERE id IN (' + marks + ')', ids);
    }
    if (host || host2) {
      const hosts = [host, host2].filter(Boolean);
      const co = await rows(
        pool,
        'SELECT company_id FROM company_departments WHERE id IN (' +
          hosts.map(() => '?').join(',') +
          ')',
        hosts,
      );
      await rows(
        pool,
        'DELETE FROM company_departments WHERE id IN (' + hosts.map(() => '?').join(',') + ')',
        hosts,
      );
      for (const r of co) await rows(pool, 'DELETE FROM companies WHERE id=?', [r.company_id]);
    }
    if (term) await rows(pool, 'DELETE FROM academic_terms WHERE id=?', [term]);
    if (school) await rows(pool, 'DELETE FROM school_departments WHERE id=?', [school]);
    await session.store.close();
    await pool.end();
  }
});
