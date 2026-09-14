import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";

import { useAuthStore } from "../features/auth/auth.store";
import { Button } from "../components/ui/Button";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <LoadingSpinner label="Checking session..." />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={targetUrl} replace />;
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-slate-900 p-8 rounded-2xl shadow-xl border border-slate-800/80">
        <div>
          <h1 className="text-center text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Create your Documan Account
          </h1>
          <p className="mt-2 text-center text-sm text-slate-400">
            Sign up for self-service access
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-sm font-medium flex items-center gap-2"
            >
              <span className="text-red-400 shrink-0" aria-hidden="true">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-slate-300"
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
                aria-invalid={!!error}
                className="mt-1 block w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl shadow-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950 sm:text-sm transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-300"
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
                aria-invalid={!!error}
                className="mt-1 block w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl shadow-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950 sm:text-sm transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-300"
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
                aria-invalid={!!error}
                className="mt-1 block w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl shadow-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950 sm:text-sm transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-slate-300"
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
                aria-invalid={!!error}
                className="mt-1 block w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl shadow-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950 sm:text-sm transition-colors"
              />
            </div>
          </div>

          <div>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full"
            >
              Create account
            </Button>
          </div>

          <div className="text-center text-sm">
            <span className="text-slate-400">
              Already have an account?{" "}
            </span>
            <Link
              to={`/login${returnUrlQuery}`}
              className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Log in
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
