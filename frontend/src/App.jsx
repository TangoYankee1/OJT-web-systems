import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuth } from './contexts/auth-context';
import { ProtectedRoute } from './components/protected-route';
import AppLayout from './layouts/app-layout';
import Login from './pages/auth/login';
import ChangePassword from './pages/auth/change-password';
import Dashboard from './pages/dashboard/dashboard';
import Placements from './pages/placements/placements';
import PlacementWizard from './pages/placements/wizard';
import PlacementDetail from './pages/placements/detail';
import Requirements from './pages/requirements/requirements';
import TimePage from './pages/time/time';
import Evaluations from './pages/evaluations/evaluations';
import ResourcePage from './pages/directories/resource-page';
import Accounts from './pages/accounts/accounts';
import Reports from './pages/reports/reports';
import Settings, { Help, AuditPage } from './pages/settings/settings';
function Home() {
  const { user } = useAuth();
  return <Navigate to={'/' + user.role + '/dashboard'} replace />;
}
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/change-password" element={<ChangePassword />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="/:role/dashboard" element={<Dashboard />} />
          <Route path="/placements" element={<Placements />} />
          <Route path="/placements/:id" element={<PlacementDetail />} />
          <Route path="/schedules" element={<TimePage />} />
          <Route path="/evaluations" element={<Evaluations />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/help" element={<Help />} />
          <Route element={<ProtectedRoute roles={['student']} />}>
            <Route path="/my/requirements" element={<Requirements />} />
          </Route>
          <Route element={<ProtectedRoute roles={['admin', 'faculty']} />}>
            <Route path="/reviews/requirements" element={<Requirements review />} />
          </Route>
          <Route element={<ProtectedRoute roles={['admin', 'faculty', 'supervisor']} />}>
            <Route path="/reports" element={<Reports />} />
            <Route path="/students" element={<ResourcePage resource="students" />} />
            <Route path="/companies" element={<ResourcePage resource="companies" />} />
          </Route>
          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="/placements/new" element={<PlacementWizard />} />
            <Route path="/placements/:id/edit" element={<PlacementWizard />} />
            <Route path="/users" element={<Accounts />} />
            <Route path="/faculty" element={<ResourcePage resource="faculty" />} />
            <Route
              path="/school-departments"
              element={<ResourcePage resource="school-departments" />}
            />
            <Route path="/requirements" element={<ResourcePage resource="requirements" />} />
            <Route
              path="/evaluation-criteria"
              element={<ResourcePage resource="evaluation-criteria" />}
            />
            <Route path="/audit-logs" element={<AuditPage />} />
          </Route>
          <Route
            path="*"
            element={
              <section className="card">
                <h1>Page not found</h1>
                <Link to="/">Return to dashboard</Link>
              </section>
            }
          />
        </Route>
      </Route>
    </Routes>
  );
}
