const { z, remarks } = require('../../middleware/validate');
module.exports = {
  review: z
    .object({ decision: z.enum(['approved', 'rejected']), remarks: remarks.optional() })
    .strict(),
  reopen: z.object({ remarks }).strict(),
};
