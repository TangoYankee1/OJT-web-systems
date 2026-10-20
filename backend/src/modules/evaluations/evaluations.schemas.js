const { z, id, remarks } = require('../../middleware/validate');
const score = z.number().min(0).max(99999.99).multipleOf(0.01);
module.exports = {
  create: z.object({ placementId: id, type: z.enum(['midterm', 'final']) }).strict(),
  edit: z
    .object({
      scores: z
        .array(
          z
            .object({
              criterionId: id,
              score: score.nullable(),
              remarks: remarks.nullable().optional(),
            })
            .strict(),
        )
        .max(100),
      remarks: remarks.nullable().optional(),
    })
    .strict(),
};
