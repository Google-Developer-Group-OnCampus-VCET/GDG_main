"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { GdgLogo } from "@/components/gdg-logo";

// Evaluated once at module scope to avoid Next.js 16 CacheComponents prerender instability
const CURRENT_YEAR = new Date().getFullYear();

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/admin/console";

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMessage("Please enter the admin passcode.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.message || "Invalid admin passcode.");
        setLoading(false);
        return;
      }

      // Successful login -> Redirect to destination
      router.push(nextUrl);
      router.refresh();
    } catch {
      setErrorMessage("Network error occurred. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-[440px] bg-white rounded-3xl border border-slate-200/80 shadow-2xl shadow-slate-200/60 p-8 sm:p-10 relative overflow-hidden transition-all">
      {/* Google 4-Color Brand Accent Bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 grid grid-cols-4">
        <div className="bg-[#4285F4]"></div>
        <div className="bg-[#EA4335]"></div>
        <div className="bg-[#FBBC05]"></div>
        <div className="bg-[#34A853]"></div>
      </div>

      <div className="flex flex-col gap-6">
        {/* Card Header */}
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100/80 text-[#1a73e8] text-xs font-semibold mb-4">
            {/* SVG Shield Lock Icon */}
            <svg
              className="w-3.5 h-3.5 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <rect x="9" y="10" width="6" height="4" rx="1" />
            </svg>
            <span>Organizer Console</span>
          </div>

          <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900">
            Sign In to Admin
          </h1>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            Enter the chapter admin passcode to manage DevCraft 2025 attendees, live check-ins, and analytics.
          </p>
        </div>

        {/* Error Notification Banner */}
        {errorMessage ? (
          <div
            role="alert"
            className="flex items-start gap-3 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium"
          >
            <svg
              className="w-4 h-4 shrink-0 text-rose-600 mt-0.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="leading-normal">{errorMessage}</span>
          </div>
        ) : null}

        {/* Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5 text-left">
            <div className="flex items-center justify-between">
              <label
                htmlFor="admin-passcode"
                className="text-xs font-bold text-slate-700 uppercase tracking-wider"
              >
                Passcode
              </label>
              <span className="text-[11px] font-medium text-slate-400">
                Confidential
              </span>
            </div>

            <div className="relative">
              {/* SVG Key Icon */}
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="7.5" cy="15.5" r="4.5" />
                  <path d="M21 2l-9.6 9.6" />
                  <path d="M15.5 7.5l3 3L22 7l-3-3" />
                </svg>
              </div>

              <input
                id="admin-passcode"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin secret passcode..."
                disabled={loading}
                autoFocus
                required
                className="w-full rounded-2xl border border-slate-300 bg-slate-50/50 pl-10 pr-11 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#1a73e8] focus:outline-hidden focus:ring-4 focus:ring-[#1a73e8]/10 transition-all font-mono"
              />

              {/* Toggle Eye Button */}
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide passcode" : "Show passcode"}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors"
              >
                {showPassword ? (
                  // SVG Eye Off
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  // SVG Eye
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1a73e8] px-5 py-3.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-[#1557b0] active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign In to Console</span>
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </>
            )}
          </button>
        </form>

        {/* Security & Access Notice */}
        <div className="pt-4 border-t border-slate-100 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <svg
              className="w-3.5 h-3.5 text-emerald-600 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Authorized GDG VCET Core Team Access Only</span>
          </div>

          <Link
            href="/"
            className="text-xs font-medium text-slate-600 hover:text-[#1a73e8] inline-flex items-center gap-1.5 transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Return to Chapter Website</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-[#f8fafd] flex flex-col justify-between relative overflow-hidden">
      {/* Ambient background decoration */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-blue-100/40 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[450px] h-[450px] rounded-full bg-emerald-100/30 blur-3xl pointer-events-none"></div>

      {/* Standalone Top Bar */}
      <header className="relative z-10 w-full border-b border-slate-200/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <GdgLogo className="h-6" />
            <span className="text-sm font-semibold text-slate-800">
              on Campus · VCET
            </span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-2xs"
          >
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Back to site</span>
          </Link>
        </div>
      </header>

      {/* Center Auth Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-6 sm:my-10">
        <Suspense
          fallback={
            <div className="h-[460px] w-full max-w-[440px] rounded-3xl bg-white border border-slate-200/80 animate-pulse" />
          }
        >
          <LoginForm />
        </Suspense>
      </main>

      {/* Standalone Minimal Footer */}
      <footer className="relative z-10 w-full py-4 text-center text-xs text-slate-400 border-t border-slate-200/40">
        <p>© {CURRENT_YEAR} Google Developer Groups on Campus · VCET</p>
      </footer>
    </div>
  );
}
