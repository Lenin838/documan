import {
  Navigate,
  Outlet,
} from 'react-router-dom';

import { useAuthStore } from '../features/auth/auth.store';
import type { UserRole } from '../features/auth/auth.types';

import { LoadingSpinner } from '../components/ui/LoadingSpinner';

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner label="Restoring session..." />
      </div>
    );
  }


  if (!isAuthenticated) {
    const currentPath = window.location.pathname + window.location.search;
    const isSafePath =
      currentPath.startsWith('/') &&
      !currentPath.startsWith('//') &&
      currentPath !== '/login';
    const returnUrlQuery = isSafePath
      ? `?returnUrl=${encodeURIComponent(currentPath)}`
      : '';

    return (
      <Navigate
        to={`/login${returnUrlQuery}`}
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
