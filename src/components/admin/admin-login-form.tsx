"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { GdgLogo } from "@/components/gdg-logo";
import { getFirebaseClientAuth } from "@/lib/firebase/client";

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    const auth = getFirebaseClientAuth();

    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const idToken = await credential.user.getIdToken();

      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        // The server session cookie wasn't issued (e.g. no linked admin profile, or
        // suspended account) — sign out of Firebase client-side too so state stays consistent.
        await signOut(auth);
        setErrorMessage(data.error || "Authentication failed.");
        setLoading(false);
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setErrorMessage("Invalid email or password.");
      setLoading(false);
    }
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
            <label className="text-xs font-semibold text-foreground">Password</label>
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
      </div>

      <div className="text-center">
        <Link href="/" className="text-xs text-foreground-muted hover:text-foreground">
          ← Return to Public Website
        </Link>
      </div>
    </div>
  );
}
