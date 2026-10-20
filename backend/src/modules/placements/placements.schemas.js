const { z, id, date, remarks } = require('../../middleware/validate');
const placement = z
  .object({
    studentId: id,
    facultyId: id,
    supervisorId: id.nullable().optional(),
    academicTermId: id,
    deploymentType: z.enum(['company', 'school']),
    companyDepartmentId: id.nullable().optional(),
    schoolDepartmentId: id.nullable().optional(),
    startDate: date,
    endDate: date,
    requiredMinutes: z.number().int().positive().max(1000000),
  })
  .strict();
const status = z
  .object({
    status: z.enum(['approved', 'active', 'completed', 'rejected', 'cancelled']),
    remarks: remarks.optional(),
  })
  .strict();
module.exports = { placement, status };
