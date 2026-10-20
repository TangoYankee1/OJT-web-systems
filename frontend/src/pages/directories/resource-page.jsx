import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useResource, queryString } from '../../services/hooks';
import { useAuth } from '../../contexts/auth-context';
import { FormField } from '../../components/form-field';
import { Modal } from '../../components/modal';
import { DataTable } from '../../components/data-table';
import { StatusBadge } from '../../components/status-badge';
import { State } from '../../components/state';
const f = (name, label, type = 'text', extra = {}) => ({ name, label, type, ...extra });
const choices = (a) => a.map((value) => ({ value, label: value.replaceAll('_', ' ') }));
export const configs = {
  companies: {
    title: 'Companies',
    singular: 'company',
    description: 'Host organizations and their operating departments.',
    fields: [
      f('name', 'Company name'),
      f('address', 'Address', 'textarea'),
      f('contactEmail', 'Contact email', 'email', { optional: true }),
      f('contactPhone', 'Contact phone', 'text', { optional: true }),
    ],
    columns: ['name', 'contactEmail', 'contactPhone'],
  },
  'company-departments': {
    title: 'Company departments',
    singular: 'department',
    description: 'Assign each supervisor to a specific host department.',
    fields: [f('departmentName', 'Department name')],
    columns: ['departmentName'],
  },
  'school-departments': {
    title: 'School departments',
    singular: 'school department',
    description: 'Academic departments used by faculty, students and school placements.',
    fields: [f('code', 'Department code'), f('name', 'Department name')],
    columns: ['code', 'name'],
  },
  'academic-terms': {
    title: 'Academic terms',
    singular: 'academic term',
    description: 'Select the current term for default dashboard metrics.',
    fields: [
      f('academicYear', 'Academic year', 'text', { placeholder: '2026-2027' }),
      f('semester', 'Semester'),
      f('startDate', 'Start date', 'date'),
      f('endDate', 'End date', 'date'),
    ],
    columns: ['academicYear', 'semester', 'startDate', 'endDate'],
  },
  requirements: {
    title: 'Requirement templates',
    singular: 'requirement',
    description:
      'New placements copy these templates. Existing snapshots keep their original values.',
    fields: [
      f('code', 'Requirement code'),
      f('title', 'Title'),
      f('description', 'Description', 'textarea', { optional: true }),
      f('stage', 'Stage', 'select', {
        options: choices(['pre_deployment', 'ongoing', 'completion']),
      }),
      f('isRequired', 'Required for completion', 'checkbox'),
    ],
    columns: ['code', 'title', 'stage', 'isRequired'],
  },
  'evaluation-criteria': {
    title: 'Evaluation rubric',
    singular: 'criterion',
    description: 'Publish a new version after use. Historical scorecards keep their snapshots.',
    fields: [
      f('rubricVersion', 'Rubric version', 'number', { min: 1 }),
      f('code', 'Criterion code'),
      f('label', 'Criterion label'),
      f('maxScore', 'Maximum score', 'number', { min: 0.01, step: 0.01 }),
      f('sortOrder', 'Display order', 'number', { min: 0 }),
    ],
    columns: ['rubricVersion', 'code', 'label', 'maxScore'],
  },
  students: {
    title: 'Students',
    singular: 'student',
    description: 'Students visible within your assigned placements.',
    fields: [],
    columns: ['studentNumber', 'fullName', 'course', 'yearLevel'],
  },
  faculty: {
    title: 'Faculty',
    singular: 'faculty member',
    description: 'Institutional faculty directory.',
    fields: [],
    columns: ['employeeNumber', 'fullName', 'schoolDepartmentId'],
  },
  supervisors: {
    title: 'Supervisors',
    singular: 'supervisor',
    description: 'Industry supervisors and their host departments.',
    fields: [],
    columns: ['fullName', 'companyDepartmentId', 'position'],
  },
};
const label = (s) => s.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
export default function ResourcePage({ resource, endpoint, embedded = false }) {
  const cfg = configs[resource],
    { user } = useAuth(),
    [params, setParams] = useSearchParams();
  const [embeddedPage, setEmbeddedPage] = useState(1);
  const page = embedded ? embeddedPage : Number(params.get('page') || 1),
    search = embedded ? '' : params.get('search') || '';
  const path = endpoint || '/' + resource;
  const result = useResource(path + queryString({ page, search }));
  const [editor, setEditor] = useState(null),
    [view, setView] = useState(null),
    [departments, setDepartments] = useState(null),
    [error, setError] = useState(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(null);
  const canWrite = user.role === 'admin' && cfg.fields.length > 0;
  function filter(key, value) {
    if (embedded && key === 'page') {
      setEmbeddedPage(Number(value));
      return;
    }
    setParams((p) => {
      p.set(key, value);
      if (key !== 'page') p.delete('page');
      return p;
    });
  }
  async function archive(row) {
    setBusy(true);
    try {
      await api.patch('/' + resource + '/' + row.id, { isActive: !row.isActive });
      result.refresh();
      setMessage('Record updated.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function activate(row) {
    setBusy(true);
    try {
      await api.post('/academic-terms/' + row.id + '/activate');
      result.refresh();
      setMessage('Current academic term updated.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const columns = cfg.columns.map((key) => ({
    key,
    label: label(key),
    render: (row) =>
      typeof row[key] === 'boolean' ? (row[key] ? 'Yes' : 'No') : String(row[key] ?? '-'),
  }));
  if (!['students', 'faculty', 'supervisors'].includes(resource))
    columns.push({
      key: 'isActive',
      label: 'Status',
      render: (row) => <StatusBadge status={row.isActive ? 'active' : 'inactive'} />,
    });
  columns.push({
    key: 'actions',
    label: 'Actions',
    render: (row) => (
      <div className="actions">
        <button className="outline" onClick={() => setView(row)}>
          Details
        </button>
        {canWrite && (
          <button className="outline" disabled={busy} onClick={() => setEditor(row)}>
            Edit
          </button>
        )}
        {canWrite && resource !== 'academic-terms' && (
          <button className="outline" disabled={busy} onClick={() => archive(row)}>
            {row.isActive ? 'Archive' : 'Restore'}
          </button>
        )}
        {resource === 'academic-terms' && canWrite && !row.isActive && (
          <button className="outline" disabled={busy} onClick={() => activate(row)}>
            Make current
          </button>
        )}
        {resource === 'companies' && (
          <button className="outline" onClick={() => setDepartments(row)}>
            Departments
          </button>
        )}
      </div>
    ),
  });
  return (
    <>
      {!embedded && (
        <div className="page-heading">
          <div>
            <span className="eyebrow">DIRECTORY & CONFIGURATION</span>
            <h1>{cfg.title}</h1>
            <p>{cfg.description}</p>
          </div>
          {canWrite ? (
            <button onClick={() => setEditor({})}>+ Add {cfg.singular}</button>
          ) : user.role === 'admin' && ['students', 'faculty', 'supervisors'].includes(resource) ? (
            <Link
              className="button"
              to={
                '/users?role=' +
                { students: 'student', faculty: 'faculty', supervisors: 'supervisor' }[resource]
              }
            >
              + Create account
            </Link>
          ) : null}
        </div>
      )}
      {error && (
        <p className="alert error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="success" role="status">
          {message}
        </p>
      )}
      <section className="card">
        <div className="card-heading">
          <h2>{embedded ? cfg.title : 'All ' + cfg.title.toLowerCase()}</h2>
          {embedded && canWrite && (
            <button onClick={() => setEditor({})}>+ Add {cfg.singular}</button>
          )}
        </div>
        {!embedded && (
          <form className="filter-bar" onSubmit={(e) => e.preventDefault()}>
            <FormField
              name="search"
              label="Search"
              type="search"
              value={search}
              onChange={(v) => filter('search', v)}
            />
            <button type="button" className="outline" onClick={result.refresh}>
              Refresh
            </button>
          </form>
        )}
        <State
          loading={result.loading}
          error={result.error}
          retry={result.refresh}
          empty={result.data?.length === 0}
        >
          <DataTable
            columns={columns}
            rows={result.data || []}
            meta={result.meta}
            onPage={(n) => filter('page', n)}
            caption={cfg.title}
          />
        </State>
      </section>
      {editor && (
        <ResourceEditor
          config={cfg}
          resource={resource}
          endpoint={path}
          row={editor}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            result.refresh();
            setMessage('Saved successfully.');
          }}
        />
      )}
      {view && (
        <Modal title={cfg.title + ' details'} onClose={() => setView(null)}>
          <dl className="detail-grid">
            {Object.entries(view).map(([k, v]) => (
              <div key={k}>
                <dt>{label(k)}</dt>
                <dd>{String(v ?? '-')}</dd>
              </div>
            ))}
          </dl>
        </Modal>
      )}
      {departments && (
        <Modal title={departments.name + ' departments'} onClose={() => setDepartments(null)}>
          <ResourcePage
            resource="company-departments"
            endpoint={'/companies/' + departments.id + '/departments'}
            embedded
          />
        </Modal>
      )}
    </>
  );
}
function ResourceEditor({ config, resource, endpoint, row, onClose, onSaved }) {
  const [values, setValues] = useState(() =>
      Object.fromEntries(
        config.fields.map((f) => [
          f.name,
          row[f.name] ?? (f.type === 'checkbox' ? true : f.name === 'sortOrder' ? 0 : ''),
        ]),
      ),
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(null);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = {};
      for (const field of config.fields) {
        if (row.id && resource === 'school-departments' && field.name === 'code') continue;
        let value = values[field.name];
        if (field.type === 'number') value = Number(value);
        if (field.optional && value === '') value = field.name === 'description' ? '' : null;
        if (!row.id || value !== row[field.name]) data[field.name] = value;
      }
      if (!Object.keys(data).length) {
        onClose();
        return;
      }
      if (row.id) await api.patch('/' + resource + '/' + row.id, data);
      else await api.post(endpoint, data);
      onSaved();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={(row.id ? 'Edit ' : 'Add ') + config.singular}
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
          {config.fields
            .filter((f) => !(row.id && resource === 'school-departments' && f.name === 'code'))
            .map((f) => (
              <FormField
                key={f.name}
                {...f}
                required={!f.optional && f.type !== 'checkbox'}
                value={values[f.name]}
                onChange={(v) => setValues((s) => ({ ...s, [f.name]: v }))}
                error={error?.fields?.[f.name]}
              />
            ))}
        </div>
        <div className="actions">
          <button disabled={busy}>{busy ? 'Saving...' : 'Save changes'}</button>
          <button type="button" className="outline" disabled={busy} onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
