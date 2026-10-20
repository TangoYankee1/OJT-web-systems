const { fail } = require('./errors');
async function rows(c, sql, values = []) {
  const [r] = await c.execute(sql, values);
  return r;
}
async function one(c, sql, values = []) {
  return (await rows(c, sql, values))[0];
}
async function insert(c, table, fields) {
  const keys = Object.keys(fields);
  const result = await rows(
    c,
    'INSERT INTO ' +
      table +
      ' (' +
      keys.join(',') +
      ') VALUES (' +
      keys.map(() => '?').join(',') +
      ')',
    Object.values(fields),
  );
  return result.insertId;
}
async function update(c, table, id, fields) {
  const keys = Object.keys(fields);
  if (!keys.length) fail(422, 'VALIDATION_ERROR', 'No fields to update');
  await rows(c, 'UPDATE ' + table + ' SET ' + keys.map((k) => k + '=?').join(',') + ' WHERE id=?', [
    ...Object.values(fields),
    id,
  ]);
}
function camel(key) {
  return key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
function serialize(value) {
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === 'object') {
    const o = {};
    for (const [k, v] of Object.entries(value)) {
      if (
        [
          'password_hash',
          'storage_key',
          'session_version',
          'live_student_id',
          'data',
          'token_hash',
        ].includes(k)
      )
        continue;
      let x = v;
      if (typeof x === 'string' && /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d/.test(x))
        x = x.replace(' ', 'T') + 'Z';
      if (
        ['score', 'max_score', 'max_score_snapshot', 'percentage', 'average_grade'].includes(k) &&
        x !== null
      )
        x = Number(x);
      if (['is_active', 'is_required', 'is_required_snapshot', 'must_change_password'].includes(k))
        x = Boolean(x);
      o[camel(k)] = serialize(x);
    }
    return o;
  }
  return value;
}
module.exports = { rows, one, insert, update, serialize };
