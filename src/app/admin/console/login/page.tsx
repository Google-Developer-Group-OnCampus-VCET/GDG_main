"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { GdgLogo } from "@/components/gdg-logo";
import { loginWithEmail } from "@/lib/firebase/client";

// Evaluated once at module scope to avoid Next.js 16 CacheComponents prerender instability
const CURRENT_YEAR = new Date().getFullYear();

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/admin/console";

  const [authMode, setAuthMode] = useState<"email" | "passcode">("email");
  const [email, setEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [passcode, setPasscode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function completeLogin(payload: { email?: string; idToken?: string; password?: string }) {
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.message || "Authentication failed.");
        setLoading(false);
        return;
      }

      router.push(nextUrl);
      router.refresh();
    } catch {
      setErrorMessage("Network error connecting to authentication server.");
      setLoading(false);
    }
  }

  // 1. Email & Password Handler
  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !emailPassword.trim()) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Attempt Firebase Authentication
      const { idToken } = await loginWithEmail(email, emailPassword);
      await completeLogin({ idToken });
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      // Fallback: Check direct server-side credentials (configured via ADMIN_EMAIL & ADMIN_PASSWORD in .env.local)
      try {
        const res = await fetch("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), password: emailPassword.trim() }),
        });
        if (res.ok) {
          router.push(nextUrl);
          router.refresh();
          return;
        }
      } catch {
        // pass through to error reporting below
      }

      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password"
      ) {
        setErrorMessage("Invalid email or password.");
      } else if (error.code === "auth/configuration-not-found") {
        setErrorMessage("Email/Password not found in Firebase or .env.local.");
      } else {
        setErrorMessage(error.message || "Email authentication failed.");
      }
      setLoading(false);
    }
  }

  // 2. Passcode Handler
  async function handlePasscodeSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!passcode.trim()) {
      setErrorMessage("Please enter the admin passcode.");
      return;
    }

    await completeLogin({ password: passcode });
  }

  return (
    <div className="w-full max-w-[460px] bg-white rounded-3xl border border-slate-200/80 shadow-2xl shadow-slate-200/60 p-7 sm:p-9 relative overflow-hidden transition-all">
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
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100/80 text-[#1a73e8] text-xs font-semibold mb-3">
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
            <span>Console Access</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Sign In to Console
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
            Chapter operations, attendee check-in terminal, and Google Sheets export.
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

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setAuthMode("email");
              setErrorMessage(null);
            }}
            className={`py-2 rounded-lg transition-all cursor-pointer ${
              authMode === "email"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Email &amp; Password
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode("passcode");
              setErrorMessage(null);
            }}
            className={`py-2 rounded-lg transition-all cursor-pointer ${
              authMode === "passcode"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Chapter Passcode
          </button>
        </div>

        {/* Form: Email & Password */}
        {authMode === "email" ? (
          <form onSubmit={handleEmailSignIn} className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1 text-left">
              <label
                htmlFor="admin-email"
                className="text-xs font-bold text-slate-700 uppercase tracking-wider"
              >
                Organizer Email
              </label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="lead@vcet.edu.in"
                disabled={loading}
                required
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#1a73e8] focus:outline-hidden focus:ring-4 focus:ring-[#1a73e8]/10 transition-all"
              />
            </div>

            <div className="flex flex-col gap-1 text-left">
              <label
                htmlFor="admin-email-pass"
                className="text-xs font-bold text-slate-700 uppercase tracking-wider"
              >
                Password
              </label>
              <input
                id="admin-email-pass"
                type="password"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                placeholder="••••••••••••"
                disabled={loading}
                required
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#1a73e8] focus:outline-hidden focus:ring-4 focus:ring-[#1a73e8]/10 transition-all font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#1a73e8] px-4 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-[#1557b0] active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In with Email</span>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>
          </form>
        ) : (
          /* Form: Chapter Passcode */
          <form onSubmit={handlePasscodeSignIn} className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1 text-left">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="admin-passcode"
                  className="text-xs font-bold text-slate-700 uppercase tracking-wider"
                >
                  Admin Passcode
                </label>
                <span className="text-[11px] font-medium text-slate-400">
                  Confidential
                </span>
              </div>

              <div className="relative">
                <input
                  id="admin-passcode"
                  type={showPassword ? "text" : "password"}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter secret passcode..."
                  disabled={loading}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-4 pr-11 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#1a73e8] focus:outline-hidden focus:ring-4 focus:ring-[#1a73e8]/10 transition-all font-mono"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide passcode" : "Show passcode"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors cursor-pointer"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              className="mt-1 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#1a73e8] px-4 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-[#1557b0] active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  <span>Verifying Passcode...</span>
                </>
              ) : (
                <>
                  <span>Sign In with Passcode</span>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>
          </form>
        )}

        {/* Security Notice & Return Link */}
        <div className="pt-3 border-t border-slate-100 flex flex-col items-center gap-2.5">
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
            <span>Firebase Project: <strong className="font-mono text-slate-700">gdgoc-vcet</strong></span>
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
            <div className="h-[460px] w-full max-w-[460px] rounded-3xl bg-white border border-slate-200/80 animate-pulse" />
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
