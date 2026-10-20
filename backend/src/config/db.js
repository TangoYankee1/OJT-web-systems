const mysql = require('mysql2/promise');
function options(env) {
  return {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    charset: 'utf8mb4',
    timezone: 'Z',
    dateStrings: true,
    waitForConnections: true,
    connectionLimit: 10,
    multipleStatements: false,
  };
}
function createPool(env) {
  const pool = mysql.createPool(options(env));
  pool.pool.on('connection', (c) => c.query("SET time_zone = '+00:00'"));
  return pool;
}
module.exports = { createPool, options };
