
import { useState } from "react";
import {
  ShieldCheck,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ArrowRight,
  UserPlus,
} from "lucide-react";
import { apiRequest } from "../api/client";

export default function Login({
  onLogin,
  onGoToRegister,
  initialEmail = "",
}) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      if (!data.token) {
        throw new Error(
          "The server did not return an authentication token. Please try again."
        );
      }

      // Save the token so protected API requests can authenticate.
      localStorage.setItem("resolveiq_token", data.token);

      // Save basic user information for the application header.
      if (data.user) {
        localStorage.setItem(
          "resolveiq_user",
          JSON.stringify(data.user)
        );
      }

      onLogin(data.user || null);
    } catch (err) {
      setError(
        err.message || "Unable to sign in. Please check your details."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl md:grid-cols-2">
        {/* Left branding panel */}
        <div className="hidden flex-col justify-between bg-slate-950 p-10 text-white md:flex">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-600 p-3">
                <ShieldCheck size={27} />
              </div>

              <div>
                <h1 className="text-2xl font-bold">ResolveIQ</h1>
                <p className="text-sm text-slate-400">
                  Business Operations
                </p>
              </div>
            </div>

            <div className="mt-24">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">
                Operations workspace
              </p>

              <h2 className="mt-4 text-4xl font-bold leading-tight">
                Resolve issues.
                <br />
                Restore clarity.
              </h2>

              <p className="mt-5 max-w-sm leading-7 text-slate-300">
                Manage operational exceptions, track ownership, and keep
                resolutions moving in one centralized workspace.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Secure access to your operations workspace.
          </p>
        </div>

        {/* Login form */}
        <div className="p-7 sm:p-10 md:p-12">
          <div className="mb-9 md:hidden">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-600 p-3 text-white">
                <ShieldCheck size={25} />
              </div>

              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  ResolveIQ
                </h1>
                <p className="text-sm text-slate-500">
                  Business Operations
                </p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <LockKeyhole size={23} />
            </div>

            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Welcome back
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Sign in with your ResolveIQ account to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="login-email"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Email address
              </label>

              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@company.com"
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Password
              </label>

              <div className="relative">
                <LockKeyhole
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-12 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <LoaderCircle size={18} className="animate-spin" />
              ) : (
                <ArrowRight size={18} />
              )}

              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* Registration link */}
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-center">
            <p className="text-sm text-slate-600">
              Don't have an account?
            </p>

            <button
              type="button"
              onClick={onGoToRegister}
              className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition hover:text-blue-800"
            >
              <UserPlus size={17} />
              Create account
            </button>
          </div>

          <p className="mt-6 text-center text-xs leading-5 text-slate-400">
            Authorized users only. Your account permissions determine
            your access.
          </p>
        </div>
      </div>
    </div>
  );
}
