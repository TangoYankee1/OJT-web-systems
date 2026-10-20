import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/auth-context';
import { api } from '../../services/api';
import { FormField } from '../../components/form-field';
import { State } from '../../components/state';
export default function ChangePassword() {
  const { user, loading, load, logout } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState(''),
    [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(null);
  if (loading) return <State loading />;
  if (!user) return <Navigate to="/login" replace />;
  async function submit(e) {
    e.preventDefault();
    if (password !== confirm) {
      setError('New passwords must match');
      return;
    }
    setBusy(true);
    try {
      await api.post('/auth/change-password', { currentPassword: current, newPassword: password });
      api.clearCsrf();
      await load();
      navigate('/login', { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="center-screen">
      <form className="card password-form" onSubmit={submit}>
        <div className="brand-mark">P</div>
        <h1>Set your password</h1>
        <p className="muted">Use 12 to 72 UTF-8 bytes. After saving, sign in again.</p>
        {error && (
          <p className="alert error" role="alert">
            {error}
          </p>
        )}
        <FormField
          name="currentPassword"
          label="Current password"
          type="password"
          autoComplete="current-password"
          required
          value={current}
          onChange={setCurrent}
        />
        <FormField
          name="newPassword"
          label="New password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={setPassword}
        />
        <FormField
          name="confirmPassword"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={setConfirm}
        />
        <button disabled={busy}>{busy ? 'Saving...' : 'Save password'}</button>
        <button type="button" className="outline" disabled={busy} onClick={logout}>
          Sign out
        </button>
      </form>
    </main>
  );
}
