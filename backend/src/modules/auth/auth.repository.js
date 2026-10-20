const { one, update } = require('../../shared/repository');
async function byEmail(c, email) {
  return one(c, 'SELECT * FROM users WHERE email=?', [email]);
}
async function profile(c, u) {
  const tables = { student: 'students', faculty: 'faculty', supervisor: 'company_supervisors' };
  return tables[u.role]
    ? await one(c, 'SELECT * FROM ' + tables[u.role] + ' WHERE user_id=?', [u.id])
    : {};
}
module.exports = { byEmail, profile, update };
