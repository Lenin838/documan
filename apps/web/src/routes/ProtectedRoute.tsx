import {
  Navigate,
  Outlet,
} from 'react-router-dom';

import { useAuthStore } from '../features/auth/auth.store';
import type { UserRole } from '../features/auth/auth.types';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({
  allowedRoles,
}: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore(
    (state) => state.isAuthenticated,
  );

  const user = useAuthStore(
    (state) => state.user,
  );

  const isRestoring = useAuthStore(
    (state) => state.isRestoring,
  );

  if (isRestoring) {
    return <p>Loading...</p>;
  }


  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }


  if (
    allowedRoles &&
    (!user || !allowedRoles.includes(user.role))
  ) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  return <Outlet />;
}
