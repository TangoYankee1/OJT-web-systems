const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
async function createSession(pool, env) {
  const store = new MySQLStore(
    {
      createDatabaseTable: false,
      expiration: env.SESSION_MAX_AGE_MS,
      clearExpired: true,
      checkExpirationInterval: 60000,
      endConnectionOnClose: false,
    },
    pool,
  );
  await store.onReady();
  return {
    store,
    middleware: session({
      name: env.SESSION_NAME,
      secret: env.SESSION_SECRET,
      store,
      resave: false,
      saveUninitialized: false,
      rolling: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: env.NODE_ENV === 'production',
        maxAge: env.SESSION_MAX_AGE_MS,
        path: '/',
      },
    }),
  };
}
module.exports = { createSession };
