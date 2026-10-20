import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/auth-context';
import { useResource, queryString } from '../../services/hooks';
import { FormField } from '../../components/form-field';
import { DataTable } from '../../components/data-table';
import { StatusBadge } from '../../components/status-badge';
import { State } from '../../components/state';
export default function Placements() {
  const { user } = useAuth(),
    [params, setParams] = useSearchParams(),
    result = useResource('/placements?' + params.toString()),
    terms = useResource('/academic-terms?limit=100');
  function filter(k, v) {
    setParams((p) => {
      if (v) p.set(k, v);
      else p.delete(k);
      p.delete('page');
      return p;
    });
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">FIELD LEARNING</span>
          <h1>Placements</h1>
          <p>Track assignments from application through completion.</p>
        </div>
        {user.role === 'admin' && (
          <Link className="button" to="/placements/new">
            + Assign placement
          </Link>
        )}
      </div>
      <section className="card">
        <form className="filter-bar" onSubmit={(e) => e.preventDefault()}>
          <FormField
            name="search"
            label="Search roster"
            type="search"
            value={params.get('search') || ''}
            onChange={(v) => filter('search', v)}
          />
          <FormField
            name="status"
            label="Status"
            type="select"
            value={params.get('status') || ''}
            onChange={(v) => filter('status', v)}
            options={['pending', 'approved', 'active', 'completed', 'rejected', 'cancelled'].map(
              (value) => ({ value, label: value }),
            )}
          />
          <FormField
            name="academicTermId"
            label="Academic term"
            type="select"
            value={params.get('academicTermId') || ''}
            onChange={(v) => filter('academicTermId', v)}
            options={(terms.data || []).map((t) => ({
              value: t.id,
              label: t.academicYear + ' / ' + t.semester,
            }))}
          />
          <button type="button" className="outline" onClick={result.refresh}>
            Refresh
          </button>
        </form>
        <State
          loading={result.loading}
          error={result.error}
          retry={result.refresh}
          empty={!result.data?.length}
        >
          <DataTable
            rows={result.data || []}
            columns={[
              {
                key: 'studentName',
                label: 'Student',
                render: (p) => (
                  <Link to={'/placements/' + p.id}>
                    <strong>{p.studentName}</strong>
                    <br />
                    <small className="mono muted">{p.studentNumber}</small>
                  </Link>
                ),
              },
              { key: 'hostName', label: 'Host' },
              { key: 'facultyName', label: 'Faculty' },
              { key: 'startDate', label: 'Start date' },
              {
                key: 'requiredMinutes',
                label: 'Required hours',
                render: (p) => (p.requiredMinutes / 60).toFixed(2),
              },
              { key: 'status', label: 'Status', render: (p) => <StatusBadge status={p.status} /> },
              {
                key: 'id',
                label: 'Action',
                render: (p) => <Link to={'/placements/' + p.id}>Open placement &rarr;</Link>,
              },
            ]}
            meta={result.meta}
            onPage={(n) =>
              setParams((p) => {
                p.set('page', n);
                return p;
              })
            }
          />
        </State>
      </section>
    </>
  );
}
