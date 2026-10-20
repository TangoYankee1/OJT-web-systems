import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useResource, all } from '../../services/hooks';
import { api } from '../../services/api';
import { FormField } from '../../components/form-field';
import { DataTable } from '../../components/data-table';
import { StatusBadge } from '../../components/status-badge';
import { State } from '../../components/state';
const columns = [
  { key: 'studentNumber', label: 'Student number' },
  { key: 'studentName', label: 'Student' },
  { key: 'hostName', label: 'Host' },
  { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  {
    key: 'approvedMinutes',
    label: 'Approved hours',
    render: (r) => (r.approvedMinutes / 60).toFixed(2),
  },
  {
    key: 'pendingMinutes',
    label: 'Pending hours',
    render: (r) => (r.pendingMinutes / 60).toFixed(2),
  },
  {
    key: 'requiredMinutes',
    label: 'Required hours',
    render: (r) => (r.requiredMinutes / 60).toFixed(2),
  },
];
export default function Reports() {
  const [params, setParams] = useSearchParams(),
    r = useResource('/reports/placements?' + params.toString()),
    terms = useResource('/academic-terms?limit=100'),
    [printRows, setPrintRows] = useState([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(null);
  function filter(key, value) {
    setParams((p) => {
      if (value) p.set(key, value);
      else p.delete(key);
      p.delete('page');
      return p;
    });
  }
  async function print() {
    setBusy(true);
    try {
      const query = new URLSearchParams(params);
      query.delete('page');
      query.delete('limit');
      const rows = await all('/reports/placements?' + query.toString());
      setPrintRows(rows);
      requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
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
          <span className="eyebrow">ANALYTICS & RECORDS</span>
          <h1>Placement reports</h1>
          <p>Assignment-scoped records with approved and pending hours separated.</p>
        </div>
        <div className="actions">
          <a className="button outline" href={api.csvUrl('?' + params.toString())}>
            Export CSV
          </a>
          <button disabled={busy} onClick={print}>
            {busy ? 'Preparing...' : 'Print / Save PDF'}
          </button>
        </div>
      </div>
      {error && (
        <p className="alert error" role="alert">
          {error}
        </p>
      )}
      <section className="card no-print">
        <form className="filter-bar" onSubmit={(e) => e.preventDefault()}>
          <FormField
            label="Search"
            name="search"
            type="search"
            value={params.get('search') || ''}
            onChange={(v) => filter('search', v)}
          />
          <FormField
            label="Academic term"
            name="academicTermId"
            type="select"
            value={params.get('academicTermId') || ''}
            onChange={(v) => filter('academicTermId', v)}
            options={(terms.data || []).map((t) => ({
              value: t.id,
              label: t.academicYear + ' / ' + t.semester,
            }))}
          />
          <FormField
            label="Status"
            name="status"
            type="select"
            value={params.get('status') || ''}
            onChange={(v) => filter('status', v)}
            options={['pending', 'approved', 'active', 'completed', 'rejected', 'cancelled'].map(
              (value) => ({ value, label: value }),
            )}
          />
        </form>
        <p className="metric-note">
          CSV includes all records matching these filters. The print report also includes all
          matching pages.
        </p>
        <State loading={r.loading} error={r.error} retry={r.refresh} empty={!r.data?.length}>
          <DataTable
            rows={r.data || []}
            columns={columns}
            meta={r.meta}
            onPage={(n) =>
              setParams((p) => {
                p.set('page', n);
                return p;
              })
            }
          />
        </State>
      </section>
      <section className="print-only">
        <p>Filters: {params.toString() || 'All permitted placements'}</p>
        <p>Generated {new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</p>
        <DataTable rows={printRows} columns={columns} />
      </section>
    </>
  );
}
