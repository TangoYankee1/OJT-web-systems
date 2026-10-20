const fs = require('node:fs/promises'),
  path = require('node:path');
const { loadEnv } = require('./config/env');
const { createPool } = require('./config/db');
const { createSession } = require('./config/session');
const { createApp } = require('./app');
async function start() {
  const env = loadEnv(),
    pool = createPool(env);
  let store, server;
  try {
    await require('./config/storage').prepareStorage(env);
    await pool.execute('SELECT session_id FROM sessions LIMIT 0');
    const s = await createSession(pool, env);
    store = s.store;
    const app = createApp({ pool, env, sessionMiddleware: s.middleware });
    server = await new Promise((resolve, reject) => {
      const srv = app.listen(env.PORT, env.HOST, () => resolve(srv));
      srv.on('error', reject);
    });
    console.log('OJT API listening on ' + env.HOST + ':' + env.PORT);
    let closing = false;
    const stop = async () => {
      if (closing) return;
      closing = true;
      await new Promise((resolve) => server.close(resolve));
      await store.close();
      await pool.end();
    };
    process.once('SIGINT', () => stop().catch(() => (process.exitCode = 1)));
    process.once('SIGTERM', () => stop().catch(() => (process.exitCode = 1)));
    return { app, server, stop };
  } catch (e) {
    if (server) server.close();
    if (store) await store.close();
    await pool.end();
    throw e;
  }
}
if (require.main === module)
  start().catch((e) => {
    console.error('Startup failed: ' + (e.code || e.message));
    process.exitCode = 1;
  });
module.exports = { start };
