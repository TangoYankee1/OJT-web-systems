import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context';
import { api } from '../services/api';
export const navigation = [
  [
    'OVERVIEW',
    [
      ['Dashboard', 'dashboard', 'all', '01'],
      ['Placements', '/placements', 'all', '02'],
      ['Assign placement', '/placements/new', 'admin', '03'],
    ],
  ],
  [
    'WORKSPACE',
    [
      ['My requirements', '/my/requirements', 'student', '04'],
      ['Document reviews', '/reviews/requirements', 'admin,faculty', '05'],
      ['Schedules & duty', '/schedules', 'all', '06'],
      ['Evaluations', '/evaluations', 'all', '07'],
    ],
  ],
  [
    'DIRECTORIES',
    [
      ['Students', '/students', 'admin,faculty,supervisor', '08'],
      ['Faculty', '/faculty', 'admin', '09'],
      ['Companies', '/companies', 'admin,faculty,supervisor', '10'],
      ['School departments', '/school-departments', 'admin', '11'],
    ],
  ],
  [
    'ADMINISTRATION',
    [
      ['Requirement templates', '/requirements', 'admin', '12'],
      ['Evaluation rubric', '/evaluation-criteria', 'admin', '13'],
      ['Accounts', '/users', 'admin', '14'],
      ['Reports', '/reports', 'admin,faculty,supervisor', '15'],
      ['Settings', '/settings', 'all', '16'],
      ['Help & workflow', '/help', 'all', '17'],
    ],
  ],
];
export const allowed = (roles, role) => roles === 'all' || roles.split(',').includes(role);
export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false),
    [search, setSearch] = useState(''),
    [notifications, setNotifications] = useState([]),
    [bell, setBell] = useState(false),
    [ready, setReady] = useState(false),
    [error, setError] = useState(null);
  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const [n, r] = await Promise.all([api.get('/notifications?limit=10'), api.get('/ready')]);
        if (active) {
          setNotifications(n.data);
          setReady(r.data.status === 'ready');
        }
      } catch {
        if (active) setReady(false);
      }
    }
    poll();
    window.addEventListener('data:changed', poll);
    const timer = setInterval(poll, 30000);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener('data:changed', poll);
    };
  }, []);
  async function read(n) {
    try {
      await api.patch('/notifications/' + n.id + '/read', {});
      setNotifications((items) =>
        items.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)),
      );
      setBell(false);
      if (n.entityType === 'placement') navigate('/placements/' + n.entityId);
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className={'sidebar ' + (menu ? 'is-open' : '')}>
        <Link to={'/' + user.role + '/dashboard'} className="brand">
          <span className="brand-mark">P</span>
          <span>
            Practicum<small>OJT MONITORING</small>
          </span>
        </Link>
        <div className="workspace-label">
          <span className="workspace-dot" />
          {user.role} workspace
        </div>
        <nav aria-label="Main navigation">
          {navigation.map(([group, items]) => (
            <section key={group}>
              <h2>{group}</h2>
              {items
                .filter(([, , roles]) => allowed(roles, user.role))
                .map(([label, url, , icon]) => (
                  <NavLink
                    key={url}
                    to={url === 'dashboard' ? '/' + user.role + '/dashboard' : url}
                    end
                    onClick={() => setMenu(false)}
                  >
                    <span className="nav-icon" aria-hidden="true">
                      {icon}
                    </span>
                    {label}
                  </NavLink>
                ))}
            </section>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="avatar">{user.fullName.slice(0, 1)}</span>
          <div>
            <strong>{user.fullName}</strong>
            <small>{user.role}</small>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button
            className="outline mobile-menu"
            aria-label="Toggle navigation"
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            Menu
          </button>
          <form
            className="global-search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              navigate('/placements?search=' + encodeURIComponent(search));
            }}
          >
            <span aria-hidden="true">&#8981;</span>
            <input
              aria-label="Search placements"
              placeholder="Search students or placements..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="search-button" aria-label="Search">
              Search
            </button>
          </form>
          <div className="topbar-actions">
            <span className={'connection ' + (ready ? 'online' : '')}>
              {ready ? 'Service ready' : 'Checking service'}
            </span>
            <div className="notification-wrap">
              <button className="outline" onClick={() => setBell(!bell)} aria-expanded={bell}>
                Inbox{' '}
                {notifications.filter((x) => !x.readAt).length > 0 && (
                  <span className="count">{notifications.filter((x) => !x.readAt).length}</span>
                )}
              </button>
              {bell && (
                <div className="notification-panel">
                  <strong>Notifications</strong>
                  <small>Refreshes every 30 seconds</small>
                  {notifications.length ? (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        className={'notification ' + (!n.readAt ? 'unread' : '')}
                        onClick={() => read(n)}
                      >
                        {n.message}
                        <small>
                          {new Date(n.createdAt).toLocaleString('en-PH', {
                            timeZone: 'Asia/Manila',
                          })}
                        </small>
                      </button>
                    ))
                  ) : (
                    <p className="muted">No notifications yet.</p>
                  )}
                </div>
              )}
            </div>
            <button
              className="outline"
              onClick={async () => {
                try {
                  await logout();
                } catch (e) {
                  setError(e.message);
                }
              }}
            >
              Sign out
            </button>
          </div>
        </header>
        <main id="main" tabIndex="-1">
          {error && (
            <p className="alert error" role="alert">
              {error}
              <button className="outline" onClick={() => setError(null)}>
                Dismiss
              </button>
            </p>
          )}
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>Practicum / OJT Monitoring</span>
          <Link to="/help">Workflow guide</Link>
        </footer>
      </div>
    </div>
  );
}
