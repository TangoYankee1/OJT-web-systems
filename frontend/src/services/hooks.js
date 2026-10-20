import { useState, useEffect, useCallback } from 'react';
import { api } from './api';
export function useResource(path) {
  const [state, setState] = useState({ data: null, meta: null, loading: true, error: null }),
    [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    let active = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    if (!path) {
      setState({ data: null, meta: null, loading: false, error: null });
      return;
    }
    api
      .get(path)
      .then((r) => {
        if (active) setState({ data: r.data, meta: r.meta, loading: false, error: null });
      })
      .catch((e) => {
        if (active) setState({ data: null, meta: null, loading: false, error: e.message });
      });
    return () => {
      active = false;
    };
  }, [path, version]);
  return { ...state, refresh };
}
export async function all(path) {
  let page = 1,
    records = [];
  while (true) {
    const r = await api.get(path + (path.includes('?') ? '&' : '?') + 'limit=100&page=' + page);
    records.push(...r.data);
    if (!r.meta || page >= r.meta.totalPages) break;
    page++;
  }
  return records;
}
export function queryString(params) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params))
    if (v !== '' && v !== undefined && v !== null) q.set(k, String(v));
  return q.size ? '?' + q.toString() : '';
}
