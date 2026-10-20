const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  crypto = require('node:crypto'),
  mysql = require('mysql2/promise'),
  request = require('supertest');
const { loadEnv, assertTest } = require('../../src/config/env');
const { options, createPool } = require('../../src/config/db');
const { migrate } = require('../../scripts/migrate');
const { createSession } = require('../../src/config/session');
const { createApp } = require('../../src/app');
const directory = require('../../src/modules/directories/directories.service');
const { rows, one } = require('../../src/shared/repository');
test(
  'isolated authentication, last administrator, reset, expiry and rate-limit boundaries',
  { timeout: 90000 },
  async (t) => {
    const original = loadEnv('.env.test');
    assertTest(original);
    const tag = crypto.randomBytes(4).toString('hex'),
      db = 'ojt_auth_' + tag + '_test',
      user = 'ojt_auth_' + tag,
      pw = crypto.randomBytes(24).toString('hex');
    const env = { ...original, DB_NAME: db, DB_USER: user, DB_PASSWORD: pw };
    assertTest(env);
    const admin = await mysql.createConnection({
      ...options(original),
      database: undefined,
      user: process.env.MIGRATION_DB_USER,
      password: process.env.MIGRATION_DB_PASSWORD,
    });
    let pool, store;
    try {
      await admin.query(
        'CREATE DATABASE ' + db + ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
      );
      await admin.query('CREATE USER ?@? IDENTIFIED BY ?', [user, '127.0.0.1', pw]);
      await admin.query('GRANT SELECT,INSERT,UPDATE,DELETE ON ' + db + '.* TO ?@?', [
        user,
        '127.0.0.1',
      ]);
      await migrate(env);
      pool = createPool(env);
      const root = await directory.createAccount(
        pool,
        { role: 'admin', id: null },
        {
          email: 'auth-admin@tests.invalid',
          fullName: 'Synthetic Auth Admin',
          role: 'admin',
          temporaryPassword: 'Initial-auth-password-2026!',
          profile: {},
        },
      );
      const s = await createSession(pool, env);
      store = s.store;
      const app = createApp({ pool, env, sessionMiddleware: s.middleware });
      const agent = request.agent(app),
        origin = env.APP_ORIGIN;
      let token = (await agent.get('/api/auth/csrf')).body.data.csrfToken;
      const post = (url, body) =>
        agent
          .post('/api' + url)
          .set('Origin', origin)
          .set('X-CSRF-Token', token)
          .send(body);
      let captured;
      await t.test(
        'migration checksum drift is refused without applying later changes',
        async () => {
          const old = await one(pool, 'SELECT checksum FROM schema_migrations WHERE version=?', [
            '001-identity-directories.sql',
          ]);
          try {
            await rows(pool, 'UPDATE schema_migrations SET checksum=? WHERE version=?', [
              '0'.repeat(64),
              '001-identity-directories.sql',
            ]);
            await assert.rejects(migrate(env), /Applied migration checksum changed/);
          } finally {
            await rows(pool, 'UPDATE schema_migrations SET checksum=? WHERE version=?', [
              old.checksum,
              '001-identity-directories.sql',
            ]);
          }
        },
      );
      await t.test(
        'origin and anonymous login CSRF required; Referer fallback accepts exact same origin',
        async () => {
          await agent
            .post('/api/auth/login')
            .send({ email: root.email, password: 'Initial-auth-password-2026!' })
            .expect(403);
          await agent
            .post('/api/auth/login')
            .set('Origin', 'http://evil.invalid')
            .set('X-CSRF-Token', token)
            .send({ email: root.email, password: 'Initial-auth-password-2026!' })
            .expect(403);
          const r = await agent
            .post('/api/auth/login')
            .set('Referer', origin + '/login')
            .set('X-CSRF-Token', token)
            .send({
              email: '  AUTH-ADMIN@TESTS.INVALID  ',
              password: 'Initial-auth-password-2026!',
            })
            .expect(200);
          captured = r.headers['set-cookie'][0].split(';')[0];
          token = (await agent.get('/api/auth/csrf')).body.data.csrfToken;
        },
      );
      await t.test(
        'temporary password blocks all business routes and password change revokes captured sessions',
        async () => {
          await agent
            .get('/api/companies')
            .expect(403)
            .expect((r) => assert.equal(r.body.error.code, 'PASSWORD_CHANGE_REQUIRED'));
          await post('/auth/change-password', {
            currentPassword: 'wrong',
            newPassword: 'Updated-auth-password-2026!',
          }).expect(401);
          await post('/auth/change-password', {
            currentPassword: 'Initial-auth-password-2026!',
            newPassword: 'Updated-auth-password-2026!',
          }).expect(204);
          await request(app).get('/api/auth/me').set('Cookie', captured).expect(401);
          token = (await agent.get('/api/auth/csrf')).body.data.csrfToken;
          await post('/auth/login', {
            email: root.email,
            password: 'Updated-auth-password-2026!',
          }).expect(200);
          token = (await agent.get('/api/auth/csrf')).body.data.csrfToken;
          await agent.get('/api/companies').expect(200);
        },
      );
      await t.test(
        'last active administrator is protected; password reset forces change and invalidates sessions',
        async () => {
          const actor = await one(pool, 'SELECT * FROM users WHERE id=?', [root.id]);
          await assert.rejects(
            directory.editAccount(pool, actor, root.id, { isActive: false }),
            (e) => e.code === 'LAST_ADMIN',
          );
          await directory.resetPassword(pool, actor, root.id, {
            temporaryPassword: 'Reset-auth-password-2026!',
          });
          await agent.get('/api/auth/me').expect(401);
          token = (await agent.get('/api/auth/csrf')).body.data.csrfToken;
          await post('/auth/login', {
            email: root.email,
            password: 'Updated-auth-password-2026!',
          }).expect(401);
          await post('/auth/login', {
            email: root.email,
            password: 'Reset-auth-password-2026!',
          }).expect(200);
          token = (await agent.get('/api/auth/csrf')).body.data.csrfToken;
          await agent.get('/api/companies').expect(403);
        },
      );
      await t.test(
        'absolute eight-hour expiry does not rely on browser cookie expiry',
        async () => {
          const sessions = await rows(pool, 'SELECT session_id,data FROM sessions');
          for (const row of sessions) {
            const data = JSON.parse(row.data);
            if (data.userId === root.id) {
              data.issuedAt = Date.now() - env.SESSION_MAX_AGE_MS - 1;
              await rows(pool, 'UPDATE sessions SET data=? WHERE session_id=?', [
                JSON.stringify(data),
                row.session_id,
              ]);
            }
          }
          await agent.get('/api/auth/me').expect(401);
        },
      );
      await t.test('generic invalid credentials and bounded login attempts', async () => {
        const clean = createApp({ pool, env, sessionMiddleware: s.middleware }),
          a = request.agent(clean);
        const csrf = (await a.get('/api/auth/csrf')).body.data.csrfToken;
        for (let i = 0; i < 11; i++) {
          const r = await a
            .post('/api/auth/login')
            .set('Origin', origin)
            .set('X-CSRF-Token', csrf)
            .send({ email: 'unknown@tests.invalid', password: 'Invalid-auth-password-2026!' });
          assert.equal(r.status, i < 10 ? 401 : 429);
          if (i < 10) assert.equal(r.body.error.code, 'INVALID_CREDENTIALS');
        }
      });
      await t.test(
        'administrator CLI uses temporary environment credentials and refuses duplicates',
        async () => {
          const { spawnSync } = require('node:child_process'),
            path = require('node:path');
          const password = 'Synthetic-cli-admin-password-2026!';
          const childEnv = {
            ...process.env,
            ...Object.fromEntries(Object.entries(env).map(([k, v]) => [k, String(v)])),
            ADMIN_EMAIL: 'cli-admin@tests.invalid',
            ADMIN_NAME: 'Synthetic CLI Admin',
            ADMIN_PASSWORD: password,
          };
          const script = path.resolve(__dirname, '../../scripts/create-admin.js');
          const result = spawnSync(process.execPath, [script], {
            env: childEnv,
            encoding: 'utf8',
            windowsHide: true,
          });
          assert.equal(result.status, 0, result.stderr);
          assert(!result.stdout.includes(password));
          const u = await one(pool, 'SELECT * FROM users WHERE email=?', [childEnv.ADMIN_EMAIL]);
          assert.equal(u.must_change_password, 1);
          assert(await require('bcryptjs').compare(password, u.password_hash));
          const duplicate = spawnSync(process.execPath, [script], {
            env: childEnv,
            encoding: 'utf8',
            windowsHide: true,
          });
          assert.equal(duplicate.status, 1);
          assert.match(duplicate.stderr, /already exists/);
        },
      );
      await t.test('demo seed is opt-in, repeatable and refuses production', async () => {
        const { demoSeed } = require('../../scripts/seed');
        await rows(
          pool,
          "INSERT INTO academic_terms (academic_year,semester,start_date,end_date) VALUES ('2026-2027','2','2027-02-01','2027-06-30')",
        );
        await demoSeed(pool, env, 'Synthetic-demo-seed-password-2026!');
        assert(
          await one(
            pool,
            "SELECT id FROM academic_terms WHERE academic_year='2026-2027' AND semester='1'",
          ),
        );
        const count = await one(pool, 'SELECT COUNT(*) n FROM users');
        await demoSeed(pool, env, 'Synthetic-demo-seed-password-2026!');
        assert.deepEqual(await one(pool, 'SELECT COUNT(*) n FROM users'), count);
        assert.equal((await one(pool, 'SELECT COUNT(*) n FROM placements')).n, 2);
        await assert.rejects(
          demoSeed(pool, { ...env, NODE_ENV: 'production' }, 'Synthetic-demo-seed-password-2026!'),
          /refuses/,
        );
      });
    } finally {
      if (store) await store.close();
      if (pool) await pool.end();
      assertTest(env);
      assert(/^ojt_auth_[a-f0-9]+_test$/.test(db));
      await admin.query('DROP DATABASE IF EXISTS ' + db);
      await admin.query('DROP USER IF EXISTS ?@?', [user, '127.0.0.1']);
      await admin.end();
    }
  },
);
