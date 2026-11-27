"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import type { RegistrationRecord } from "@/types";
import { downloadForGoogleSheets, copyForGoogleSheets } from "@/lib/sheets-export";

interface CheckInTerminalProps {
  eventSlug: string;
  initialCheckedInCount: number;
  initialDailyCounts?: Record<number, number>;
  totalDays?: number;
  statusEndpoint?: string;
}

interface CheckInLogEntry {
  time: string;
  day: number;
  name: string;
  ref: string;
  track: string;
  email?: string;
  college?: string;
  totalDaysAttended?: number;
}

const DAY_LABELS: Record<number, { title: string; date: string }> = {
  1: { title: "Day 1: Web Architecture", date: "Dec 1, 2026" },
  2: { title: "Day 2: AI Agents & RAG", date: "Dec 2, 2026" },
  3: { title: "Day 3: Cloud Run CI/CD", date: "Dec 3, 2026" },
  4: { title: "Day 4: Prod Hardening", date: "Dec 4, 2026" },
};

export function CheckInTerminal({
  eventSlug,
  initialCheckedInCount,
  initialDailyCounts,
  totalDays = 4,
  statusEndpoint,
}: CheckInTerminalProps) {
  const [activeDay, setActiveDay] = useState<number>(1);
  const [dailyCounts, setDailyCounts] = useState<Record<number, number>>(() => {
    const counts: Record<number, number> = {};
    for (let i = 1; i <= totalDays; i++) {
      counts[i] = initialDailyCounts?.[i] ?? (i === 1 ? initialCheckedInCount : 0);
    }
    return counts;
  });
  const [refInput, setRefInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkedCount, setCheckedCount] = useState(initialCheckedInCount);
  const [lastResult, setLastResult] = useState<{
    status: "success" | "duplicate" | "error";
    message: string;
    registration?: RegistrationRecord;
    checkedDay?: number;
  } | null>(null);
  const [recentLog, setRecentLog] = useState<CheckInLogEntry[]>([]);
  const [copySuccess, setCopySuccess] = useState(false);

  // Camera QR Scanner State
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const submittingRef = useRef(false);
  const lastScannedRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });

  const resolvedStatusEndpoint =
    statusEndpoint || `/api/events/${eventSlug}/confirmed-attendees`;

  const syncLiveCounts = useCallback(async () => {
    try {
      const res = await fetch(resolvedStatusEndpoint, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.success && data.stats) {
        if (typeof data.stats.checkedInCount === "number") {
          setCheckedCount(data.stats.checkedInCount);
        }
        if (data.stats.dailyCheckedInCounts) {
          setDailyCounts((prev) => {
            const next = { ...prev };
            for (let i = 1; i <= totalDays; i++) {
              next[i] = data.stats.dailyCheckedInCounts[i] ?? 0;
            }
            return next;
          });
        }
      }
    } catch {
      // ignore transient errors
    }
  }, [resolvedStatusEndpoint, totalDays]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void syncLiveCounts();
      }
    }, 2500);

    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        void syncLiveCounts();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(`gdg-confirmed-${eventSlug}`);
      channel.onmessage = () => {
        void syncLiveCounts();
      };
    } catch {
      // ignore
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
      channel?.close();
    };
  }, [eventSlug, syncLiveCounts]);

  const submitCheckIn = useCallback(
    async (rawRef: string) => {
      const normalized = rawRef.trim().replace(/^#/, "").toUpperCase();
      if (!normalized || submittingRef.current) return;

      submittingRef.current = true;
      setSubmitting(true);
      setLastResult(null);

      try {
        const res = await fetch(`/api/events/${eventSlug}/check-in`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ referenceId: normalized, day: activeDay }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          setLastResult({
            status: "success",
            message: data.message,
            registration: data.registration,
            checkedDay: activeDay,
          });
          setCheckedCount((c) => c + 1);
          setDailyCounts((prev) => ({
            ...prev,
            [activeDay]: (prev[activeDay] || 0) + 1,
          }));
          setRecentLog((prev) => [
            {
              time: new Date().toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              }),
              day: activeDay,
              name: data.registration.fullName,
              ref: data.registration.referenceId,
              track: data.registration.track || "General Admission",
              email: data.registration.email,
              college: data.registration.college,
              totalDaysAttended: data.registration.checkedInDays?.length || 1,
            },
            ...prev,
          ]);
          setRefInput("");
          try {
            const ch = new BroadcastChannel(`gdg-confirmed-${eventSlug}`);
            ch.postMessage({ type: "sync", at: Date.now() });
            ch.close();
          } catch {
            // ignore
          }
        } else if (res.status === 409) {
          setLastResult({
            status: "duplicate",
            message: data.message,
            registration: data.registration,
            checkedDay: activeDay,
          });
        } else {
          setLastResult({
            status: "error",
            message: data.message || "Pass reference not found.",
            checkedDay: activeDay,
          });
        }
      } catch {
        setLastResult({
          status: "error",
          message: "Network error during check-in verification.",
          checkedDay: activeDay,
        });
      } finally {
        submittingRef.current = false;
        setSubmitting(false);
      }
    },
    [eventSlug, activeDay]
  );

  function stopCameraStream() {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
  }

  function handleToggleCamera() {
    if (cameraOpen) {
      stopCameraStream();
      setCameraReady(false);
      setCameraOpen(false);
      setCameraError(null);
      return;
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        "Camera access is unavailable in this browser context (requires HTTPS or localhost)."
      );
      return;
    }
    setCameraError(null);
    setCameraReady(false);
    setCameraOpen(true);
  }

  useEffect(() => {
    if (!cameraOpen) return;

    let cancelled = false;
    let rafId = 0;
    let lastDecodeAt = 0;

    async function startScanner() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });

        if (cancelled) {
          for (const t of stream.getTracks()) t.stop();
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
          if (!cancelled) setCameraReady(true);
        }

        const scanFrame = (timestamp: number) => {
          if (cancelled) return;

          if (timestamp - lastDecodeAt >= 150) {
            lastDecodeAt = timestamp;
            const v = videoRef.current;
            const canvas = canvasRef.current;
            if (v && canvas && v.readyState === v.HAVE_ENOUGH_DATA && v.videoWidth > 0) {
              canvas.width = v.videoWidth;
              canvas.height = v.videoHeight;
              const ctx = canvas.getContext("2d", { willReadFrequently: true });
              if (ctx) {
                ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const decoded = jsQR(imgData.data, imgData.width, imgData.height, {
                  inversionAttempts: "dontInvert",
                });
                if (decoded?.data) {
                  const code = decoded.data.trim().replace(/^#/, "").toUpperCase();
                  const now = Date.now();
                  const recentlyScannedSame =
                    lastScannedRef.current.code === code && now - lastScannedRef.current.at < 3000;
                  if (code && !recentlyScannedSame && !submittingRef.current) {
                    lastScannedRef.current = { code, at: now };
                    setRefInput(code);
                    void submitCheckIn(code);
                  }
                }
              }
            }
          }

          rafId = window.requestAnimationFrame(scanFrame);
        };

        rafId = window.requestAnimationFrame(scanFrame);
      } catch (err) {
        if (!cancelled) {
          const msg = (err as Error)?.name === "NotAllowedError"
            ? "Camera permission was denied. Allow camera access or enter the Reference ID manually."
            : "Could not start camera. Make sure a camera is connected and not used by another app.";
          setCameraError(msg);
          setCameraReady(false);
          setCameraOpen(false);
          stopCameraStream();
        }
      }
    }

    void startScanner();

    return () => {
      cancelled = true;
      if (rafId) window.cancelAnimationFrame(rafId);
      stopCameraStream();
    };
  }, [cameraOpen, submitCheckIn]);

  async function handleCheckIn(e: React.FormEvent) {
    e.preventDefault();
    await submitCheckIn(refInput);
  }

  function handleExportAttendanceSheets() {
    if (recentLog.length === 0) {
      alert("No attendance entries in session log yet.");
      return;
    }

    downloadForGoogleSheets(
      `gdg_vcet_${eventSlug}_day${activeDay}_attendance_${new Date().toISOString().slice(0, 10)}`,
      recentLog,
      [
        { key: "day", label: "Day" },
        { key: "time", label: "Check-in Time" },
        { key: "ref", label: "Pass Reference ID" },
        { key: "name", label: "Attendee Name" },
        { key: "track", label: "Track" },
        { key: "email", label: "Email Address" },
        { key: "college", label: "College" },
        { key: "totalDaysAttended", label: "Total Days Attended" },
      ]
    );
  }

  async function handleCopyAttendanceSheets() {
    if (recentLog.length === 0) return;
    const ok = await copyForGoogleSheets(recentLog, [
      { key: "day", label: "Day" },
      { key: "time", label: "Check-in Time" },
      { key: "ref", label: "Pass Reference ID" },
      { key: "name", label: "Attendee Name" },
      { key: "track", label: "Track" },
      { key: "email", label: "Email Address" },
      { key: "college", label: "College" },
      { key: "totalDaysAttended", label: "Total Days Attended" },
    ]);
    if (ok) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* Scanner & Input Column */}
      <div className="lg:col-span-7 flex flex-col gap-4 sm:gap-5">
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-border shadow-xs flex flex-col gap-4 sm:gap-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border">
            <div>
              <h2 className="text-base font-bold text-foreground">
                Live Attendance Scanner
              </h2>
              <p className="text-xs text-foreground-muted mt-0.5">
                Scan attendee badge QR code with camera or enter reference ID for Day {activeDay}.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleCamera}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                  cameraOpen
                    ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                    : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {cameraOpen ? "videocam_off" : "qr_code_scanner"}
                </span>
                <span>{cameraOpen ? "Stop Camera" : "Camera QR Scan"}</span>
              </button>
              <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
                Day {activeDay}: <strong className="text-emerald-900">{dailyCounts[activeDay] || 0}</strong> Checked In
              </div>
            </div>
          </div>

          {/* 4-Day Workshop Selector Tabs */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-bold text-foreground uppercase tracking-wider">
                Active Check-in Day
              </span>
              <span className="text-[11px] sm:text-xs text-foreground-muted whitespace-nowrap">
                Day {activeDay} of {totalDays}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => {
                const isSelected = activeDay === d;
                const count = dailyCounts[d] || 0;
                const info = DAY_LABELS[d] || { title: `Day ${d}`, date: `Day ${d}` };
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setActiveDay(d)}
                    className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary/40"
                        : "bg-surface border-border hover:bg-surface-container-high"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-xs font-bold ${isSelected ? "text-primary" : "text-foreground"}`}>
                        Day {d}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isSelected
                            ? "bg-primary text-white"
                            : count > 0
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-surface-container text-foreground-muted"
                        }`}
                      >
                        {count}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-foreground-muted truncate w-full mt-1">
                      {info.date}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {cameraError ? (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {cameraError}
            </div>
          ) : null}

          {cameraOpen ? (
            <div className="relative overflow-hidden rounded-2xl border border-border bg-slate-950 aspect-[4/3] sm:aspect-video min-h-[250px] sm:min-h-[280px] max-h-80 flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center pb-7">
                <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl border-2 border-white/85 shadow-[0_0_0_9999px_rgba(15,23,42,0.48)]" />
              </div>
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/75 text-white text-[11px] font-medium whitespace-nowrap">
                {cameraReady ? `Scan Day ${activeDay} Pass QR` : "Starting camera…"}
              </div>
            </div>
          ) : null}

          <form onSubmit={handleCheckIn} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="ref-input"
                className="text-[11px] sm:text-xs font-bold text-foreground uppercase tracking-wider flex items-center justify-between gap-2"
              >
                <span>Pass Reference ID</span>
                <span className="text-primary normal-case font-medium whitespace-nowrap">Day {activeDay} Check-in</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  id="ref-input"
                  type="text"
                  value={refInput}
                  onChange={(e) => setRefInput(e.target.value)}
                  placeholder="G-2026-ZTH-001 or L-2026-ZTH-001"
                  disabled={submitting}
                  autoFocus
                  className="w-full sm:flex-1 min-h-12 h-12 px-3.5 rounded-xl border border-border bg-slate-50/50 text-sm font-mono uppercase tracking-wider text-foreground placeholder:text-foreground-muted/60 focus:bg-white focus:border-primary focus:outline-hidden"
                />
                <button
                  type="submit"
                  disabled={submitting || !refInput.trim()}
                  className="h-12 px-5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover active:scale-95 transition-all disabled:opacity-50 cursor-pointer w-full sm:w-auto shrink-0"
                >
                  {submitting ? "Checking..." : `Admit for Day ${activeDay}`}
                </button>
              </div>
            </div>
          </form>

          {/* Instant Verification Status Result */}
          {lastResult ? (
            <div
              className={`p-4 rounded-xl border flex flex-col gap-2.5 ${
                lastResult.status === "success"
                  ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                  : lastResult.status === "duplicate"
                  ? "bg-amber-50/80 border-amber-200 text-amber-900"
                  : "bg-rose-50/80 border-rose-200 text-rose-900"
              }`}
            >
              <div className="flex items-center gap-2">
                {lastResult.status === "success" ? (
                  <svg className="w-5 h-5 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="9 12 11 14 15 10" />
                  </svg>
                ) : lastResult.status === "duplicate" ? (
                  <svg className="w-5 h-5 text-amber-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-rose-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                )}
                <span className="font-bold text-sm">{lastResult.message}</span>
              </div>

              {lastResult.registration ? (
                <>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-current/20 text-xs">
                    <div>
                      <span className="opacity-70">Attendee:</span>{" "}
                      <strong>{lastResult.registration.fullName}</strong>
                    </div>
                    <div>
                      <span className="opacity-70">College:</span>{" "}
                      <strong>{lastResult.registration.college}</strong>
                    </div>
                    <div className="col-span-2">
                      <span className="opacity-70">Track:</span>{" "}
                      <strong className="underline decoration-current/30">{lastResult.registration.track || "General"}</strong>
                    </div>
                  </div>

                  {/* 4-Day Attendance Breakdown */}
                  <div className="pt-2 border-t border-current/20 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[11px] font-medium">
                      <span className="opacity-80">4-Day Workshop Attendance Record:</span>
                      <strong className="font-bold">
                        {lastResult.registration.checkedInDays?.length || 1} / {totalDays} Days Completed
                      </strong>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => {
                        const isAttended = lastResult.registration?.checkedInDays?.includes(d);
                        const isCurrentDay = d === activeDay;
                        const checkInTime = lastResult.registration?.checkIns?.[d];

                        return (
                          <div
                            key={d}
                            className={`px-2 py-1.5 rounded-lg border text-center flex flex-col items-center justify-center ${
                              isAttended
                                ? "bg-emerald-100/90 border-emerald-300 text-emerald-900"
                                : isCurrentDay
                                ? "bg-white/90 border-dashed border-amber-300 text-amber-900"
                                : "bg-black/5 border-dashed border-current/20 text-current/50"
                            }`}
                          >
                            <div className="flex items-center gap-1 font-bold text-xs">
                              <span>Day {d}</span>
                              {isAttended ? (
                                <span className="text-emerald-700 font-black">✓</span>
                              ) : null}
                            </div>
                            <span className="text-[9px] opacity-75 truncate max-w-full">
                              {isAttended ? checkInTime?.split(",")[1]?.trim() || "Attended" : "Pending"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* Live Log Column with Export to Sheets */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Session Check-in Feed ({recentLog.length})
            </h3>

            {/* Export Attendance to Sheets */}
            {recentLog.length > 0 ? (
              <div className="inline-flex rounded-lg border border-emerald-300 bg-emerald-50/70 p-0.5">
                <button
                  type="button"
                  onClick={handleExportAttendanceSheets}
                  title="Download Attendance CSV for Google Sheets"
                  className="px-2 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 rounded cursor-pointer"
                >
                  Sheets (.csv)
                </button>
                <button
                  type="button"
                  onClick={handleCopyAttendanceSheets}
                  title="Copy attendance TSV to clipboard"
                  className="px-1.5 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 rounded border-l border-emerald-200 cursor-pointer"
                >
                  {copySuccess ? "Copied!" : "Copy"}
                </button>
              </div>
            ) : null}
          </div>

          {recentLog.length === 0 ? (
            <p className="text-xs text-foreground-muted py-8 text-center">
              No attendees verified yet in this session.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-border/50 max-h-96 overflow-y-auto">
              {recentLog.map((entry, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold text-[10px]">
                        Day {entry.day}
                      </span>
                      <span className="font-bold text-foreground">{entry.name}</span>
                    </div>
                    <span className="text-[11px] text-foreground-muted font-mono">{entry.ref}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-mono text-emerald-700 font-bold">{entry.time}</span>
                    <span className="text-[10px] text-foreground-muted truncate max-w-[120px]">
                      {(entry.track || "General").split(":")[0]}
                      {entry.totalDaysAttended ? ` · ${entry.totalDaysAttended}/4 d` : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
