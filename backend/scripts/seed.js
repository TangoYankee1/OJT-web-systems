const bcrypt = require('bcryptjs');
const { loadEnv } = require('../src/config/env');
const { createPool } = require('../src/config/db');
const { rows, one, insert } = require('../src/shared/repository');
const { transaction } = require('../src/shared/transactions');
async function referenceSeed(pool) {
  await transaction(pool, async (c) => {
    const seeds = [
      [
        'school_departments',
        'code',
        { code: 'DEMO-IT', name: 'Demonstration Information Technology' },
      ],
      [
        'academic_terms',
        'academic_year',
        {
          academic_year: '2026-2027',
          semester: '1',
          start_date: '2026-08-01',
          end_date: '2027-01-31',
        },
      ],
      [
        'requirements',
        'code',
        {
          code: 'PRE-CONSENT',
          title: 'Consent form',
          description: 'Demonstration requirement; replace with institutional policy.',
          stage: 'pre_deployment',
          is_required: 1,
        },
      ],
      [
        'requirements',
        'code',
        {
          code: 'FINAL-REPORT',
          title: 'Final report',
          description: 'Demonstration completion report.',
          stage: 'completion',
          is_required: 1,
        },
      ],
    ];
    for (const [t, k, data] of seeds) {
      const existing =
        t === 'academic_terms'
          ? await one(c, 'SELECT id FROM academic_terms WHERE academic_year=? AND semester=?', [
              data.academic_year,
              data.semester,
            ])
          : await one(c, 'SELECT id FROM ' + t + ' WHERE ' + k + '=?', [data[k]]);
      if (!existing) await insert(c, t, data);
    }
    const usedRubric = await one(c, 'SELECT id FROM evaluations WHERE rubric_version=1 LIMIT 1');
    for (const [code, label, max, order] of [
      ['WORK', 'Work performance', 60, 1],
      ['CONDUCT', 'Professional conduct', 40, 2],
    ])
      if (
        !usedRubric &&
        !(await one(c, 'SELECT id FROM evaluation_criteria WHERE rubric_version=1 AND code=?', [
          code,
        ]))
      )
        await insert(c, 'evaluation_criteria', {
          rubric_version: 1,
          code,
          label,
          max_score: max,
          sort_order: order,
        });
  });
}
async function demoSeed(pool, env, password) {
  if (!['development', 'test'].includes(env.NODE_ENV))
    throw new Error('Demo seed refuses non-development/test environment');
  require('../src/middleware/validate').password.parse(password);
  await referenceSeed(pool);
  const hash = await bcrypt.hash(password, 12);
  await transaction(pool, async (c) => {
    const dept = await one(c, "SELECT id FROM school_departments WHERE code='DEMO-IT'");
    const term = await one(
      c,
      "SELECT id FROM academic_terms WHERE academic_year='2026-2027' AND semester='1'",
    );
    for (const number of [1, 2]) {
      const name = 'SYNTHETIC Company ' + number;
      let co = await one(c, 'SELECT id FROM companies WHERE name=?', [name]);
      if (!co)
        co = {
          id: await insert(c, 'companies', { name, address: 'Synthetic demonstration address' }),
        };
      if (
        !(await one(
          c,
          'SELECT id FROM company_departments WHERE company_id=? AND department_name=?',
          [co.id, 'Demo operations'],
        ))
      )
        await insert(c, 'company_departments', {
          company_id: co.id,
          department_name: 'Demo operations',
        });
    }
    const host = await one(
      c,
      "SELECT d.id FROM company_departments d JOIN companies co ON co.id=d.company_id WHERE co.name='SYNTHETIC Company 1'",
    );
    for (const [role, n] of [
      ['faculty', 1],
      ['supervisor', 1],
      ['student', 1],
      ['student', 2],
    ]) {
      const email = role + n + '@demo.invalid';
      if (await one(c, 'SELECT id FROM users WHERE email=?', [email])) continue;
      const uid = await insert(c, 'users', {
        email,
        password_hash: hash,
        full_name: 'SYNTHETIC ' + role + ' ' + n,
        role,
        must_change_password: 1,
      });
      if (role === 'student')
        await insert(c, 'students', {
          user_id: uid,
          student_number: 'DEMO-S' + n,
          course: 'Demonstration IT',
          year_level: 4,
          school_department_id: dept.id,
        });
      if (role === 'faculty')
        await insert(c, 'faculty', {
          user_id: uid,
          employee_number: 'DEMO-F' + n,
          school_department_id: dept.id,
        });
      if (role === 'supervisor')
        await insert(c, 'company_supervisors', {
          user_id: uid,
          company_department_id: host.id,
          position: 'Demo reviewer',
        });
    }
    const faculty = await one(
      c,
      "SELECT f.id FROM faculty f JOIN users u ON u.id=f.user_id WHERE u.email='faculty1@demo.invalid'",
    );
    const supervisor = await one(
      c,
      "SELECT s.id FROM company_supervisors s JOIN users u ON u.id=s.user_id WHERE u.email='supervisor1@demo.invalid'",
    );
    for (const n of [1, 2]) {
      const st = await one(
        c,
        'SELECT s.id FROM students s JOIN users u ON u.id=s.user_id WHERE u.email=?',
        ['student' + n + '@demo.invalid'],
      );
      if (await one(c, 'SELECT id FROM placements WHERE student_id=?', [st.id])) continue;
      const pid = await insert(c, 'placements', {
        student_id: st.id,
        faculty_id: faculty.id,
        supervisor_id: n === 1 ? supervisor.id : null,
        academic_term_id: term.id,
        deployment_type: n === 1 ? 'company' : 'school',
        company_department_id: n === 1 ? host.id : null,
        school_department_id: n === 2 ? dept.id : null,
        start_date: '2026-08-01',
        end_date: '2027-01-31',
        required_minutes: 29160,
        status: n === 1 ? 'pending' : 'rejected',
        status_remarks: n === 2 ? 'Synthetic historical rejected example' : null,
      });
      await rows(
        c,
        'INSERT INTO placement_requirements (placement_id,requirement_id,title_snapshot,stage_snapshot,is_required_snapshot) SELECT ?,id,title,stage,is_required FROM requirements WHERE is_active=1',
        [pid],
      );
    }
  });
}
if (require.main === module)
  (async () => {
    const env = loadEnv(),
      pool = createPool(env);
    try {
      if (process.argv.includes('--demo')) await demoSeed(pool, env, process.env.DEMO_PASSWORD);
      else await referenceSeed(pool);
      console.log('Seed completed; existing edited reference values retained.');
    } finally {
      await pool.end();
    }
  })().catch((e) => {
    console.error(e.code || e.message);
    process.exitCode = 1;
  });
module.exports = { referenceSeed, demoSeed };
