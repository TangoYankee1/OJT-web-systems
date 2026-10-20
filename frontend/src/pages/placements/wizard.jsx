import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { all } from '../../services/hooks';
import { FormField } from '../../components/form-field';
import { State } from '../../components/state';
export default function PlacementWizard() {
  const { id } = useParams(),
    navigate = useNavigate();
  const [options, setOptions] = useState(null),
    [existing, setExisting] = useState(null),
    [error, setError] = useState(null),
    [version, setVersion] = useState(0);
  useEffect(() => {
    let live = true;
    Promise.all([
      all('/students'),
      all('/faculty'),
      all('/supervisors'),
      all('/academic-terms'),
      all('/company-departments'),
      all('/school-departments'),
      id ? api.get('/placements/' + id) : null,
    ])
      .then(([students, faculty, supervisors, terms, hosts, schools, p]) => {
        if (live) {
          setOptions({ students, faculty, supervisors, terms, hosts, schools });
          setExisting(p?.data);
          setError(null);
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [id, version]);
  if (!options || error)
    return <State loading={!error} error={error} retry={() => setVersion((v) => v + 1)} />;
  return (
    <WizardForm
      key={id || 'new'}
      options={options}
      existing={existing}
      onSaved={(p) => navigate('/placements/' + p.id)}
    />
  );
}
function WizardForm({ options: o, existing: p, onSaved }) {
  const [step, setStep] = useState(0),
    [v, setV] = useState({
      studentId: p?.studentId || '',
      facultyId: p?.facultyId || '',
      supervisorId: p?.supervisorId || '',
      academicTermId: p?.academicTermId || o.terms.find((t) => t.isActive)?.id || '',
      deploymentType: p?.deploymentType || 'company',
      companyDepartmentId: p?.companyDepartmentId || '',
      schoolDepartmentId: p?.schoolDepartmentId || '',
      startDate: p?.startDate || '',
      endDate: p?.endDate || '',
      hours: p ? p.requiredMinutes / 60 : '',
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(null);
  const change = (k, value) =>
    setV((s) => ({
      ...s,
      [k]: value,
      ...(k === 'companyDepartmentId' ? { supervisorId: '' } : {}),
    }));
  const opts = (list, label = 'fullName') =>
    list.filter((x) => x.isActive !== false).map((x) => ({ value: x.id, label: x[label] }));
  function field(name, label, type = 'select', options = []) {
    return (
      <FormField
        name={name}
        label={label}
        type={type}
        value={v[name]}
        onChange={(value) => change(name, value)}
        options={options}
        required={name !== 'supervisorId'}
        disabled={!!p && name === 'studentId'}
        min={name === 'hours' ? 0.25 : undefined}
        step={name === 'hours' ? 0.25 : undefined}
      />
    );
  }
  async function submit(e) {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    setBusy(true);
    try {
      const body = {
        studentId: Number(v.studentId),
        facultyId: Number(v.facultyId),
        supervisorId:
          v.deploymentType === 'company' && v.supervisorId ? Number(v.supervisorId) : null,
        academicTermId: Number(v.academicTermId),
        deploymentType: v.deploymentType,
        companyDepartmentId: v.deploymentType === 'company' ? Number(v.companyDepartmentId) : null,
        schoolDepartmentId: v.deploymentType === 'school' ? Number(v.schoolDepartmentId) : null,
        startDate: v.startDate,
        endDate: v.endDate,
        requiredMinutes: Math.round(Number(v.hours) * 60),
      };
      if (p) delete body.studentId;
      const r = p
        ? await api.patch('/placements/' + p.id, body)
        : await api.post('/placements', body);
      onSaved(r.data);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  if (p && p.status !== 'pending') return <State error="Only pending placements can be edited." />;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">PLACEMENT ASSIGNMENT</span>
          <h1>{p ? 'Edit placement' : 'Assign a placement'}</h1>
          <p>Set the academic context, host and approved hour requirement.</p>
        </div>
        <Link className="button outline" to="/placements">
          Back to roster
        </Link>
      </div>
      <section className="card">
        <div className="steps">
          {['Student & term', 'Host & reviewers', 'Dates & hours', 'Review'].map((label, i) => (
            <span key={label} className={i === step ? 'current' : ''}>
              <b>{i + 1}</b>
              {label}
            </span>
          ))}
        </div>
        {error && (
          <p className="alert error" role="alert">
            {error.message}
            {error.fields && <small>{Object.values(error.fields).join('; ')}</small>}
          </p>
        )}
        <form onSubmit={submit}>
          <div className="form-grid">
            {step === 0 && (
              <>
                {field('studentId', 'Student', 'select', opts(o.students))}
                {field(
                  'academicTermId',
                  'Academic term',
                  'select',
                  o.terms.map((t) => ({ value: t.id, label: t.academicYear + ' / ' + t.semester })),
                )}
              </>
            )}
            {step === 1 && (
              <>
                {field('deploymentType', 'Deployment type', 'select', [
                  { value: 'company', label: 'Company-hosted' },
                  { value: 'school', label: 'School-hosted' },
                ])}
                {field('facultyId', 'Assigned faculty', 'select', opts(o.faculty))}
                {v.deploymentType === 'company' ? (
                  <>
                    {field(
                      'companyDepartmentId',
                      'Company department',
                      'select',
                      opts(o.hosts, 'departmentName'),
                    )}
                    {field(
                      'supervisorId',
                      'Assigned supervisor',
                      'select',
                      opts(
                        o.supervisors.filter(
                          (s) => s.companyDepartmentId === Number(v.companyDepartmentId),
                        ),
                      ),
                    )}
                  </>
                ) : (
                  field(
                    'schoolDepartmentId',
                    'School host department',
                    'select',
                    opts(o.schools, 'name'),
                  )
                )}
              </>
            )}
            {step === 2 && (
              <>
                {field('startDate', 'Start date', 'date')}
                {field('endDate', 'End date', 'date')}
                {field('hours', 'Required hours', 'number')}
                <p className="help-copy">
                  Enter hours from your approved program policy. A company supervisor is required
                  before activation.
                </p>
              </>
            )}
            {step === 3 && (
              <div className="full">
                <h2>Review assignment</h2>
                <dl className="detail-grid">
                  {[
                    ['Student', o.students.find((s) => s.id === Number(v.studentId))?.fullName],
                    ['Host type', v.deploymentType],
                    ['Faculty', o.faculty.find((f) => f.id === Number(v.facultyId))?.fullName],
                    ['Start', v.startDate],
                    ['End', v.endDate],
                    ['Required hours', v.hours],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value || 'Not selected'}</dd>
                    </div>
                  ))}
                </dl>
                <p className="help-copy">
                  Active requirement templates will be copied into this placement. Existing live
                  placements for this student prevent a duplicate assignment.
                </p>
              </div>
            )}
          </div>
          <div className="actions">
            {step > 0 && (
              <button
                type="button"
                className="outline"
                disabled={busy}
                onClick={() => setStep(step - 1)}
              >
                Back
              </button>
            )}
            <button disabled={busy}>
              {busy ? 'Saving...' : step === 3 ? 'Save placement' : 'Continue'}
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
