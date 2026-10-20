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
const localInput = (value) =>
  new Date(new Date(value).getTime() + 28800000).toISOString().slice(0, 16);
const display = (value) =>
  new Date(value).toLocaleTimeString('en-PH', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
  });
export default function TimePage() {
  return (
    <PlacementWorkspace
      title="Schedules & duty"
      description="Plan work separately from actual duty. Only approved duty contributes to completed hours."
    >
      {(p) => <TimePanel placement={p} />}
    </PlacementWorkspace>
  );
}
export function TimePanel({ placement: p, onChanged }) {
  const { user } = useAuth(),
    [tab, setTab] = useState('duty'),
    [dialog, setDialog] = useState(null);
  const logs = useResource('/placements/' + p.id + '/duty-logs'),
    schedules = useResource('/placements/' + p.id + '/schedules'),
    progress = useResource('/placements/' + p.id + '/progress');
  const reviewer =
      user.role === 'admin' ||
      (p.deploymentType === 'company'
        ? user.role === 'supervisor' && p.supervisorId === user.profile.id
        : user.role === 'faculty' && p.facultyId === user.profile.id),
    student = user.role === 'student' && p.studentId === user.profile.id,
    mutable = ['pending', 'approved', 'active'].includes(p.status);
  function refresh() {
    logs.refresh();
    schedules.refresh();
    progress.refresh();
    onChanged?.();
  }
  return (
    <section className="card">
      <div className="card-heading">
        <h2>Attendance & planning</h2>
        <button className="outline" onClick={refresh}>
          Refresh
        </button>
      </div>
      {progress.data && (
        <div className="stats-grid">
          <div className="stat-card">
            <span>APPROVED HOURS</span>
            <strong>{(progress.data.approvedMinutes / 60).toFixed(2)}</strong>
            <small>Reviewed actual duty</small>
          </div>
          <div className="stat-card">
            <span>PENDING HOURS</span>
            <strong>{(progress.data.pendingMinutes / 60).toFixed(2)}</strong>
            <small>Submitted, awaiting review</small>
          </div>
        </div>
      )}
      <div className="tabs" role="group" aria-label="Attendance views">
        <button className={tab === 'duty' ? 'active' : ''} onClick={() => setTab('duty')}>
          Actual duty logs
        </button>
        <button className={tab === 'schedules' ? 'active' : ''} onClick={() => setTab('schedules')}>
          Planned weekly schedule
        </button>
      </div>
      {tab === 'duty' ? (
        <>
          <div className="card-heading">
            <p className="metric-note">
              All times use Asia/Manila. Overlapping and overnight logs are rejected.
            </p>
            {student && p.status === 'active' && (
              <button className="teal" onClick={() => setDialog({ kind: 'log', row: {} })}>
                + Log duty
              </button>
            )}
          </div>
          <State
            loading={logs.loading}
            error={logs.error}
            retry={logs.refresh}
            empty={!logs.data?.length}
          >
            <DataTable
              rows={logs.data || []}
              columns={[
                { key: 'workDate', label: 'Work date' },
                { key: 'clockIn', label: 'Clock in', render: (r) => display(r.clockIn) },
                { key: 'clockOut', label: 'Clock out', render: (r) => display(r.clockOut) },
                { key: 'breakMinutes', label: 'Break (min)' },
                { key: 'creditedMinutes', label: 'Minutes' },
                {
                  key: 'status',
                  label: 'Status',
                  render: (r) => <StatusBadge status={r.status} />,
                },
                { key: 'remarks', label: 'Review remarks' },
                {
                  key: 'actions',
                  label: 'Actions',
                  render: (r) => (
                    <div className="actions">
                      {student &&
                        p.status === 'active' &&
                        ['draft', 'rejected'].includes(r.status) && (
                          <>
                            <button
                              className="outline"
                              onClick={() => setDialog({ kind: 'log', row: r })}
                            >
                              Edit
                            </button>
                            <button
                              className="teal"
                              onClick={() => setDialog({ kind: 'submit', row: r })}
                            >
                              Submit
                            </button>
                            <button
                              className="danger"
                              onClick={() => setDialog({ kind: 'delete', row: r })}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      {reviewer && p.status === 'active' && r.status === 'submitted' && (
                        <>
                          <button
                            className="teal"
                            onClick={() => setDialog({ kind: 'approved', row: r })}
                          >
                            Approve
                          </button>
                          <button
                            className="danger"
                            onClick={() => setDialog({ kind: 'rejected', row: r })}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {reviewer && p.status === 'active' && r.status === 'approved' && (
                        <button
                          className="outline"
                          onClick={() => setDialog({ kind: 'reopen', row: r })}
                        >
                          Reopen
                        </button>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </State>
        </>
      ) : (
        <>
          <div className="card-heading">
            <p className="metric-note">
              Planned schedules award no duty credit. Effective dates are shown on each entry.
            </p>
            {reviewer && mutable && (
              <button onClick={() => setDialog({ kind: 'schedule', row: {} })}>
                + Plan schedule
              </button>
            )}
          </div>
          <State
            loading={schedules.loading}
            error={schedules.error}
            retry={schedules.refresh}
            empty={!schedules.data?.length}
          >
            <div className="table-scroll">
              <div className="calendar-grid">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
                  (day, i) => (
                    <div className="calendar-day" key={day}>
                      <strong>{day}</strong>
                      {(schedules.data || [])
                        .filter((s) => s.weekday === i + 1)
                        .map((s) => (
                          <div className="calendar-event" key={s.id}>
                            <strong>
                              {s.startTime.slice(0, 5)} - {s.endTime.slice(0, 5)}
                            </strong>
                            <p>
                              {s.breakMinutes} min break
                              <br />
                              {s.effectiveFrom} to {s.effectiveTo}
                            </p>
                            {reviewer && mutable && (
                              <div className="actions">
                                <button
                                  className="outline"
                                  onClick={() => setDialog({ kind: 'schedule', row: s })}
                                >
                                  Edit
                                </button>
                                <button
                                  className="outline"
                                  onClick={() => setDialog({ kind: 'deleteSchedule', row: s })}
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  ),
                )}
              </div>
            </div>
          </State>
        </>
      )}
      {dialog && (
        <DutyDialog
          dialog={dialog}
          placement={p}
          admin={user.role === 'admin'}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            refresh();
          }}
        />
      )}
    </section>
  );
}
function DutyDialog({ dialog: { kind, row }, placement: p, admin, onClose, onSaved }) {
  const [v, setV] = useState(
      kind === 'schedule'
        ? {
            weekday: row.weekday || 1,
            startTime: row.startTime?.slice(0, 5) || '08:00',
            endTime: row.endTime?.slice(0, 5) || '17:00',
            breakMinutes: row.breakMinutes ?? 60,
            effectiveFrom: row.effectiveFrom || p.startDate,
            effectiveTo: row.effectiveTo || p.endDate,
          }
        : {
            clockIn: row.clockIn ? localInput(row.clockIn) : '',
            clockOut: row.clockOut ? localInput(row.clockOut) : '',
            breakMinutes: row.breakMinutes ?? 0,
          },
    ),
    [remarks, setRemarks] = useState(''),
    [error, setError] = useState(null),
    [busy, setBusy] = useState(false);
  const change = (k, value) => setV((s) => ({ ...s, [k]: value }));
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      if (kind === 'log') {
        const body = {
          clockIn: v.clockIn + ':00+08:00',
          clockOut: v.clockOut + ':00+08:00',
          breakMinutes: Number(v.breakMinutes),
        };
        if (row.id) await api.patch('/duty-logs/' + row.id, body);
        else await api.post('/placements/' + p.id + '/duty-logs', body);
      } else if (kind === 'schedule') {
        const body = { ...v, weekday: Number(v.weekday), breakMinutes: Number(v.breakMinutes) };
        if (row.id) await api.patch('/schedules/' + row.id, body);
        else await api.post('/placements/' + p.id + '/schedules', body);
      } else if (kind === 'deleteSchedule') await api.delete('/schedules/' + row.id);
      else if (kind === 'delete') await api.delete('/duty-logs/' + row.id);
      else if (kind === 'submit') await api.post('/duty-logs/' + row.id + '/submit');
      else if (kind === 'reopen') await api.post('/duty-logs/' + row.id + '/reopen', { remarks });
      else
        await api.patch('/duty-logs/' + row.id + '/review', {
          decision: kind,
          ...(remarks ? { remarks } : {}),
        });
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const title = {
    log: row.id ? 'Edit duty log' : 'Log actual duty',
    schedule: row.id ? 'Edit planned schedule' : 'Plan a schedule',
    submit: 'Submit duty for review',
    approved: 'Approve duty',
    rejected: 'Reject duty',
    reopen: 'Reopen approved duty',
    delete: 'Delete duty log',
    deleteSchedule: 'Delete planned schedule',
  }[kind];
  return (
    <Modal
      title={title}
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
        {kind === 'log' ? (
          <>
            <FormField
              name="clockIn"
              label="Clock in (Asia/Manila)"
              type="datetime-local"
              step={60}
              required
              value={v.clockIn}
              onChange={(x) => change('clockIn', x)}
            />
            <FormField
              name="clockOut"
              label="Clock out (Asia/Manila)"
              type="datetime-local"
              step={60}
              required
              value={v.clockOut}
              onChange={(x) => change('clockOut', x)}
            />
            <FormField
              name="breakMinutes"
              label="Break minutes"
              type="number"
              min={0}
              max={1439}
              required
              value={v.breakMinutes}
              onChange={(x) => change('breakMinutes', x)}
            />
          </>
        ) : kind === 'schedule' ? (
          <div className="form-grid">
            <FormField
              name="weekday"
              label="Weekday"
              type="select"
              required
              value={v.weekday}
              onChange={(x) => change('weekday', x)}
              options={[
                'Monday',
                'Tuesday',
                'Wednesday',
                'Thursday',
                'Friday',
                'Saturday',
                'Sunday',
              ].map((label, i) => ({ value: i + 1, label }))}
            />
            {[
              ['startTime', 'Start time', 'time'],
              ['endTime', 'End time', 'time'],
              ['breakMinutes', 'Break minutes', 'number'],
              ['effectiveFrom', 'Effective from', 'date'],
              ['effectiveTo', 'Effective to', 'date'],
            ].map(([name, label, type]) => (
              <FormField
                key={name}
                name={name}
                label={label}
                type={type}
                min={type === 'number' ? 0 : undefined}
                required
                value={v[name]}
                onChange={(x) => change(name, x)}
              />
            ))}
          </div>
        ) : (
          <p>
            {kind === 'reopen'
              ? 'This removes approved credit until the log is reviewed again.'
              : kind.startsWith('delete')
                ? 'This removes the selected record. The audit event is retained.'
                : 'Confirm this duty-log action.'}
          </p>
        )}
        {['approved', 'rejected', 'reopen'].includes(kind) && (
          <FormField
            name="remarks"
            label="Review reason"
            type="textarea"
            maxLength={4000}
            required={admin || kind !== 'approved'}
            value={remarks}
            onChange={setRemarks}
          />
        )}
        <div className="actions">
          <button disabled={busy}>
            {busy ? 'Saving...' : kind === 'log' || kind === 'schedule' ? 'Save' : 'Confirm'}
          </button>
          <button className="outline" type="button" disabled={busy} onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
