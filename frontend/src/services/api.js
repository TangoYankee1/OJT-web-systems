const base = import.meta.env.VITE_API_BASE_URL || '/api';
let csrfToken = null,
  csrfPromise;
export class ApiError extends Error {
  constructor(status, error) {
    super(error?.message || 'The request failed');
    this.status = status;
    this.code = error?.code;
    this.fields = error?.fields;
  }
}
async function csrf() {
  if (!csrfPromise)
    csrfPromise = fetch(base + '/auth/csrf', { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok)
          throw new ApiError(r.status, { message: 'Could not establish a secure session' });
        csrfToken = (await r.json()).data.csrfToken;
        return csrfToken;
      })
      .finally(() => (csrfPromise = null));
  return csrfPromise;
}
async function request(method, path, body) {
  const mutation = !['GET', 'HEAD'].includes(method);
  if (mutation && !csrfToken) await csrf();
  const headers = {};
  if (mutation) headers['X-CSRF-Token'] = csrfToken;
  if (body !== undefined && !(body instanceof FormData))
    headers['Content-Type'] = 'application/json';
  let response;
  try {
    response = await fetch(base + path, {
      method,
      credentials: 'include',
      headers,
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, { message: 'Cannot reach the server. Check the connection and retry.' });
  }
  if (response.status === 204) {
    if (mutation) window.dispatchEvent(new Event('data:changed'));
    return null;
  }
  const result = await response
    .json()
    .catch(() => ({ error: { message: 'Unexpected server response' } }));
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event('auth:expired'));
    if (result.error?.code === 'PASSWORD_CHANGE_REQUIRED')
      window.dispatchEvent(new Event('auth:password-required'));
    throw new ApiError(response.status, result.error);
  }
  if (mutation) window.dispatchEvent(new Event('data:changed'));
  return result;
}
export const api = {
  get: (p) => request('GET', p),
  post: (p, b = {}) => request('POST', p, b),
  patch: (p, b) => request('PATCH', p, b),
  delete: (p, b = {}) => request('DELETE', p, b),
  csrf,
  clearCsrf: () => (csrfToken = null),
  fileUrl: (id) => base + '/files/' + id + '/download',
  csvUrl: (query) => base + '/reports/placements.csv' + query,
};
