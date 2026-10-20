const { z, id, text, date, password } = require('../../middleware/validate');
const email = z.string().trim().toLowerCase().max(254).pipe(z.email());
const optionalEmail = email.nullable().optional();
const profile = {
  student: z
    .object({
      studentNumber: text(40),
      course: text(80),
      yearLevel: z.number().int().min(1).max(6),
      schoolDepartmentId: id,
    })
    .strict(),
  faculty: z.object({ employeeNumber: text(40), schoolDepartmentId: id }).strict(),
  supervisor: z
    .object({
      companyDepartmentId: id,
      position: text(100).nullable().optional(),
      contactPhone: text(30).nullable().optional(),
    })
    .strict(),
  admin: z.object({}).strict(),
};
const descriptors = {
  companies: {
    table: 'companies',
    schema: z
      .object({
        name: text(180),
        address: text(4000),
        contactEmail: optionalEmail,
        contactPhone: text(30).nullable().optional(),
      })
      .strict(),
    map: {
      name: 'name',
      address: 'address',
      contactEmail: 'contact_email',
      contactPhone: 'contact_phone',
    },
    search: 'name',
  },
  'company-departments': {
    table: 'company_departments',
    schema: z.object({ departmentName: text(150) }).strict(),
    map: { departmentName: 'department_name' },
    search: 'department_name',
  },
  'school-departments': {
    table: 'school_departments',
    schema: z.object({ code: text(30), name: text(150) }).strict(),
    map: { code: 'code', name: 'name' },
    search: 'name',
  },
  'academic-terms': {
    table: 'academic_terms',
    schema: z
      .object({
        academicYear: text(9).regex(/^\d{4}-\d{4}$/),
        semester: text(20),
        startDate: date,
        endDate: date,
      })
      .strict(),
    map: {
      academicYear: 'academic_year',
      semester: 'semester',
      startDate: 'start_date',
      endDate: 'end_date',
    },
    search: 'academic_year',
  },
  requirements: {
    table: 'requirements',
    schema: z
      .object({
        code: text(40),
        title: text(180),
        description: z.string().trim().max(4000),
        stage: z.enum(['pre_deployment', 'ongoing', 'completion']),
        isRequired: z.boolean(),
      })
      .strict(),
    map: {
      code: 'code',
      title: 'title',
      description: 'description',
      stage: 'stage',
      isRequired: 'is_required',
    },
    search: 'title',
  },
  'evaluation-criteria': {
    table: 'evaluation_criteria',
    schema: z
      .object({
        rubricVersion: z.number().int().positive(),
        code: text(40),
        label: text(180),
        maxScore: z.number().positive().max(99999.99).multipleOf(0.01),
        sortOrder: z.number().int().min(0).max(65535),
      })
      .strict(),
    map: {
      rubricVersion: 'rubric_version',
      code: 'code',
      label: 'label',
      maxScore: 'max_score',
      sortOrder: 'sort_order',
    },
    search: 'label',
  },
};
const createUser = z
  .object({
    email,
    fullName: text(150),
    role: z.enum(['admin', 'faculty', 'student', 'supervisor']),
    temporaryPassword: password,
    profile: z.unknown(),
  })
  .strict();
module.exports = { descriptors, profile, createUser, email };
