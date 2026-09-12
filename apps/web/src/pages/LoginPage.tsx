import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";

import { useAuthStore } from "../features/auth/auth.store";

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const isRestoring = useAuthStore((state) => state.isRestoring);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const rawReturnUrl = searchParams.get("returnUrl");
  const targetUrl =
    rawReturnUrl &&
    rawReturnUrl.startsWith("/") &&
    !rawReturnUrl.startsWith("//") &&
    rawReturnUrl !== "/login"
      ? rawReturnUrl
      : "/dashboard";

  const returnUrlQuery = rawReturnUrl
    ? `?returnUrl=${encodeURIComponent(rawReturnUrl)}`
    : "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    try {
      await login({
        email,
        password,
      });

      navigate(targetUrl, { replace: true });
    } catch {
      setError("Invalid email or password");
    }
  }

  // Wait until we finish checking the refresh token.
  if (isRestoring) {
    return <div>Loading...</div>;
  }

  // If already logged in, don't show the login page.
  if (isAuthenticated) {
    return <Navigate to={targetUrl} replace />;
  }

  return (
    <main>
      <h1>Documan Login</h1>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email</label>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="password">Password</label>

          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        {error && <p>{error}</p>}

        <button type="submit" disabled={isLoading}>
          {isLoading ? "Logging in..." : "Login"}
        </button>

        <div>
          <p>
            Don't have an account?{" "}
            <Link to={`/signup${returnUrlQuery}`}>Sign up</Link>
          </p>
        </div>
      </form>
    </main>
  );
}
