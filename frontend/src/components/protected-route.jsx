import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context';
import { State } from './state';
export function ProtectedRoute({ roles }) {
  const { user, loading, error, load } = useAuth();
  if (loading) return <State loading />;
  if (error) return <State error={error} retry={load} />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  if (roles && !roles.includes(user.role))
    return <State error="This page is not available to your role." />;
  return <Outlet />;
}
