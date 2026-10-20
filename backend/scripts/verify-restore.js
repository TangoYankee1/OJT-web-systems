const fs = require('node:fs/promises'),
  path = require('node:path'),
  crypto = require('node:crypto'),
  assert = require('node:assert/strict'),
  request = require('supertest');
const { loadEnv, assertTest, backendRoot } = require('../src/config/env');
const { createPool } = require('../src/config/db');
const { createSession } = require('../src/config/session');
const { createApp } = require('../src/app');
const { one, rows } = require('../src/shared/repository');
const { backup } = require('./backup');
const { restore } = require('./restore');
async function verify() {
  const env = loadEnv('.env.test');
  assertTest(env);
  const tag = crypto.randomBytes(5).toString('hex'),
    source = createPool(env);
  let target, store;
  try {
    const student = await one(
      source,
      "SELECT u.*,p.id AS placement_id FROM users u JOIN students s ON s.user_id=u.id JOIN placements p ON p.student_id=s.id WHERE u.email LIKE 'browser-%@tests.invalid' AND p.status='completed' ORDER BY p.id DESC LIMIT 1",
    );
    assert(student, 'Run successful browser fixtures before the restore drill');
    const parent = path.resolve(backendRoot, '../backups');
    await fs.mkdir(parent, { recursive: true });
    const snapshot = await backup(env, path.join(parent, 'drill-' + tag), { writesPaused: true });
    const targetUploads = path.join(env.UPLOAD_ROOT, 'restore-' + tag);
    const result = await restore(
      env,
      snapshot.directory,
      'ojt_restore_' + tag + '_test',
      targetUploads,
    );
    target = createPool({ ...env, DB_NAME: result.database, UPLOAD_ROOT: targetUploads });
    assert.equal((await one(target, 'SELECT COUNT(*) n FROM sessions')).n, 0);
    assert.equal((await one(target, 'SELECT COUNT(*) n FROM password_reset_tokens')).n, 0);
    const sourcePlacements = await one(source, 'SELECT COUNT(*) n FROM placements'),
      restoredPlacements = await one(target, 'SELECT COUNT(*) n FROM placements');
    assert.equal(sourcePlacements.n, restoredPlacements.n);
    const targetEnv = { ...env, DB_NAME: result.database, UPLOAD_ROOT: targetUploads };
    const s = await createSession(target, targetEnv);
    store = s.store;
    const app = createApp({ pool: target, env: targetEnv, sessionMiddleware: s.middleware }),
      agent = request.agent(app);
    let csrf = (await agent.get('/api/auth/csrf').expect(200)).body.data.csrfToken;
    await agent
      .post('/api/auth/login')
      .set('Origin', env.APP_ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ email: student.email, password: 'Browser-changed-password-2026!' })
      .expect(200);
    const id = student.placement_id;
    assert.equal(
      (await agent.get('/api/placements/' + id).expect(200)).body.data.status,
      'completed',
    );
    const progress = (await agent.get('/api/placements/' + id + '/progress').expect(200)).body.data;
    assert.equal(progress.approvedMinutes, 480);
    assert.equal(progress.completionEligible, true);
    const evaluations = (await agent.get('/api/evaluations?placementId=' + id).expect(200)).body
      .data;
    assert.equal(evaluations.length, 2);
    for (const e of evaluations) {
      const detail = (await agent.get('/api/evaluations/' + e.id).expect(200)).body.data;
      assert.equal(detail.status, 'finalized');
      assert.equal(detail.percentage, 81);
    }
    const file = await one(
      target,
      'SELECT f.id FROM uploaded_files f JOIN placement_requirements r ON r.id=f.placement_requirement_id WHERE r.placement_id=? LIMIT 1',
      [id],
    );
    assert(file);
    await agent.get('/api/files/' + file.id + '/download').expect(200);
    const evidence = {
      verifiedAt: new Date().toISOString(),
      sourceDatabase: env.DB_NAME,
      restoredDatabase: result.database,
      migrationsMatched: result.migrationCount,
      fileChecksumsMatched: result.fileCount,
      placementCountMatched: restoredPlacements.n,
      sessionsInvalidated: true,
      resetTokensInvalidated: true,
      login: true,
      completedPlacement: true,
      approvedMinutes: progress.approvedMinutes,
      finalizedEvaluations: 2,
      finalGradePercent: 81,
      authorizedDownload: true,
    };
    await fs.mkdir(path.resolve(backendRoot, '../docs/evidence'), { recursive: true });
    await fs.writeFile(
      path.resolve(backendRoot, '../docs/evidence/restore-result.json'),
      JSON.stringify(evidence, null, 2) + '\n',
    );
    console.log(JSON.stringify(evidence, null, 2));
  } finally {
    if (store) await store.close();
    if (target) await target.end();
    await source.end();
  }
}
if (require.main === module)
  verify().catch((e) => {
    console.error(e.code || e.message);
    process.exitCode = 1;
  });
module.exports = { verify };
