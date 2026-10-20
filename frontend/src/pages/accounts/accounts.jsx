import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useResource, all, queryString } from '../../services/hooks';
import { api } from '../../services/api';
import { DataTable } from '../../components/data-table';
import { FormField } from '../../components/form-field';
import { Modal } from '../../components/modal';
import { State } from '../../components/state';
import { StatusBadge } from '../../components/status-badge';
export default function Accounts() {
  const [params, setParams] = useSearchParams(),
    [editor, setEditor] = useState(null),
    [reset, setReset] = useState(null),
    [error, setError] = useState(null),
    [busy, setBusy] = useState(false);
  const result = useResource(
    '/users' + queryString({ page: params.get('page') || 1, search: params.get('search') || '' }),
  );
  async function edit(row) {
    try {
      setEditor((await api.get('/users/' + row.id)).data);
    } catch (e) {
      setError(e.message);
    }
  }
  async function toggle(row) {
    setBusy(true);
    try {
      await api.patch('/users/' + row.id, { isActive: !row.isActive });
      result.refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ACCESS MANAGEMENT</span>
          <h1>Accounts</h1>
          <p>Create role-specific profiles and manage account access.</p>
        </div>
        <button onClick={() => setEditor({ role: params.get('role') || 'student' })}>
          + Create account
        </button>
      </div>
      {error && (
        <p className="alert error" role="alert">
          {error}
        </p>
      )}
      <section className="card">
        <form className="filter-bar" onSubmit={(e) => e.preventDefault()}>
          <FormField
            name="search"
            label="Search accounts"
            type="search"
            value={params.get('search') || ''}
            onChange={(v) => setParams({ search: v })}
          />
          <button type="button" className="outline" onClick={result.refresh}>
            Refresh
          </button>
        </form>
        <State
          loading={result.loading}
          error={result.error}
          retry={result.refresh}
          empty={result.data?.length === 0}
        >
          <DataTable
            rows={result.data || []}
            meta={result.meta}
            onPage={(page) => setParams({ search: params.get('search') || '', page })}
            columns={[
              { key: 'fullName', label: 'Full name' },
              { key: 'email', label: 'Email' },
              { key: 'role', label: 'Role' },
              {
                key: 'isActive',
                label: 'Status',
                render: (r) => <StatusBadge status={r.isActive ? 'active' : 'inactive'} />,
              },
              {
                key: 'actions',
                label: 'Manage',
                render: (r) => (
                  <div className="actions">
                    <button className="outline" onClick={() => edit(r)}>
                      Edit
                    </button>
                    <button className="outline" disabled={busy} onClick={() => toggle(r)}>
                      {r.isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                    <button className="outline" onClick={() => setReset(r)}>
                      Reset password
                    </button>
                  </div>
                ),
              },
            ]}
          />
        </State>
      </section>
      {editor && (
        <AccountEditor
          row={editor}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            result.refresh();
          }}
        />
      )}
      {reset && <ResetPassword row={reset} onClose={() => setReset(null)} />}
    </>
  );
}
const profiles = {
  student: [
    ['studentNumber', 'Student number'],
    ['course', 'Program / course'],
    ['yearLevel', 'Year level', 'number'],
    ['schoolDepartmentId', 'School department', 'school'],
  ],
  faculty: [
    ['employeeNumber', 'Employee number'],
    ['schoolDepartmentId', 'School department', 'school'],
  ],
  supervisor: [
    ['companyDepartmentId', 'Company department', 'company'],
    ['position', 'Position'],
    ['contactPhone', 'Contact phone'],
  ],
  admin: [],
};
function AccountEditor({ row, onClose, onSaved }) {
  const [values, setValues] = useState({
      email: row.email || '',
      fullName: row.fullName || '',
      role: row.role || 'student',
      temporaryPassword: '',
      ...row.profile,
    }),
    [schools, setSchools] = useState([]),
    [hosts, setHosts] = useState([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(null);
  useEffect(() => {
    Promise.all([all('/school-departments'), all('/company-departments')])
      .then(([s, h]) => {
        setSchools(s);
        setHosts(h);
      })
      .catch(setError);
  }, []);
  const change = (name, v) => setValues((s) => ({ ...s, [name]: v }));
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const profile = {};
      for (const [name, , type] of profiles[values.role]) {
        const v = values[name];
        if (v !== undefined && v !== '')
          profile[name] = ['number', 'school', 'company'].includes(type) ? Number(v) : v;
      }
      if (row.id)
        await api.patch('/users/' + row.id, {
          email: values.email,
          fullName: values.fullName,
          ...(values.role !== 'admin' ? { profile } : {}),
        });
      else
        await api.post('/users', {
          email: values.email,
          fullName: values.fullName,
          role: values.role,
          temporaryPassword: values.temporaryPassword,
          profile,
        });
      onSaved();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={row.id ? 'Edit account' : 'Create account'}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form onSubmit={submit}>
        {error && (
          <p className="alert error" role="alert">
            {error.message}
          </p>
        )}
        <div className="form-grid">
          <FormField
            name="fullName"
            label="Full name"
            value={values.fullName}
            onChange={(v) => change('fullName', v)}
            required
          />
          <FormField
            name="email"
            label="Email"
            type="email"
            value={values.email}
            onChange={(v) => change('email', v)}
            required
          />
          {!row.id && (
            <>
              <FormField
                name="role"
                label="Role"
                type="select"
                value={values.role}
                onChange={(v) => change('role', v)}
                options={['admin', 'student', 'faculty', 'supervisor'].map((value) => ({
                  value,
                  label: value,
                }))}
                required
              />
              <FormField
                name="temporaryPassword"
                label="Temporary password"
                type="password"
                autoComplete="new-password"

                value={values.temporaryPassword}
                onChange={(v) => change('temporaryPassword', v)}
                required
                help="12-72 UTF-8 bytes. The user must change this on first login."
              />
            </>
          )}
          {profiles[values.role].map(([name, label, type]) => (
            <FormField
              key={name}
              name={name}
              label={label}
              type={['school', 'company'].includes(type) ? 'select' : type || 'text'}
              value={values[name] || ''}
              onChange={(v) => change(name, v)}
              min={name === 'yearLevel' ? 1 : undefined}
              max={name === 'yearLevel' ? 6 : undefined}
              options={
                type === 'school'
                  ? schools.filter((s) => s.isActive).map((s) => ({ value: s.id, label: s.name }))
                  : type === 'company'
                    ? hosts
                        .filter((s) => s.isActive)
                        .map((s) => ({
                          value: s.id,
                          label: s.departmentName + ' (#' + s.companyId + ')',
                        }))
                    : []
              }
              required={!['position', 'contactPhone'].includes(name)}
            />
          ))}
        </div>
        <div className="actions">
          <button disabled={busy}>{busy ? 'Saving...' : 'Save account'}</button>
          <button className="outline" type="button" disabled={busy} onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
function ResetPassword({ row, onClose }) {
  const [password, setPassword] = useState(''),
    [error, setError] = useState(null),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/users/' + row.id + '/reset-password', { temporaryPassword: password });
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={'Reset password: ' + row.fullName} onClose={onClose}>
      <form onSubmit={submit}>
        <p>This revokes current sessions and requires a password change on next sign-in.</p>
        {error && (
          <p className="alert error" role="alert">
            {error}
          </p>
        )}
        <FormField
          name="temporaryPassword"
          label="New temporary password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}

          required
        />
        <button disabled={busy}>Reset password</button>
      </form>
    </Modal>
  );
}
