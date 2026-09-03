import { Link, useNavigate } from 'react-router-dom';

import { useAuthStore } from '../features/auth/auth.store';
import { NotificationBell } from '../components/NotificationBell';

export default function DashboardPage() {
  const navigate = useNavigate();

  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const logoutAll = useAuthStore((state) => state.logoutAll);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  async function handleLogoutAll() {
    await logoutAll();
    navigate('/login');
  }

  return (
    <main>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1>Documan Dashboard</h1>
        <NotificationBell />
      </div>

      {user && (
        <section>
          <p>Welcome, {user.name}</p>
          <p>Email: {user.email}</p>
          <p>Role: {user.role}</p>
        </section>
      )}

      <nav style={{ margin: '1rem 0', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <Link to="/knowledge/search">Knowledge Search</Link>
        <Link to="/documents">View Documents</Link>
        <Link to="/projects">Projects</Link>
        <Link to="/reviews">My Reviews</Link>
        <Link to="/trash">Trash</Link>
        {user?.role === 'admin' && <Link to="/users">Manage Users</Link>}
      </nav>

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1rem' }}>
        <button type="button" onClick={handleLogout}>
          Logout
        </button>

        <button type="button" onClick={handleLogoutAll}>
          Logout All Sessions
        </button>
      </div>
    </main>
  );
}