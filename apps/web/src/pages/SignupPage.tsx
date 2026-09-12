import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";

import { useAuthStore } from "../features/auth/auth.store";

export default function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const signup = useAuthStore((state) => state.signup);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isRestoring = useAuthStore((state) => state.isRestoring);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const rawReturnUrl = searchParams.get("returnUrl");
  const targetUrl =
    rawReturnUrl &&
    rawReturnUrl.startsWith("/") &&
    !rawReturnUrl.startsWith("//") &&
    rawReturnUrl !== "/login" &&
    rawReturnUrl !== "/signup"
      ? rawReturnUrl
      : "/dashboard";

  const returnUrlQuery = rawReturnUrl
    ? `?returnUrl=${encodeURIComponent(rawReturnUrl)}`
    : "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      await signup({
        name,
        email,
        password,
      });

      navigate(targetUrl, { replace: true });
    } catch (err: unknown) {
      const apiError = err as {
        response?: { data?: { error?: { message?: string } } };
      };
      const message =
        apiError.response?.data?.error?.message ||
        "Failed to create account. Please try again.";

      setError(message);
    }
  }

  if (isRestoring) {
    return <div>Loading...</div>;
  }

  if (isAuthenticated) {
    return <Navigate to={targetUrl} replace />;
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Create your Documan Account
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Sign up for self-service access
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div
              role="alert"
              className="p-3 rounded-md bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm font-medium"
            >
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoading ? "Creating account..." : "Create account"}
            </button>
          </div>

          <div className="text-center text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Already have an account?{" "}
            </span>
            <Link
              to={`/login${returnUrlQuery}`}
              className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              Log in
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
