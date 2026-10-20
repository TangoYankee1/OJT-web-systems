import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/auth-context';
import { FormField } from '../../components/form-field';
import { State } from '../../components/state';
export default function Login() {
  const { user, loading, login } = useAuth();
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(null);
  if (loading) return <State loading />;
  if (user)
    return (
      <Navigate
        to={user.mustChangePassword ? '/change-password' : '/' + user.role + '/dashboard'}
        replace
      />
    );
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-screen">
      <section className="auth-brand">
        <div className="brand-mark">P</div>
        <span className="eyebrow">PRACTICUM</span>
        <h1>
          Every placement.
          <br />
          Every milestone.
        </h1>
        <p>
          A shared workspace for students, faculty and industry partners to keep practical learning
          on track.
        </p>
        <div className="brand-rule" />
        <small>OJT MONITORING SYSTEM</small>
      </section>
      <section className="auth-panel">
        <form onSubmit={submit}>
          <span className="eyebrow">YOUR INTERNSHIP WORKSPACE</span>
          <h1>Welcome back</h1>
          <p className="muted">Sign in with your institution-issued account.</p>
          {error && (
            <p className="alert error" role="alert">
              {error}
            </p>
          )}
          <FormField
            label="Email address"
            name="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={setEmail}
            required
          />
          <FormField
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
            required
          />
          <button className="wide" disabled={busy}>
            {busy ? 'Signing in...' : 'Sign in'}
          </button>
          <p className="help-copy">
            Need access or a password reset? Contact your OJT administrator.
          </p>
        </form>
        <small className="muted">Learning through experience. Progress with accountability.</small>
      </section>
    </main>
  );
}
