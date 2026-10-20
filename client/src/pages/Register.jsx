
import { useState } from "react";
import {
  ShieldCheck,
  UserRound,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  LoaderCircle,
  ArrowLeft,
} from "lucide-react";
import { apiRequest } from "../api/client";

export default function Register({ onRegistered, onBackToLogin }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
        }),
      });

      onRegistered(email.trim());
    } catch (err) {
      setError(err.message || "Unable to create your account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl md:grid-cols-2">
        <div className="hidden flex-col justify-between bg-slate-950 p-10 text-white md:flex">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-600 p-3">
                <ShieldCheck size={27} />
              </div>
              <div>
                <h1 className="text-2xl font-bold">ResolveIQ</h1>
                <p className="text-sm text-slate-400">Business Operations</p>
              </div>
            </div>

            <div className="mt-24">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">
                Get started
              </p>
              <h2 className="mt-4 text-4xl font-bold leading-tight">
                Your work.
                <br />
                One workspace.
              </h2>
              <p className="mt-5 max-w-sm leading-7 text-slate-300">
                Create your account to track operational exceptions,
                collaborate with your team, and follow resolutions.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            New accounts start with reporter access.
          </p>
        </div>

        <div className="p-7 sm:p-10 md:p-12">
          <button
            type="button"
            onClick={onBackToLogin}
            className="mb-7 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-700"
          >
            <ArrowLeft size={17} />
            Back to sign in
          </button>

          <div className="mb-7 md:hidden">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-600 p-3 text-white">
                <ShieldCheck size={25} />
              </div>
              <h1 className="text-xl font-bold text-slate-900">ResolveIQ</h1>
            </div>
          </div>

          <div className="mb-7">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <UserRound size={23} />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Create account
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Enter your details to join ResolveIQ.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="register-name" className="mb-2 block text-sm font-semibold text-slate-700">
                Full name
              </label>
              <div className="relative">
                <UserRound size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="register-name"
                  type="text"
                  autoComplete="name"
                  required
                  maxLength={100}
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Your full name"
                  className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label htmlFor="register-email" className="mb-2 block text-sm font-semibold text-slate-700">
                Email address
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@company.com"
                  className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label htmlFor="register-password" className="mb-2 block text-sm font-semibold text-slate-700">
                Password
              </label>
              <div className="relative">
                <LockKeyhole size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-12 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="register-confirm" className="mb-2 block text-sm font-semibold text-slate-700">
                Confirm password
              </label>
              <input
                id="register-confirm"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Enter your password again"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            {error && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <LoaderCircle size={18} className="animate-spin" />}
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <button
              type="button"
              onClick={onBackToLogin}
              className="font-semibold text-blue-700 hover:text-blue-800"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
