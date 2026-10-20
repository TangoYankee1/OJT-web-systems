import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useResource } from '../../services/hooks';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/auth-context';
import { State } from '../../components/state';
import { StatusBadge } from '../../components/status-badge';
import { Modal } from '../../components/modal';
import { FormField } from '../../components/form-field';
import { RequirementPanel } from '../requirements/requirements';
import { TimePanel } from '../time/time';
import { EvaluationPanel } from '../evaluations/evaluations';
export default function PlacementDetail() {
  const { id } = useParams(),
    { user } = useAuth(),
    r = useResource('/placements/' + id),
    progress = useResource('/placements/' + id + '/progress'),
    [tab, setTab] = useState('requirements'),
    [action, setAction] = useState(null);
  function refresh() {
    r.refresh();
    progress.refresh();
  }
  const p = r.data,
    canReview = user.role === 'admin' || user.role === 'faculty';
  return (
    <State loading={r.loading} error={r.error} retry={r.refresh}>
      {p && (
        <>
          <div className="page-heading">
            <div>
              <span className="eyebrow">PLACEMENT #{p.id}</span>
              <h1>{p.studentName}</h1>
              <p>
                {p.deploymentType === 'company'
                  ? 'Company-hosted placement'
                  : 'School-hosted placement'}{' '}
                &middot; {p.startDate} to {p.endDate}
              </p>
            </div>
            <div className="actions">
              <Link className="button outline" to="/placements">
                Back to roster
              </Link>
              {user.role === 'admin' && p.status === 'pending' && (
                <Link className="button outline" to={'/placements/' + p.id + '/edit'}>
                  Edit assignment
                </Link>
              )}
            </div>
          </div>
          <section className="card">
            <div className="card-heading">
              <h2>Placement overview</h2>
              <StatusBadge status={p.status} />
            </div>
            <dl className="detail-grid">
              <div>
                <dt>Required hours</dt>
                <dd>{(p.requiredMinutes / 60).toFixed(2)}</dd>
              </div>
              <div>
                <dt>Academic term</dt>
                <dd>#{p.academicTermId}</dd>
              </div>
              <div>
                <dt>Deployment type</dt>
                <dd>{p.deploymentType}</dd>
              </div>
            </dl>
            {p.statusRemarks && <p className="help-copy">Status remarks: {p.statusRemarks}</p>}
            <State loading={progress.loading} error={progress.error} retry={progress.refresh}>
              {progress.data && (
                <>
                  <p>
                    <strong>{(progress.data.approvedMinutes / 60).toFixed(2)}</strong> approved
                    hours / {(p.requiredMinutes / 60).toFixed(2)} required &middot;{' '}
                    {(progress.data.pendingMinutes / 60).toFixed(2)} pending hours
                  </p>
                  <progress
                    className="progress"
                    aria-label="Approved duty progress"
                    max="100"
                    value={progress.data.hoursPercent}
                  />
                  {p.status !== 'completed' && progress.data.blockingReasons.length > 0 && (
                    <details>
                      <summary>Completion prerequisites</summary>
                      <ul>
                        {progress.data.blockingReasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </>
              )}
            </State>
            <div className="actions">
              {p.status === 'pending' && canReview && (
                <>
                  <button className="teal" onClick={() => setAction('approved')}>
                    Approve placement
                  </button>
                  <button className="danger" onClick={() => setAction('rejected')}>
                    Reject placement
                  </button>
                </>
              )}
              {p.status === 'approved' && user.role === 'admin' && (
                <button className="teal" onClick={() => setAction('active')}>
                  Activate placement
                </button>
              )}
              {p.status === 'active' && canReview && (
                <button className="teal" onClick={() => setAction('completed')}>
                  Complete placement
                </button>
              )}
              {['pending', 'approved', 'active'].includes(p.status) && user.role === 'admin' && (
                <button className="danger" onClick={() => setAction('cancelled')}>
                  Cancel placement
                </button>
              )}
            </div>
          </section>
          <div className="tabs" role="group" aria-label="Placement sections">
            {[
              ['requirements', 'Requirements'],
              ['duty', 'Schedules & duty'],
              ['evaluations', 'Evaluations'],
            ].map(([value, label]) => (
              <button
                key={value}
                className={tab === value ? 'active' : ''}
                onClick={() => setTab(value)}
              >
                {label}
              </button>
            ))}
          </div>
          {tab === 'requirements' ? (
            <RequirementPanel placement={p} onChanged={progress.refresh} />
          ) : tab === 'duty' ? (
            <TimePanel placement={p} onChanged={progress.refresh} />
          ) : (
            <EvaluationPanel placement={p} onChanged={progress.refresh} />
          )}{' '}
          {action && (
            <StatusDialog
              placement={p}
              status={action}
              onClose={() => setAction(null)}
              onSaved={() => {
                setAction(null);
                refresh();
              }}
            />
          )}
        </>
      )}
    </State>
  );
}
function StatusDialog({ placement, status, onClose, onSaved }) {
  const [remarks, setRemarks] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(null);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.patch('/placements/' + placement.id + '/status', {
        status,
        ...(remarks ? { remarks } : {}),
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
      title={'Set placement to ' + status}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form onSubmit={submit}>
        <p>
          Confirm this transition for {placement.studentName}. The system will recheck prerequisites
          before saving.
        </p>
        {error && (
          <div className="alert error" role="alert">
            {error.message}
            {error.fields?.blockingReasons && (
              <ul>
                {error.fields.blockingReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        <FormField
          name="remarks"
          label="Remarks"
          type="textarea"
          maxLength={4000}
          required={['rejected', 'cancelled'].includes(status)}
          value={remarks}
          onChange={setRemarks}
        />
        <div className="actions">
          <button disabled={busy}>{busy ? 'Saving...' : 'Confirm transition'}</button>
          <button type="button" className="outline" disabled={busy} onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
