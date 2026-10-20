const path = require('node:path');
const { z } = require('zod');
const backendRoot = path.resolve(__dirname, '../..');
function loadEnv(file) {
  require('dotenv').config({ path: path.resolve(backendRoot, file || '.env'), quiet: true });
  return validateEnv(process.env);
}
function validateEnv(raw) {
  const schema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    HOST: z.string().default('127.0.0.1'),
    PORT: z.coerce.number().int().min(1).max(65535).default(5000),
    APP_ORIGIN: z.url(),
    DB_HOST: z.string().default('127.0.0.1'),
    DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
    DB_NAME: z.string().regex(/^[a-zA-Z0-9_]+$/),
    DB_USER: z
      .string()
      .min(1)
      .refine((v) => v !== 'root', 'Runtime DB user must not be root'),
    DB_PASSWORD: z.string().min(1),
    SESSION_SECRET: z.string().regex(/^[a-fA-F0-9]{64,}$/),
    SESSION_NAME: z.string().default('ojt.sid'),
    SESSION_MAX_AGE_MS: z.coerce.number().int().min(60000).max(28800000).default(28800000),
    UPLOAD_ROOT: z.string().default('../storage/private'),
    MAX_UPLOAD_BYTES: z.coerce.number().int().min(1).max(10485760).default(10485760),
    DAILY_LIMIT_MINUTES: z.coerce.number().int().min(1).max(1440).default(480),
    TRUST_PROXY: z.enum(['false', 'loopback']).default('false'),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success)
    throw new Error(
      'Invalid environment settings: ' +
        parsed.error.issues.map((i) => i.path.join('.') + ': ' + i.message).join('; '),
    );
  const env = parsed.data;
  env.UPLOAD_ROOT = path.resolve(backendRoot, env.UPLOAD_ROOT);
  if (env.NODE_ENV === 'production' && !env.APP_ORIGIN.startsWith('https://'))
    throw new Error('Production APP_ORIGIN requires HTTPS');
  return env;
}
function assertTest(env) {
  if (
    env.NODE_ENV !== 'test' ||
    !env.DB_NAME.endsWith('_test') ||
    !env.UPLOAD_ROOT.includes('test-private')
  )
    throw new Error(
      'Refusing test reset: require NODE_ENV=test, database suffix _test and test-private upload root',
    );
}
module.exports = { loadEnv, validateEnv, assertTest, backendRoot };
