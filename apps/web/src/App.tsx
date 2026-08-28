import { useEffect } from 'react';

import {
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DocumentsPage from './pages/DocumentsPage';
import DocumentDetailsPage from './pages/DocumentDetailsPage';
import ProtectedRoute from './routes/ProtectedRoute';
import UsersPage from './pages/UsersPage';
import UserDetailsPage from './pages/UserDetailsPage';
import EditUserPage from './pages/EditUserPage';
import { useAuthStore } from './features/auth/auth.store';

function App() {
  const restoreSession = useAuthStore(
    (state) => state.restoreSession,
  );

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Navigate
            to="/dashboard"
            replace
          />
        }
      />

      <Route
        path="/login"
        element={<LoginPage />}
      />

      <Route element={<ProtectedRoute />}>
        <Route
          path="/dashboard"
          element={<DashboardPage />}
        />
        <Route
          path="/documents"
          element={<DocumentsPage />}
        />
        <Route
          path="/documents/:id"
          element={<DocumentDetailsPage />}
        />
      </Route>

      <Route
        element={
          <ProtectedRoute allowedRoles={['admin']} />
        }
      >
        <Route
          path="/users"
          element={<UsersPage />}
        />

        <Route
          path="/users/:id"
          element={<UserDetailsPage />}
        />

        <Route
          path="/users/:id/edit"
          element={<EditUserPage />}
        />
      </Route>
    </Routes>
  );
}

export default App;