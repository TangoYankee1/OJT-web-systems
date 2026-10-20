import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/auth-context';
import { api } from '../../services/api';
import { useResource } from '../../services/hooks';
import { FormField } from '../../components/form-field';
import { DataTable } from '../../components/data-table';
import { State } from '../../components/state';
import ResourcePage from '../directories/resource-page';
export default function Settings() {
  const { user, load } = useAuth(),
    [name, setName] = useState(user.fullName),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(null),
    [saved, setSaved] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.patch('/users/' + user.id, { fullName: name });
      setSaved(true);
      await load();
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
          <span className="eyebrow">ACCOUNT & CONFIGURATION</span>
          <h1>Settings</h1>
          <p>Manage your profile and security.</p>
        </div>
      </div>
      <section className="card">
        <h2>My profile</h2>
        <p className="muted">
          {user.email} &middot; {user.role}
        </p>
        {error && (
          <p className="alert error" role="alert">
            {error}
          </p>
        )}
        {saved && (
          <p className="success" role="status">
            Profile saved.
          </p>
        )}
        <form onSubmit={submit}>
          <FormField
            name="fullName"
            label="Full name"
            maxLength={150}
            required
            value={name}
            onChange={setName}
          />
          <div className="actions">
            <button disabled={busy}>{busy ? 'Saving...' : 'Save profile'}</button>
            <Link className="button outline" to="/change-password">
              Change password
            </Link>
          </div>
        </form>
      </section>
      {user.role === 'admin' && (
        <>
          <ResourcePage resource="academic-terms" embedded />
          <section className="card">
            <h2>Institutional configuration</h2>
            <p>
              Record approved program hours when assigning a placement. Maintain requirement
              templates and publish new rubric versions before assigning students.
            </p>
            <div className="actions">
              <Link className="button outline" to="/requirements">
                Requirement templates
              </Link>
              <Link className="button outline" to="/evaluation-criteria">
                Evaluation rubric
              </Link>
              <Link className="button outline" to="/users">
                Account management
              </Link>
            </div>
          </section>
        </>
      )}
    </>
  );
}
export function AuditPage() {
  const [page, setPage] = useState(1),
    r = useResource('/audit-logs?page=' + page);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ACCOUNTABILITY</span>
          <h1>Audit log</h1>
          <p>Business events recorded with actor, record and request identifiers.</p>
        </div>
      </div>
      <section className="card">
        <State loading={r.loading} error={r.error} retry={r.refresh} empty={!r.data?.length}>
          <DataTable
            rows={r.data || []}
            meta={r.meta}
            onPage={setPage}
            columns={[
              { key: 'action', label: 'Action' },
              { key: 'actorId', label: 'Actor' },
              { key: 'entityType', label: 'Resource' },
              { key: 'entityId', label: 'Record' },
              { key: 'requestId', label: 'Request' },
              { key: 'createdAt', label: 'UTC time' },
            ]}
          />
        </State>
      </section>
    </>
  );
}
export function Help() {
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">WORKFLOW GUIDE</span>
          <h1>Help & workflow</h1>
          <p>From assignment to a completed internship record.</p>
        </div>
      </div>
      {[
        [
          'Administrator',
          'Create school departments, terms, companies and company departments. Create faculty, student and supervisor accounts. Assign a placement with approved program hours. Activate it after faculty approval and the start date. Archive outdated records to preserve history.',
        ],
        [
          'Student',
          'Change your temporary password on first login. Open My requirements to submit genuine PDF, JPEG or PNG files up to 10 MiB. Check review remarks and resubmit rejected requirements. Once active, log actual same-day duty in Manila time, subtract breaks, and submit it for review. Draft work does not count as approved hours.',
        ],
        [
          'Faculty',
          'Review documents from assigned students. Approve the placement after all required pre-deployment documents pass. For school placements, plan schedules, review duty and author evaluations. Finalize submitted evaluations, then complete the placement when all prerequisites pass.',
        ],
        [
          'Company supervisor',
          'Use Schedules & duty to plan work and review actual logs for assigned interns. Create midterm and final scorecards, save drafts, complete every criterion, and submit them to faculty. Finalized scorecards are read-only.',
        ],
        [
          'Corrections and completion',
          'An approved document or duty log needs an explicit reopen with a reason before correction. Reopened duty stops contributing approved credit. Completion needs enough approved minutes, all required documents approved, finalized midterm and final evaluations, and no submitted reviews remaining.',
        ],
        [
          'Reports and account recovery',
          'Reports show only permitted placements. Apply term, status and search filters before CSV or print/PDF export. Contact your administrator for an assisted password reset. In-app notifications refresh every 30 seconds.',
        ],
      ].map(([title, text]) => (
        <section className="card" key={title}>
          <h2>{title}</h2>
          <p>{text}</p>
        </section>
      ))}
    </>
  );
}
