const { z, id, date, remarks } = require('../../middleware/validate');
const duty = z
  .object({
    clockIn: z.string(),
    clockOut: z.string(),
    breakMinutes: z.number().int().min(0).max(1439),
  })
  .strict();
const schedule = z
  .object({
    weekday: z.number().int().min(1).max(7),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    breakMinutes: z.number().int().min(0).max(1439),
    effectiveFrom: date,
    effectiveTo: date,
  })
  .strict();
const review = z
  .object({ decision: z.enum(['approved', 'rejected']), remarks: remarks.optional() })
  .strict();
module.exports = { duty, schedule, review, reopen: z.object({ remarks }).strict() };
