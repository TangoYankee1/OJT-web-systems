const { insert } = require('./repository');
const sensitive = /password|hash|token|secret|cookie|storage_key/i;
function redact(v) {
  if (Array.isArray(v)) return v.map(redact);
  if (v && typeof v === 'object')
    return Object.fromEntries(
      Object.entries(v)
        .filter(([k]) => !sensitive.test(k))
        .map(([k, x]) => [k, redact(x)]),
    );
  return v;
}
async function audit(c, actor, action, type, id, details = {}) {
  await insert(c, 'audit_logs', {
    actor_id: actor?.id || null,
    action,
    entity_type: type,
    entity_id: id,
    details_json: JSON.stringify(redact(details)),
    request_id: actor?.requestId || 'script',
  });
}
module.exports = { audit, redact };
