import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { ErrorBoundary } from "./components/ErrorBoundary";
import ProtectedRoute from "./routes/ProtectedRoute";
import { useAuthStore } from "./features/auth/auth.store";

const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const DocumentsPage = lazy(() => import("./pages/DocumentsPage"));
const DocumentCreatePage = lazy(() => import("./pages/DocumentCreatePage"));
const DocumentDetailsPage = lazy(() => import("./pages/DocumentDetailsPage"));
const DocumentEditPage = lazy(() => import("./pages/DocumentEditPage"));
const TrashPage = lazy(() => import("./pages/TrashPage"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const ProjectDetailsPage = lazy(() => import("./pages/ProjectDetailsPage"));
const KnowledgeSearchPage = lazy(() => import("./pages/KnowledgeSearchPage"));
const ReviewsPage = lazy(() =>
  import("./pages/ReviewsPage").then((m) => ({ default: m.ReviewsPage })),
);
const UsersPage = lazy(() => import("./pages/UsersPage"));
const UserDetailsPage = lazy(() => import("./pages/UserDetailsPage"));
const EditUserPage = lazy(() => import("./pages/EditUserPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Loading...
        </p>
      </div>
    </div>
  );
}

function App() {
  const restoreSession = useAuthStore((state) => state.restoreSession);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  return (
    <ErrorBoundary>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-md focus:shadow-lg"
      >
        Skip to main content
      </a>
      <main id="main-content">
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route
                path="/knowledge/search"
                element={<KnowledgeSearchPage />}
              />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:id" element={<ProjectDetailsPage />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route
                path="/documents/create"
                element={<DocumentCreatePage />}
              />
              <Route path="/documents/:id" element={<DocumentDetailsPage />} />
              <Route
                path="/documents/:id/edit"
                element={<DocumentEditPage />}
              />
              <Route path="/trash" element={<TrashPage />} />
              <Route path="/reviews" element={<ReviewsPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
              <Route path="/users" element={<UsersPage />} />
              <Route path="/users/:id" element={<UserDetailsPage />} />
              <Route path="/users/:id/edit" element={<EditUserPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>
    </ErrorBoundary>
  );
}

export default App;
