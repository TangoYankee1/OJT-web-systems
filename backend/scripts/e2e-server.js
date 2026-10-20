require('../src/config/env').loadEnv('.env.test');
process.env.APP_ORIGIN = 'http://localhost:5001';
process.env.PORT = '5001';
require('../src/server')
  .start()
  .catch((e) => {
    console.error(e.code || e.message);
    process.exitCode = 1;
  });
