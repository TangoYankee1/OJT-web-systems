const readline = require('node:readline');
const { loadEnv } = require('../src/config/env');
const { createPool } = require('../src/config/db');
const { createAccount } = require('../src/modules/directories/directories.service');
async function ask(prompt, secret = false) {
  const r = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });
  if (secret) {
    r._writeToOutput = function (text) {
      if (!this.hidden) process.stdout.write(text);
    };
  }
  return new Promise((resolve) => {
    r.question(prompt, (value) => {
      r.hidden = false;
      if (secret) console.log();
      r.close();
      resolve(value);
    });
    r.hidden = secret;
  });
}
(async () => {
  const env = loadEnv(),
    pool = createPool(env);
  try {
    const email = process.env.ADMIN_EMAIL || (await ask('Admin email: ')),
      fullName = process.env.ADMIN_NAME || (await ask('Full name: ')),
      temporaryPassword =
        process.env.ADMIN_PASSWORD || (await ask('Temporary password (hidden): ', true));
    await createAccount(
      pool,
      { role: 'admin', id: null, requestId: 'admin-bootstrap' },
      { email, fullName, temporaryPassword, role: 'admin', profile: {} },
    );
    console.log('Administrator created. Sign in and change the temporary password.');
  } finally {
    delete process.env.ADMIN_PASSWORD;
    await pool.end();
  }
})().catch((e) => {
  console.error(
    e.code === 'ER_DUP_ENTRY' ? 'Administrator email already exists' : e.code || e.message,
  );
  process.exitCode = 1;
});
