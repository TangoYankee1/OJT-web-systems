import { useState } from 'react';
import { useAuth } from '../../contexts/auth-context';
import { api } from '../../services/api';
import { useResource } from '../../services/hooks';
import { PlacementWorkspace } from '../../components/placement-workspace';
import { State } from '../../components/state';
import { StatusBadge } from '../../components/status-badge';
import { Modal } from '../../components/modal';
import { FormField } from '../../components/form-field';
export default function Requirements({ review = false }) {
  return (
    <PlacementWorkspace
      title={review ? 'Document reviews' : 'My requirements'}
      description={
        review
          ? 'Review submitted documents within your assigned placements.'
          : 'Upload requirements and track feedback from your faculty reviewer.'
      }
    >
      {(p) => <RequirementPanel placement={p} review={review} />}
    </PlacementWorkspace>
  );
}
export function RequirementPanel({ placement: p, review = false, onChanged }) {
  const { user } = useAuth(),
    r = useResource('/placements/' + p.id + '/requirements'),
    [dialog, setDialog] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(null),
    [submittedOnly, setSubmittedOnly] = useState(review);
  const mutable = ['pending', 'approved', 'active'].includes(p.status),
    canReview = user.role === 'admin' || user.role === 'faculty';
  async function approve(item) {
    setBusy(true);
    try {
      await api.patch('/placement-requirements/' + item.id + '/review', { decision: 'approved' });
      r.refresh();
      onChanged?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const data = (r.data || []).filter((item) => !submittedOnly || item.status === 'submitted');
  return (
    <section className="card">
      <div className="card-heading">
        <div>
          <h2>Placement requirements</h2>
          <p className="metric-note">Private PDF, JPEG or PNG files, up to 10 MiB each.</p>
        </div>
        <button className="outline" onClick={r.refresh}>
          Refresh
        </button>
      </div>
      {canReview && (
        <FormField
          name="submittedOnly"
          label="Show submitted documents only"
          type="checkbox"
          value={submittedOnly}
          onChange={setSubmittedOnly}
        />
      )}{' '}
      {error && (
        <p className="alert error" role="alert">
          {error}
        </p>
      )}
      <State loading={r.loading} error={r.error} retry={r.refresh} empty={data.length === 0}>
        {data.map((item) => (
          <article className="requirement-card" key={item.id}>
            <div>
              <h3>
                {item.titleSnapshot} {item.isRequiredSnapshot && <small>Required</small>}
              </h3>
              <small>{item.stageSnapshot.replaceAll('_', ' ')}</small>
              <p>
                <StatusBadge status={item.status} />
              </p>
              {item.remarks && <p className="help-copy">Review: {item.remarks}</p>}
              {item.uploads?.length > 0 && (
                <ul className="version-list">
                  {item.uploads.map((file) => (
                    <li key={file.id}>
                      <a href={api.fileUrl(file.id)}>
                        Version {file.version}: {file.originalName}
                      </a>{' '}
                      <small>{(file.sizeBytes / 1024).toFixed(1)} KB</small>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="actions">
              {user.role === 'student' &&
                mutable &&
                ['pending', 'rejected'].includes(item.status) && (
                  <button className="teal" onClick={() => setDialog({ kind: 'upload', item })}>
                    Upload file
                  </button>
                )}
              {canReview && mutable && item.status === 'submitted' && (
                <>
                  <button className="teal" disabled={busy} onClick={() => approve(item)}>
                    Approve
                  </button>
                  <button
                    className="danger"
                    disabled={busy}
                    onClick={() => setDialog({ kind: 'reject', item })}
                  >
                    Reject
                  </button>
                </>
              )}
              {canReview && mutable && item.status === 'approved' && (
                <button className="outline" onClick={() => setDialog({ kind: 'reopen', item })}>
                  Reopen
                </button>
              )}
            </div>
          </article>
        ))}
      </State>
      {dialog && (
        <RequirementDialog
          dialog={dialog}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            r.refresh();
            onChanged?.();
          }}
        />
      )}
    </section>
  );
}
function RequirementDialog({ dialog: { kind, item }, onClose, onSaved }) {
  const [file, setFile] = useState(null),
    [remarks, setRemarks] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(null);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      if (kind === 'upload') {
        const body = new FormData();
        body.append('file', file);
        await api.post('/placement-requirements/' + item.id + '/uploads', body);
      } else if (kind === 'reopen')
        await api.post('/placement-requirements/' + item.id + '/reopen', { remarks });
      else
        await api.patch('/placement-requirements/' + item.id + '/review', {
          decision: 'rejected',
          remarks,
        });
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={
        (kind === 'upload' ? 'Upload: ' : kind === 'reject' ? 'Reject: ' : 'Reopen: ') +
        item.titleSnapshot
      }
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form onSubmit={submit}>
        {error && (
          <p className="alert error" role="alert">
            {error}
          </p>
        )}
        {kind === 'upload' ? (
          <label className="field">
            Select a file
            <input
              aria-label="Select a file"
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              required
              onChange={(e) => setFile(e.target.files[0])}
            />
            <small>Each new version is retained in the submission history.</small>
          </label>
        ) : (
          <FormField
            name="remarks"
            label="Reason"
            type="textarea"
            required
            maxLength={4000}
            value={remarks}
            onChange={setRemarks}
          />
        )}
        <div className="actions">
          <button disabled={busy}>
            {busy ? 'Submitting...' : kind === 'upload' ? 'Submit file' : 'Confirm ' + kind}
          </button>
          <button type="button" className="outline" onClick={onClose} disabled={busy}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
