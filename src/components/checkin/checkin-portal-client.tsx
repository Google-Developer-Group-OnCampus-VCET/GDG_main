"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GdgLogo } from "@/components/gdg-logo";
import { CheckInTerminal } from "@/components/admin/check-in-terminal";

interface CheckInPortalClientProps {
  initialAuthenticated: boolean;
  eventSlug: string;
  eventTitle: string;
  initialCheckedInCount: number;
  initialDailyCounts?: Record<number, number>;
  totalDays: number;
}

export function CheckInPortalClient({
  initialAuthenticated,
  eventSlug,
  eventTitle,
  initialCheckedInCount,
  initialDailyCounts,
  totalDays,
}: CheckInPortalClientProps) {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(initialAuthenticated);
  const [passcode, setPasscode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!passcode.trim() || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/checkin-portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: passcode.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAuthenticated(true);
        setPasscode("");
        router.refresh();
      } else {
        setError(data.message || "Invalid check-in passcode.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignOut() {
    setLoggingOut(true);
    try {
      await fetch("/api/checkin-portal/logout", { method: "POST" });
      setAuthenticated(false);
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-surface-container-low flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-md bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="h-1.5 w-full grid grid-cols-4">
            <div className="bg-[#4285F4]" />
            <div className="bg-[#EA4335]" />
            <div className="bg-[#FBBC04]" />
            <div className="bg-[#34A853]" />
          </div>

          <div className="p-6 sm:p-8 flex flex-col gap-6">
            <div className="flex flex-col items-center text-center gap-2">
              <GdgLogo className="h-6" />
              <span className="mt-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                Volunteer Check-in Desk
              </span>
              <h1 className="text-xl font-bold text-foreground mt-1">
                {eventTitle}
              </h1>
              <p className="text-xs text-foreground-muted">
                Enter the check-in staff passcode to open the live QR scanner.
              </p>
            </div>

            {error ? (
              <div className="px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold text-center">
                {error}
              </div>
            ) : null}

            <form onSubmit={handleUnlock} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Staff Passcode
                </span>
                <input
                  type="password"
                  required
                  autoFocus
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter check-in passcode"
                  className="h-12 px-3.5 rounded-xl border border-border bg-surface-container-low/50 text-sm text-foreground focus:bg-white focus:border-primary focus:outline-hidden"
                />
              </label>

              <button
                type="submit"
                disabled={submitting || !passcode.trim()}
                className="h-12 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "Verifying…" : "Unlock Check-in Scanner"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-container-low flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-white shadow-xs">
        <div className="mx-auto flex h-14 max-w-(--container-max) items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5 min-w-0">
            <GdgLogo className="h-4 sm:h-5 shrink-0" />
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold whitespace-nowrap">
              Check-in Desk
            </span>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={loggingOut}
            className="inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-full bg-status-danger/10 text-status-danger hover:bg-status-danger/20 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
          >
            <span>{loggingOut ? "Locking…" : "Lock Desk"}</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-(--container-max) w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-5">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider">
            {eventTitle}
          </p>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground mt-0.5">
            Live Check-in &amp; Pass Verification
          </h1>
        </div>

        <CheckInTerminal
          eventSlug={eventSlug}
          initialCheckedInCount={initialCheckedInCount}
          initialDailyCounts={initialDailyCounts}
          totalDays={totalDays}
          statusEndpoint={`/api/checkin-portal/status?slug=${eventSlug}`}
        />
      </main>
    </div>
  );
}
