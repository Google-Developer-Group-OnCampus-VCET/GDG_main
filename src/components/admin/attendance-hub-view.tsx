"use client";

import { useState, useRef, useEffect } from "react";
import type { ChapterEvent, RegistrationRecord } from "@/types";

interface Props {
  events: ChapterEvent[];
}

interface ScanFeedback {
  type: "success" | "duplicate" | "error";
  message: string;
  registration?: RegistrationRecord;
}

export function AttendanceHubView({ events }: Props) {
  const [selectedSlug, setSelectedSlug] = useState<string>(events[0]?.slug || "devcraft-2025");
  const [passInput, setPassInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null);
  const [recentScans, setRecentScans] = useState<RegistrationRecord[]>([]);
  const [stats, setStats] = useState({
    totalRegistered: 124,
    checkedInCount: 19,
    capacity: 150,
    percent: 83,
  });

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input automatically for handheld barcode/QR laser scanners
  useEffect(() => {
    inputRef.current?.focus();
  }, [selectedSlug]);

  // Fetch live stats when event changes
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/events/${selectedSlug}/stats`);
        const data = await res.json();
        if (data.stats) {
          setStats({
            totalRegistered: data.stats.totalRegistered,
            checkedInCount: data.stats.checkedInCount,
            capacity: data.stats.capacity,
            percent: data.stats.percentFilled,
          });
        }
      } catch {
        // Fallback silently
      }
    };
    fetchStats();
  }, [selectedSlug]);

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRef = passInput.trim().toUpperCase();
    if (!cleanRef) return;

    setIsProcessing(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/events/${selectedSlug}/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referenceId: cleanRef, operatorName: "Jatush Hingu (Lead Desk)" }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setFeedback({
          type: "success",
          message: data.message,
          registration: data.registration,
        });

        if (data.registration) {
          setRecentScans((prev) => [data.registration, ...prev.slice(0, 9)]);
        }

        // Increment stats
        setStats((prev) => ({
          ...prev,
          checkedInCount: prev.checkedInCount + 1,
        }));
      } else if (res.status === 409) {
        setFeedback({
          type: "duplicate",
          message: data.message || "Pass was ALREADY checked in.",
          registration: data.registration,
        });
      } else {
        setFeedback({
          type: "error",
          message: data.message || `Pass #${cleanRef} was not found for this event.`,
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Network or scanning server error.",
      });
    } finally {
      setIsProcessing(false);
      setPassInput("");
      inputRef.current?.focus();
    }
  };

  const attendanceRate =
    stats.totalRegistered > 0
      ? Math.round((stats.checkedInCount / stats.totalRegistered) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            QR Attendance Terminal
          </h1>
          <p className="text-xs sm:text-sm text-foreground-muted mt-1">
            Real-time venue check-in. Compatible with 2D QR scanners, laser barcodes, and manual pass lookup.
          </p>
        </div>

        {/* Event Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-foreground-muted">Active Event:</label>
          <select
            value={selectedSlug}
            onChange={(e) => setSelectedSlug(e.target.value)}
            className="px-3 py-2 rounded-xl border border-border bg-white text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs"
          >
            {events.map((e) => (
              <option key={e.slug} value={e.slug}>
                {e.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Real-time Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex flex-col gap-1">
          <span className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
            Checked In Today
          </span>
          <span className="text-3xl font-extrabold text-status-success">
            {stats.checkedInCount}
          </span>
          <span className="text-[11px] text-foreground-muted">Verified at entrance</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex flex-col gap-1">
          <span className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
            Total Registered
          </span>
          <span className="text-3xl font-extrabold text-primary">
            {stats.totalRegistered}
          </span>
          <span className="text-[11px] text-foreground-muted">Eligible badge holders</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex flex-col gap-1">
          <span className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
            Attendance Rate
          </span>
          <span className="text-3xl font-extrabold text-foreground">
            {attendanceRate}%
          </span>
          <span className="text-[11px] text-foreground-muted">Show-up conversion</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex flex-col gap-1">
          <span className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
            Venue Capacity
          </span>
          <span className="text-3xl font-extrabold text-foreground">
            {stats.capacity}
          </span>
          <span className="text-[11px] text-foreground-muted">Seats configured</span>
        </div>
      </div>

      {/* Main Terminal Input & Feedback */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Scanner Wedge Terminal (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-xs flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-status-success animate-pulse"></span>
                <h2 className="text-base font-bold text-foreground">Scanner Input Stream</h2>
              </div>
              <span className="text-[11px] font-mono text-foreground-muted">
                Ready for Input
              </span>
            </div>

            <form onSubmit={handleScanSubmit} className="flex flex-col gap-3">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[24px] text-foreground-muted pointer-events-none">
                  qr_code_scanner
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Scan pass barcode or type: GDG-VCET-2025-0001"
                  value={passInput}
                  onChange={(e) => setPassInput(e.target.value)}
                  disabled={isProcessing}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-border bg-surface-container-lowest text-base sm:text-lg font-mono font-bold text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary uppercase"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-foreground-muted">
                <span>Press Enter or trigger laser scanner</span>
                <button
                  type="submit"
                  disabled={isProcessing || !passInput.trim()}
                  className="px-5 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs hover:bg-primary-hover transition-colors shadow-xs disabled:opacity-50"
                >
                  {isProcessing ? "Validating..." : "Process Entrance"}
                </button>
              </div>
            </form>

            {/* Audio-Visual Feedback Banner */}
            {feedback && (
              <div
                className={`p-6 rounded-2xl border flex flex-col gap-3 transition-all ${
                  feedback.type === "success"
                    ? "bg-emerald-50 border-emerald-300 text-status-success"
                    : feedback.type === "duplicate"
                    ? "bg-amber-50 border-amber-300 text-amber-800"
                    : "bg-red-50 border-red-300 text-status-error"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[28px] shrink-0 mt-0.5">
                    {feedback.type === "success"
                      ? "check_circle"
                      : feedback.type === "duplicate"
                      ? "warning"
                      : "cancel"}
                  </span>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-bold uppercase tracking-wider">
                      {feedback.type === "success"
                        ? "Check-In Approved · Access Granted"
                        : feedback.type === "duplicate"
                        ? "Duplicate Warning · Pass Already Used"
                        : "Access Denied · Invalid Pass"}
                    </h3>
                    <p className="text-xs font-medium leading-relaxed">{feedback.message}</p>
                  </div>
                </div>

                {feedback.registration && (
                  <div className="mt-2 p-3.5 rounded-xl bg-white/80 border border-current/20 grid grid-cols-2 gap-2 text-xs text-foreground">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-foreground-muted">Participant</span>
                      <p className="font-bold">{feedback.registration.fullName}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-foreground-muted">Pass Ref</span>
                      <p className="font-mono font-bold text-primary">{feedback.registration.referenceId}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-foreground-muted">Track</span>
                      <p className="truncate">{feedback.registration.track}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-foreground-muted">College</span>
                      <p className="truncate">{feedback.registration.college}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Recent Scans Log (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-border p-6 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">Recent Check-in Stream</h2>
            <span className="text-xs text-foreground-muted">Live terminal feed</span>
          </div>

          <div className="flex flex-col gap-2.5">
            {recentScans.length === 0 ? (
              <div className="py-8 text-center text-xs text-foreground-muted flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-[24px]">sensors</span>
                <p>Waiting for attendee scans...</p>
              </div>
            ) : (
              recentScans.map((scan) => (
                <div
                  key={scan.id}
                  className="p-3 rounded-xl bg-surface-container-low border border-border/70 flex items-center justify-between gap-2"
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">
                        {scan.referenceId}
                      </span>
                      <span className="font-bold text-xs text-foreground">{scan.fullName}</span>
                    </div>
                    <span className="text-[10px] text-foreground-muted truncate max-w-[200px]">
                      {scan.track.split(":")[0]}
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                    Verified
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

