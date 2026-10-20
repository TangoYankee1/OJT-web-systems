const { z } = require('zod');
const pagination = z
  .object({
    page: z.coerce.number().int().min(1).max(1000000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(150).default(''),
    status: z.string().max(20).optional(),
    academicTermId: z.coerce.number().int().positive().optional(),
    placementId: z.coerce.number().int().positive().optional(),
    sortBy: z.enum(['id', 'createdAt']).default('id'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();
function paging(query) {
  return pagination.parse(query);
}
function meta(p, total) {
  return { page: p.page, limit: p.limit, total, totalPages: Math.ceil(total / p.limit) };
}
function like(v) {
  return '%' + v.replace(/[!%_]/g, (s) => '!' + s) + '%';
}
module.exports = { paging, meta, like };
