import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/auth-context';
import { useResource, queryString } from '../../services/hooks';
import { FormField } from '../../components/form-field';
import { State } from '../../components/state';
import { DataTable } from '../../components/data-table';
import { StatusBadge } from '../../components/status-badge';
export default function Dashboard() {
  const { user } = useAuth(),
    { role } = useParams(),
    [params, setParams] = useSearchParams(),
    r = useResource(
      '/dashboard/' + role + queryString({ academicTermId: params.get('academicTermId') }),
    ),
    terms = useResource('/academic-terms?limit=100'),
    audit = useResource(user.role === 'admin' ? '/audit-logs?limit=5' : null);
  const d = r.data;
  if (role !== user.role) return <State error="This dashboard is not available to your role." />;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR PLACEMENT OVERVIEW</span>
          <h1>{user.role === 'student' ? 'My internship' : 'Monitoring dashboard'}</h1>
          <p>
            Welcome, {user.fullName.split(' ')[0]}. Here is the current state of your placements.
          </p>
        </div>
        <div className="actions">
          {user.role === 'admin' && (
            <Link className="button" to="/placements/new">
              + Assign placement
            </Link>
          )}
        </div>
      </div>
      <form className="filter-bar" onSubmit={(e) => e.preventDefault()}>
        <FormField
          label="Academic term"
          name="academicTermId"
          type="select"
          value={params.get('academicTermId') || d?.academicTermId || ''}
          onChange={(v) => setParams(v ? { academicTermId: v } : {})}
          options={(terms.data || []).map((t) => ({
            value: t.id,
            label: t.academicYear + ' / ' + t.semester + (t.isActive ? ' (current)' : ''),
          }))}
        />
        <button className="outline" type="button" onClick={r.refresh}>
          Refresh dashboard
        </button>
      </form>
      {terms.error && (
        <p className="alert error" role="alert">
          {terms.error}
        </p>
      )}
      <State loading={r.loading} error={r.error} retry={r.refresh}>
        {d && (
          <>
            <div className="stats-grid">
              {[
                [
                  user.role === 'student' ? 'APPROVED HOURS' : 'ACTIVE PLACEMENTS',
                  user.role === 'student'
                    ? (d.ownProgress?.approvedMinutes / 60 || 0).toFixed(2)
                    : d.active,
                  'Actual approved duty / active status',
                ],
                ['COMPLETED', d.completed, 'Completed placements in the selected term'],
                [
                  'COMPLETION RATE',
                  d.completionRate.toFixed(1) + '%',
                  d.active + d.completed === 0
                    ? 'No active or completed placements'
                    : 'Completed / (active + completed)',
                ],
                [
                  'AVERAGE FINAL GRADE',
                  d.averageGrade === null ? '-' : d.averageGrade.toFixed(1) + '%',
                  'Finalized final evaluations only',
                ],
              ].map(([label, value, help]) => (
                <article className="stat-card" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                  <small>{help}</small>
                </article>
              ))}
            </div>
            {d.ownProgress && (
              <section className="card">
                <div className="card-heading">
                  <h2>My placement progress</h2>
                  <Link to={'/placements/' + d.ownProgress.placementId}>
                    Open my placement &rarr;
                  </Link>
                </div>
                <p>
                  {(d.ownProgress.approvedMinutes / 60).toFixed(2)} approved /{' '}
                  {(d.ownProgress.requiredMinutes / 60).toFixed(2)} required hours &middot;{' '}
                  {(d.ownProgress.pendingMinutes / 60).toFixed(2)} pending
                </p>
                <progress
                  className="progress"
                  aria-label="My approved duty progress"
                  max="100"
                  value={d.ownProgress.hoursPercent}
                />
                <p>
                  {d.ownProgress.approvedRequirementCount} / {d.ownProgress.requiredCount} required
                  documents approved
                </p>
                {d.ownProgress.blockingReasons.length > 0 && (
                  <ul className="help-copy">
                    {d.ownProgress.blockingReasons.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                )}
              </section>
            )}
            <div className="dashboard-grid">
              <section className="card">
                <div className="card-heading">
                  <h2>Placement activity</h2>
                  <Link to="/placements">View roster &rarr;</Link>
                </div>
                <State empty={!d.placements.length}>
                  <DataTable
                    rows={d.placements}
                    columns={[
                      {
                        key: 'studentName',
                        label: 'Student',
                        render: (p) => (
                          <Link to={'/placements/' + p.id}>
                            <strong>{p.studentName}</strong>
                            <br />
                            <small className="muted mono">{p.studentNumber}</small>
                          </Link>
                        ),
                      },
                      { key: 'hostName', label: 'Host' },
                      {
                        key: 'status',
                        label: 'Status',
                        render: (p) => <StatusBadge status={p.status} />,
                      },
                    ]}
                    caption="Recent placements"
                  />
                </State>
              </section>
              <section className="card">
                <h2>Term at a glance</h2>
                {[
                  ['Pending', d.pending],
                  ['Active', d.active],
                  ['Completed', d.completed],
                ].map(([label, n]) => (
                  <div key={label} className="bar-row">
                    <span>{label}</span>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{ width: (d.total ? (n / d.total) * 100 : 0) + '%' }}
                      />
                    </div>
                    <strong>{n}</strong>
                  </div>
                ))}
                <p className="metric-note">
                  {d.total} total placements in the selected term. Closed and cancelled records
                  remain in the roster.
                </p>
                <hr />
                <p>
                  <strong>{d.pendingRequirementReviews}</strong> documents awaiting review
                </p>
                <p>
                  <strong>{d.pendingDutyReviews}</strong> duty logs awaiting review
                </p>
                {user.role !== 'student' && <Link to="/reports">Open reports &rarr;</Link>}
              </section>
            </div>
            {user.role === 'admin' && (
              <section className="card">
                <div className="card-heading">
                  <h2>Recent audit activity</h2>
                  <Link to="/audit-logs">View audit log &rarr;</Link>
                </div>
                <State
                  loading={audit.loading}
                  error={audit.error}
                  retry={audit.refresh}
                  empty={!audit.data?.length}
                >
                  <DataTable
                    rows={audit.data || []}
                    columns={[
                      { key: 'action', label: 'Action' },
                      { key: 'entityType', label: 'Resource' },
                      { key: 'entityId', label: 'Record' },
                      {
                        key: 'createdAt',
                        label: 'Time',
                        render: (r) =>
                          new Date(r.createdAt).toLocaleString('en-PH', {
                            timeZone: 'Asia/Manila',
                          }),
                      },
                    ]}
                  />
                </State>
              </section>
            )}
          </>
        )}
      </State>
    </>
  );
}
