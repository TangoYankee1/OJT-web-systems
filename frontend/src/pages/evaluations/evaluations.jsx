import { useState } from 'react';
import { useAuth } from '../../contexts/auth-context';
import { api } from '../../services/api';
import { useResource } from '../../services/hooks';
import { PlacementWorkspace } from '../../components/placement-workspace';
import { FormField } from '../../components/form-field';
import { Modal } from '../../components/modal';
import { State } from '../../components/state';
import { DataTable } from '../../components/data-table';
import { StatusBadge } from '../../components/status-badge';
export default function Evaluations() {
  return (
    <PlacementWorkspace
      title="Evaluations"
      description="Draft scorecards, submit for review, and publish finalized results."
    >
      {(p) => <EvaluationPanel placement={p} />}
    </PlacementWorkspace>
  );
}
export function EvaluationPanel({ placement: p, onChanged }) {
  const { user } = useAuth(),
    r = useResource('/evaluations?placementId=' + p.id),
    [dialog, setDialog] = useState(null),
    [error, setError] = useState(null),
    [busy, setBusy] = useState(false);
  const author =
    p.deploymentType === 'company'
      ? user.role === 'supervisor' && user.profile.id === p.supervisorId
      : user.role === 'faculty' && user.profile.id === p.facultyId;
  const finalizer =
    user.role === 'admin' || (user.role === 'faculty' && user.profile.id === p.facultyId);
  async function create(type) {
    setBusy(true);
    try {
      const e = (await api.post('/evaluations', { placementId: p.id, type })).data;
      setDialog({ id: e.id, kind: 'edit' });
      r.refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card">
      <div className="card-heading">
        <div>
          <h2>Evaluation scorecards</h2>
          <p className="metric-note">
            Percentage = total score / total snapshotted maximum. Students see finalized results
            only.
          </p>
        </div>
        <button className="outline" onClick={r.refresh}>
          Refresh
        </button>
      </div>
      {error && (
        <p className="alert error" role="alert">
          {error}
        </p>
      )}
      {author && p.status === 'active' && (
        <div className="actions">
          {['midterm', 'final']
            .filter((type) => !r.data?.some((e) => e.type === type))
            .map((type) => (
              <button key={type} disabled={busy || r.loading} onClick={() => create(type)}>
                + Start {type}
              </button>
            ))}
        </div>
      )}
      <State loading={r.loading} error={r.error} retry={r.refresh} empty={!r.data?.length}>
        <DataTable
          rows={r.data || []}
          columns={[
            { key: 'type', label: 'Evaluation' },
            { key: 'rubricVersion', label: 'Rubric version' },
            { key: 'status', label: 'Status', render: (e) => <StatusBadge status={e.status} /> },
            {
              key: 'submittedAt',
              label: 'Submitted',
              render: (e) =>
                e.submittedAt
                  ? new Date(e.submittedAt).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })
                  : '-',
            },
            {
              key: 'actions',
              label: 'Actions',
              render: (e) => (
                <div className="actions">
                  <button
                    className="outline"
                    onClick={() =>
                      setDialog({
                        id: e.id,
                        kind: author && e.status === 'draft' ? 'edit' : 'view',
                      })
                    }
                  >
                    {author && e.status === 'draft' ? 'Score draft' : 'View scorecard'}
                  </button>
                  {author && e.status === 'draft' && p.status === 'active' && (
                    <button
                      className="teal"
                      onClick={() => setDialog({ id: e.id, kind: 'submit' })}
                    >
                      Submit
                    </button>
                  )}
                  {finalizer && e.status === 'submitted' && p.status === 'active' && (
                    <button
                      className="teal"
                      onClick={() => setDialog({ id: e.id, kind: 'finalize' })}
                    >
                      Finalize
                    </button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </State>
      {dialog && (
        <Scorecard
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
function Scorecard({ dialog: { id, kind }, onClose, onSaved }) {
  const r = useResource('/evaluations/' + id),
    [scores, setScores] = useState({}),
    [remarks, setRemarks] = useState(undefined),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(null);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      if (kind === 'submit') await api.post('/evaluations/' + id + '/submit');
      else if (kind === 'finalize') await api.patch('/evaluations/' + id + '/finalize', {});
      else {
        const body = {
          scores: r.data.scores.map((s) => {
            const v = scores[s.criterionId] ?? s.score;
            return { criterionId: s.criterionId, score: v === '' || v === null ? null : Number(v) };
          }),
          remarks: remarks ?? r.data.remarks,
        };
        await api.patch('/evaluations/' + id, body);
      }
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
        kind === 'edit'
          ? 'Score evaluation'
          : kind === 'finalize'
            ? 'Finalize evaluation'
            : kind === 'submit'
              ? 'Submit evaluation'
              : 'Evaluation scorecard'
      }
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <State loading={r.loading} error={r.error} retry={r.refresh}>
        {r.data && (
          <form onSubmit={submit}>
            <p>
              <StatusBadge status={r.data.status} /> <strong>{r.data.type}</strong> / rubric v
              {r.data.rubricVersion}
            </p>
            <p>
              Saved percentage: <strong>{r.data.percentage.toFixed(2)}%</strong>
            </p>
            {error && (
              <p className="alert error" role="alert">
                {error}
              </p>
            )}
            {r.data.scores.map((s) => (
              <div key={s.id}>
                {kind === 'edit' ? (
                  <FormField
                    name={'criterion-' + s.criterionId}
                    label={s.labelSnapshot + ' (maximum ' + s.maxScoreSnapshot + ')'}
                    type="number"
                    min={0}
                    max={s.maxScoreSnapshot}
                    step={0.01}
                    value={scores[s.criterionId] ?? s.score ?? ''}
                    onChange={(v) => setScores((x) => ({ ...x, [s.criterionId]: v }))}
                  />
                ) : (
                  <p>
                    {s.labelSnapshot}:{' '}
                    <strong>
                      {s.score ?? 'Missing'} / {s.maxScoreSnapshot}
                    </strong>
                  </p>
                )}
              </div>
            ))}
            {kind === 'edit' ? (
              <FormField
                name="remarks"
                label="Evaluation remarks"
                type="textarea"
                maxLength={4000}
                value={remarks ?? r.data.remarks ?? ''}
                onChange={setRemarks}
              />
            ) : (
              r.data.remarks && <p>{r.data.remarks}</p>
            )}
            {kind === 'finalize' && (
              <p className="alert">
                Finalization publishes these results and makes the scorecard immutable.
              </p>
            )}
            {kind === 'submit' && (
              <p>Every criterion must have a valid score. Submitted scores cannot be edited.</p>
            )}
            <div className="actions">
              {kind !== 'view' && (
                <button disabled={busy}>
                  {busy ? 'Saving...' : kind === 'edit' ? 'Save draft' : 'Confirm ' + kind}
                </button>
              )}
              <button className="outline" type="button" disabled={busy} onClick={onClose}>
                Close
              </button>
            </div>
          </form>
        )}
      </State>
    </Modal>
  );
}
