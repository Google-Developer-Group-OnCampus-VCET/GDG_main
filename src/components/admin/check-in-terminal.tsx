"use client";

import { useState } from "react";
import type { RegistrationRecord } from "@/types";

interface CheckInTerminalProps {
  eventSlug: string;
  initialCheckedInCount: number;
}

export function CheckInTerminal({ eventSlug, initialCheckedInCount }: CheckInTerminalProps) {
  const [refInput, setRefInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkedCount, setCheckedCount] = useState(initialCheckedInCount);
  const [lastResult, setLastResult] = useState<{
    status: "success" | "duplicate" | "error";
    message: string;
    registration?: RegistrationRecord;
  } | null>(null);
  const [recentLog, setRecentLog] = useState<{ time: string; name: string; ref: string; track: string }[]>([]);

  async function handleCheckIn(e: React.FormEvent) {
    e.preventDefault();
    if (!refInput.trim()) return;

    setSubmitting(true);
    setLastResult(null);

    try {
      const res = await fetch(`/api/events/${eventSlug}/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referenceId: refInput.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setLastResult({
          status: "success",
          message: data.message,
          registration: data.registration,
        });
        setCheckedCount((c) => c + 1);
        setRecentLog((prev) => [
          {
            time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            name: data.registration.fullName,
            ref: data.registration.referenceId,
            track: data.registration.track,
          },
          ...prev.slice(0, 9),
        ]);
        setRefInput("");
      } else if (res.status === 409) {
        setLastResult({
          status: "duplicate",
          message: data.message,
          registration: data.registration,
        });
      } else {
        setLastResult({
          status: "error",
          message: data.message || "Pass reference not found.",
        });
      }
    } catch {
      setLastResult({
        status: "error",
        message: "Network error during check-in verification.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Scanner & Input Column */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-border shadow-xs flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse"></span>
              <h2 className="text-lg font-bold text-foreground">
                Entrance Check-in Scanner
              </h2>
            </div>
            <span className="bg-secondary-fixed text-on-secondary-fixed text-xs px-3 py-1 rounded-full font-bold">
              {checkedCount} Check-ins Recorded
            </span>
          </div>

          <form onSubmit={handleCheckIn} className="flex flex-col gap-3">
            <label htmlFor="refInput" className="text-xs font-bold text-foreground">
              Scan QR or Enter Pass Reference ID
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  id="refInput"
                  type="text"
                  autoFocus
                  required
                  value={refInput}
                  onChange={(e) => setRefInput(e.target.value.toUpperCase())}
                  placeholder="e.g. GDG-VCET-2025-0842"
                  className="w-full h-12 pl-10 pr-4 rounded-xl border border-border bg-surface-container-low text-base font-mono font-bold text-foreground focus:outline-hidden focus:border-primary focus:bg-white transition-all uppercase"
                />
                <span className="material-symbols-outlined text-[20px] text-foreground-muted absolute left-3 top-3">
                  qr_code_scanner
                </span>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 h-12 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:bg-primary-hover transition-all shrink-0 cursor-pointer disabled:opacity-50"
              >
                {submitting ? "Verifying..." : "Verify Pass"}
              </button>
            </div>
            <p className="text-[11px] text-foreground-muted">
              Use your USB barcode/QR scanner or manually key in the 4-digit reference code on the student&apos;s digital badge.
            </p>
          </form>

          {/* Result Alert Box */}
          {lastResult ? (
            <div
              className={`p-5 rounded-2xl border flex flex-col gap-2 animate-fade-in ${
                lastResult.status === "success"
                  ? "bg-status-success/10 border-status-success/40 text-status-success"
                  : lastResult.status === "duplicate"
                  ? "bg-status-warning/15 border-status-warning/40 text-[#8a5d00]"
                  : "bg-status-error/10 border-status-error/40 text-status-error"
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                <span className="material-symbols-outlined text-[22px]">
                  {lastResult.status === "success"
                    ? "check_circle"
                    : lastResult.status === "duplicate"
                    ? "warning"
                    : "cancel"}
                </span>
                <span>{lastResult.message}</span>
              </div>

              {lastResult.registration ? (
                <div className="mt-2 pt-2 border-t border-current/20 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="opacity-75 block text-[10px] uppercase font-bold">Attendee</span>
                    <strong className="text-sm font-bold">{lastResult.registration.fullName}</strong>
                    <div className="opacity-80">{lastResult.registration.college}</div>
                  </div>
                  <div>
                    <span className="opacity-75 block text-[10px] uppercase font-bold">Assigned Track</span>
                    <strong className="font-semibold">{lastResult.registration.track}</strong>
                    <div className="opacity-80 font-mono">#{lastResult.registration.referenceId}</div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* Recent Activity Log Column */}
      <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-border shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between pb-2 border-b border-border/50">
          <h3 className="text-sm font-bold text-foreground">Live Terminal Stream</h3>
          <span className="text-[11px] text-foreground-muted">Recent verifications</span>
        </div>

        {recentLog.length === 0 ? (
          <div className="py-12 text-center text-xs text-foreground-muted">
            Terminal ready. Scan or enter a pass reference to begin check-in.
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border/40">
            {recentLog.map((log, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                <div className="flex flex-col">
                  <span className="font-bold text-foreground">{log.name}</span>
                  <span className="text-[11px] text-foreground-muted font-mono">{log.ref}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-mono text-[10px] text-foreground-muted">{log.time}</span>
                  <span className="text-[10px] font-semibold text-secondary">{log.track.slice(0, 15)}...</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

