import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { all } from '../services/hooks';
import { api } from '../services/api';
import { FormField } from './form-field';
import { State } from './state';
export function PlacementWorkspace({ title, description, children }) {
  const [params, setParams] = useSearchParams(),
    [placements, setPlacements] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(null),
    [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    all('/placements')
      .then((p) => {
        if (active) {
          setPlacements(p);
          setError(null);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [version]);
  const id =
    Number(params.get('placementId')) ||
    (placements.find((p) => ['pending', 'approved', 'active'].includes(p.status)) || placements[0])
      ?.id;
  const p = placements.find((x) => x.id === id);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">PLACEMENT WORKSPACE</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>
      <State
        loading={loading}
        error={error}
        retry={() => setVersion((v) => v + 1)}
        empty={!placements.length}
      >
        {placements.length > 0 && (
          <>
            <section className="card">
              <FormField
                name="placementId"
                label="Placement"
                type="select"
                value={id || ''}
                onChange={(v) => setParams({ placementId: v })}
                options={placements.map((p) => ({
                  value: p.id,
                  label:
                    p.studentName + ' / ' + (p.hostName || p.deploymentType) + ' / ' + p.status,
                }))}
              />
            </section>
            {p ? children(p) : <State error="The selected placement is not available." />}
          </>
        )}
      </State>
    </>
  );
}
