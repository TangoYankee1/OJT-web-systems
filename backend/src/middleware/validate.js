const { z } = require('zod');
const id = z.preprocess(
  (value) => (typeof value === 'string' && /^[0-9]+$/.test(value) ? Number(value) : value),
  z.number().int().positive().max(4294967295),
);
const text = (n) => z.string().trim().min(1).max(n);
const date = z.iso.date();
const password = z
  .string()
  .refine(
    (v) => Buffer.byteLength(v, 'utf8') >= 12 && Buffer.byteLength(v, 'utf8') <= 72,
    'Password must contain 12 to 72 UTF-8 bytes',
  );
const empty = z.object({}).strict();
const remarks = text(4000);
function parse(schema, value) {
  return schema.parse(value);
}
module.exports = { z, id, text, date, password, empty, remarks, parse };
