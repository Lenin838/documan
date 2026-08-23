import { Navigate, Outlet } from 'react-router-dom';

import { useAuthStore } from '../features/auth/auth.store';

export default function ProtectedRoute() {
  const isAuthenticated = useAuthStore(
    (state) => state.isAuthenticated,
  );

  const isRestoring = useAuthStore(
    (state) => state.isRestoring,
  );

  if (isRestoring) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}