import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '../features/auth/auth.store';

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
      <h1>Documan Dashboard</h1>

      {user && (
        <section>
          <p>Welcome, {user.name}</p>
          <p>Email: {user.email}</p>
          <p>Role: {user.role}</p>
        </section>
      )}

      <button type="button" onClick={handleLogout}>
        Logout
      </button>

      <button type="button" onClick={handleLogoutAll}>
        Logout All Sessions
      </button>
    </main>
  );
}