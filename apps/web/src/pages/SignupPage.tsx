import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";

import { useAuthStore } from "../features/auth/auth.store";
import { Button } from "../components/ui/Button";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";

export default function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const signup = useAuthStore((state) => state.signup);
  const verifyOtp = useAuthStore((state) => state.verifyOtp);
  const resendOtp = useAuthStore((state) => state.resendOtp);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isRestoring = useAuthStore((state) => state.isRestoring);

  const [step, setStep] = useState<"credentials" | "verify_otp">("credentials");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);

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

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cooldown]);

  async function handleCredentialsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      const res = await signup({
        name,
        email,
        password,
      });

      setStep("verify_otp");
      setCooldown(res.resendCooldown || 60);
      if (res.devOtpCode) {
        setDevOtp(res.devOtpCode);
        setOtp(res.devOtpCode);
      }
      setSuccessMessage(
        res.message || "A 6-digit verification code has been sent to your email.",
      );
    } catch (err: unknown) {
      const apiError = err as {
        message?: string;
        response?: { data?: { error?: { message?: string } } };
      };
      const message =
        apiError.response?.data?.error?.message ||
        apiError.message ||
        (err instanceof Error ? err.message : null) ||
        "Failed to create account. Please try again.";

      setError(message);
    }
  }

  async function handleVerifyOtpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (otp.trim().length !== 6) {
      setError("Verification code must be 6 digits");
      return;
    }

    try {
      await verifyOtp({
        email,
        otp: otp.trim(),
      });

      navigate(targetUrl, { replace: true });
    } catch (err: unknown) {
      const apiError = err as {
        response?: { data?: { error?: { message?: string } } };
      };
      const message =
        apiError.response?.data?.error?.message ||
        "Invalid verification code. Please try again.";

      setError(message);
    }
  }

  async function handleResendOtp() {
    if (cooldown > 0 || isLoading) return;

    setError("");
    setSuccessMessage("");

    try {
      const res = await resendOtp({ email });
      setCooldown(res.resendCooldown || 60);
      if (res.devOtpCode) {
        setDevOtp(res.devOtpCode);
        setOtp(res.devOtpCode);
      }
      setSuccessMessage(
        res.message || "A new verification code has been sent to your email.",
      );
    } catch (err: unknown) {
      const apiError = err as {
        response?: { data?: { error?: { message?: string } } };
      };
      const message =
        apiError.response?.data?.error?.message ||
        "Failed to resend code. Please try again.";

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
        {step === "credentials" ? (
          <>
            <div>
              <h1 className="text-center text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Create your Documan Account
              </h1>
              <p className="mt-2 text-center text-sm text-slate-400">
                Sign up for self-service access
              </p>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleCredentialsSubmit}>
              {error && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-sm font-medium flex items-center gap-2"
                >
                  <span className="text-red-400 shrink-0" aria-hidden="true">
                    ⚠
                  </span>
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
          </>
        ) : (
          <>
            <div>
              <h1 className="text-center text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Verify Your Email
              </h1>
              <p className="mt-2 text-center text-sm text-slate-400">
                Enter the 6-digit code sent to{" "}
                <span className="font-semibold text-slate-200">{email}</span>
              </p>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleVerifyOtpSubmit}>
              {devOtp && (
                <div
                  role="status"
                  className="p-3.5 rounded-xl bg-amber-950/60 border border-amber-800/80 text-amber-200 text-sm font-medium space-y-1"
                >
                  <div className="flex items-center gap-2 text-amber-300 font-semibold">
                    <span aria-hidden="true">💡</span>
                    <span>Local Dev Helper (Verification Code)</span>
                  </div>
                  <p className="text-xs text-amber-300/90 leading-relaxed">
                    An email is dispatched to your inbox. For quick testing, your verification code is:{" "}
                    <span className="font-mono font-bold tracking-wider text-amber-100 text-sm select-all">{devOtp}</span>
                  </p>
                </div>
              )}

              {successMessage && (
                <div
                  role="status"
                  className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-sm font-medium flex items-center gap-2"
                >
                  <span className="text-emerald-400 shrink-0" aria-hidden="true">
                    ✓
                  </span>
                  <span>{successMessage}</span>
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-sm font-medium flex items-center gap-2"
                >
                  <span className="text-red-400 shrink-0" aria-hidden="true">
                    ⚠
                  </span>
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="otp"
                  className="block text-sm font-medium text-slate-300 text-center mb-2"
                >
                  Verification Code
                </label>
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  required
                  placeholder="000000"
                  aria-invalid={!!error}
                  className="block w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-xl shadow-sm text-indigo-400 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950 text-center font-mono text-2xl tracking-[0.5em] transition-colors"
                />
              </div>

              <div className="space-y-3">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isLoading}
                  className="w-full"
                >
                  Verify Email
                </Button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={cooldown > 0 || isLoading}
                  className="w-full py-2.5 text-sm font-medium text-indigo-400 hover:text-indigo-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors text-center"
                >
                  {cooldown > 0 ? `Resend Code (${cooldown}s)` : "Resend Code"}
                </button>
              </div>

              <div className="text-center text-sm pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep("credentials");
                    setError("");
                    setSuccessMessage("");
                    setOtp("");
                    setDevOtp(null);
                  }}
                  className="font-medium text-slate-400 hover:text-slate-300 transition-colors"
                >
                  ← Use a different email address
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
