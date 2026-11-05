"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GdgLogo } from "@/components/gdg-logo";

const PRESET_ACCOUNTS = [
  {
    role: "Chapter Admin",
    name: "Jatush Hingu",
    email: "lead@vcet.edu.in",
    badge: "Full Chapter Control",
    color: "bg-primary-fixed text-on-primary-fixed",
  },
  {
    role: "Super Admin",
    name: "Global Community Lead",
    email: "superadmin@gdg.community",
    badge: "Multi-Tenant Superuser",
    color: "bg-purple-100 text-purple-800",
  },
  {
    role: "Event Manager",
    name: "Dhruv Jain",
    email: "organizer@vcet.edu.in",
    badge: "Events & Agenda",
    color: "bg-secondary-fixed text-on-secondary-fixed",
  },
  {
    role: "Check-in Volunteer",
    name: "Check-in Team",
    email: "volunteer@vcet.edu.in",
    badge: "Pass Verification Only",
    color: "bg-emerald-100 text-emerald-800",
  },
];

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("lead@vcet.edu.in");
  const [password, setPassword] = useState("gdgvcet2025!");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Authentication failed.");
        setLoading(false);
        return;
      }

      // Successful login
      router.push("/admin");
      router.refresh();
    } catch {
      setErrorMessage("Network error during login. Please try again.");
      setLoading(false);
    }
  };

  const handleSelectPreset = (presetEmail: string) => {
    setEmail(presetEmail);
    setPassword("gdgvcet2025!");
    setErrorMessage("");
  };

  return (
    <div className="w-full max-w-md flex flex-col gap-6">
      {/* Brand Header */}
      <div className="text-center flex flex-col items-center gap-2">
        <Link href="/" className="inline-flex items-center gap-2">
          <GdgLogo className="h-8" />
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground mt-2">
          GDG VCET Organizer Workspace
        </h1>
        <p className="text-xs text-foreground-muted">
          Sign in to manage events, registrations, check-in terminal, and chapter operations.
        </p>
      </div>

      {/* Main Login Card */}
      <div className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm flex flex-col gap-5">
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="organizer@vcet.edu.in"
              className="px-3.5 py-2.5 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">Password</label>
              <span className="text-[11px] text-foreground-muted font-mono">Demo: gdgvcet2025!</span>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="px-3.5 py-2.5 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-status-error/10 border border-status-error/20 text-status-error text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">error</span>
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-hover transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign In to Admin Workspace</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        {/* Preset Roles for 1-Click Testing */}
        <div className="pt-4 border-t border-border flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
              Quick Role Switcher
            </span>
            <span className="text-[10px] text-foreground-muted">1-Click Test Login</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {PRESET_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => handleSelectPreset(acc.email)}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                  email === acc.email
                    ? "border-primary bg-primary/5 shadow-xs"
                    : "border-border hover:bg-surface-container-low"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-foreground truncate">{acc.role}</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-semibold ${acc.color}`}>
                    {acc.badge.split(" ")[0]}
                  </span>
                </div>
                <span className="text-[10px] text-foreground-muted truncate">{acc.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="text-center">
        <Link href="/" className="text-xs text-foreground-muted hover:text-foreground">
          ← Return to Public Website
        </Link>
      </div>
    </div>
  );
}

