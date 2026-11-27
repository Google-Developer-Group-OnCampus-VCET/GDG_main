"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import type { ConfirmedAttendeeRecord } from "@/types";
import {
  downloadForGoogleSheets,
  copyForGoogleSheets,
  type ExportColumn,
} from "@/lib/sheets-export";

const PAGE_SIZE = 50;

interface ConfirmedAttendeesTableProps {
  initialAttendees: ConfirmedAttendeeRecord[];
  eventSlug: string;
  role?: "admin" | "core" | "volunteer" | null;
}

const exportColumns: ExportColumn<ConfirmedAttendeeRecord>[] = [
  { key: "srNo", label: "Sr. No." },
  { key: "registrationId", label: "Confirmed ID" },
  { key: "fullName", label: "Full Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "college", label: "College" },
  { key: "department", label: "Department" },
  { key: "yearOfStudy", label: "Year of Study" },
  { key: "track", label: "Track" },
  { key: "status", label: "Status" },
  {
    key: "checkedInDays",
    label: "Days Attended",
    format: (val) => (Array.isArray(val) ? val.map((d) => `D${d}`).join(", ") : ""),
  },
];

export function ConfirmedAttendeesTable({
  initialAttendees,
  eventSlug,
  role = null,
}: ConfirmedAttendeesTableProps) {
  const [sessionRole, setSessionRole] = useState<"admin" | "core" | "volunteer" | null>(role);
  const [attendees, setAttendees] = useState<ConfirmedAttendeeRecord[]>(initialAttendees);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [attendanceFilter, setAttendanceFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [copySuccess, setCopySuccess] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [editingAttendee, setEditingAttendee] = useState<ConfirmedAttendeeRecord | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    college: "",
    department: "",
    yearOfStudy: "",
    track: "",
    checkedInDays: [] as number[],
  });

  useEffect(() => {
    if (!role) {
      fetch("/api/admin/session")
        .then((res) => res.json())
        .then((data) => {
          if (data?.authenticated && data?.role) {
            setSessionRole(data.role);
          }
        })
        .catch(() => {});
    }
  }, [role]);

  const notifySync = useCallback(() => {
    try {
      const ch = new BroadcastChannel(`gdg-confirmed-${eventSlug}`);
      ch.postMessage({ type: "sync", at: Date.now() });
      ch.close();
    } catch {
      // BroadcastChannel not supported
    }
  }, [eventSlug]);

  const lastVersionRef = useRef<number>(0);

  const fetchLatestAttendees = useCallback(async (force = false) => {
    if (editingAttendee || mutatingId) return;
    try {
      const qs = !force && lastVersionRef.current > 0 ? `?version=${lastVersionRef.current}` : "";
      const res = await fetch(`/api/events/${eventSlug}/confirmed-attendees${qs}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.unchanged) return;
      if (typeof data?.version === "number") {
        lastVersionRef.current = data.version;
      }
      if (data?.success && Array.isArray(data.attendees) && data.attendees.length > 0) {
        setAttendees(data.attendees);
      }
    } catch {
      // ignore transient network errors
    }
  }, [eventSlug, editingAttendee, mutatingId]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchLatestAttendees(false);
      }
    }, 5000);

    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        void fetchLatestAttendees(false);
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(`gdg-confirmed-${eventSlug}`);
      channel.onmessage = () => {
        void fetchLatestAttendees(true);
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
  }, [eventSlug, fetchLatestAttendees]);

  function showFeedback(msg: string) {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3500);
  }

  const sources = useMemo(
    () =>
      Array.from(
        new Set(attendees.map((a) => a.confirmationSource).filter(Boolean))
      ).sort(),
    [attendees]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return attendees.filter((a) => {
      if (sourceFilter !== "all" && a.confirmationSource !== sourceFilter) return false;

      const attendedDays = a.checkedInDays || (a.checkedIn ? [1] : []);
      if (attendanceFilter === "checked_in" && attendedDays.length === 0) return false;
      if (attendanceFilter === "not_checked_in" && attendedDays.length > 0) return false;
      if (attendanceFilter === "completed_4" && attendedDays.length < 4) return false;

      if (!q) return true;
      return (
        a.registrationId.toLowerCase().includes(q) ||
        a.fullName.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.phone.toLowerCase().includes(q) ||
        a.college.toLowerCase().includes(q) ||
        a.department.toLowerCase().includes(q)
      );
    });
  }, [attendees, search, sourceFilter, attendanceFilter]);

  const activeAttendees = useMemo(
    () => attendees.filter((a) => (a.status || "confirmed") !== "cancelled"),
    [attendees]
  );

  const checkedInCount = useMemo(
    () =>
      activeAttendees.filter(
        (a) => (a.checkedInDays && a.checkedInDays.length > 0) || a.checkedIn
      ).length,
    [activeAttendees]
  );

  const fourDayCompleters = useMemo(
    () =>
      activeAttendees.filter((a) => (a.checkedInDays?.length || 0) >= 4).length,
    [activeAttendees]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  async function handleToggleCheckIn(attendee: ConfirmedAttendeeRecord, day: number) {
    setMutatingId(attendee.registrationId);
    try {
      const res = await fetch(`/api/events/${eventSlug}/confirmed-attendees/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: attendee.registrationId, day }),
      });
      const data = await res.json();
      if (res.ok && data.attendee) {
        setAttendees((prev) =>
          prev.map((item) =>
            item.registrationId === attendee.registrationId ? data.attendee : item
          )
        );
        notifySync();
        showFeedback(`Checked in ${attendee.fullName} for Day ${day}!`);
      } else {
        showFeedback(data.message || `Failed to check in for Day ${day}.`);
      }
    } catch {
      showFeedback("Error updating check-in.");
    } finally {
      setMutatingId(null);
    }
  }

  async function handleRevokeCheckIn(attendee: ConfirmedAttendeeRecord, day: number) {
    setMutatingId(attendee.registrationId);
    try {
      const res = await fetch(`/api/events/${eventSlug}/confirmed-attendees/check-in`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: attendee.registrationId, day }),
      });
      const data = await res.json();
      if (res.ok && data.attendee) {
        setAttendees((prev) =>
          prev.map((item) =>
            item.registrationId === attendee.registrationId ? data.attendee : item
          )
        );
        notifySync();
        showFeedback(`Removed Day ${day} check-in for ${attendee.fullName}.`);
      } else {
        showFeedback(data.message || `Failed to undo Day ${day} check-in.`);
      }
    } catch {
      showFeedback("Error revoking check-in.");
    } finally {
      setMutatingId(null);
    }
  }

  async function handleCancelAttendee(attendee: ConfirmedAttendeeRecord) {
    if (!window.confirm(`Cancel confirmed seat for ${attendee.fullName} (${attendee.registrationId})?`)) {
      return;
    }
    setMutatingId(attendee.registrationId);
    try {
      const res = await fetch(
        `/api/events/${eventSlug}/confirmed-attendees/${encodeURIComponent(attendee.registrationId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "cancelled" }),
        }
      );
      const data = await res.json();
      if (res.ok && data.attendee) {
        setAttendees((prev) =>
          prev.map((item) =>
            item.registrationId === attendee.registrationId ? data.attendee : item
          )
        );
        showFeedback(`Cancelled ${attendee.fullName}.`);
      } else {
        showFeedback(data.message || "Failed to cancel attendee.");
      }
    } catch {
      showFeedback("Error cancelling attendee.");
    } finally {
      setMutatingId(null);
    }
  }

  async function handleDeleteAttendee(attendee: ConfirmedAttendeeRecord) {
    if (!window.confirm(`Permanently delete ${attendee.fullName} (${attendee.registrationId})?`)) {
      return;
    }
    setMutatingId(attendee.registrationId);
    try {
      const res = await fetch(
        `/api/events/${eventSlug}/confirmed-attendees/${encodeURIComponent(attendee.registrationId)}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setAttendees((prev) =>
          prev.filter((item) => item.registrationId !== attendee.registrationId)
        );
        showFeedback(`Deleted ${attendee.fullName}.`);
      } else {
        const data = await res.json().catch(() => ({}));
        showFeedback(data.message || "Failed to delete attendee.");
      }
    } catch {
      showFeedback("Error deleting attendee.");
    } finally {
      setMutatingId(null);
    }
  }

  function openEditModal(attendee: ConfirmedAttendeeRecord) {
    setEditingAttendee(attendee);
    setEditForm({
      fullName: attendee.fullName,
      email: attendee.email,
      phone: attendee.phone,
      college: attendee.college,
      department: attendee.department,
      yearOfStudy: attendee.yearOfStudy,
      track: attendee.track,
      checkedInDays: attendee.checkedInDays || (attendee.checkedIn ? [1] : []),
    });
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingAttendee) return;
    setMutatingId(editingAttendee.registrationId);
    try {
      const res = await fetch(
        `/api/events/${eventSlug}/confirmed-attendees/${encodeURIComponent(editingAttendee.registrationId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editForm),
        }
      );
      const data = await res.json();
      if (res.ok && data.attendee) {
        setAttendees((prev) =>
          prev.map((item) =>
            item.registrationId === editingAttendee.registrationId ? data.attendee : item
          )
        );
        setEditingAttendee(null);
        notifySync();
        showFeedback(`Updated ${data.attendee.fullName}.`);
      } else {
        showFeedback(data.message || "Failed to update attendee.");
      }
    } catch {
      showFeedback("Error updating attendee.");
    } finally {
      setMutatingId(null);
    }
  }

  function handleExportCsv() {
    downloadForGoogleSheets(
      `gdg_vcet_${eventSlug}_confirmed_attendees_${new Date().toISOString().slice(0, 10)}`,
      filtered,
      exportColumns
    );
  }

  async function handleCopyTsv() {
    const ok = await copyForGoogleSheets(filtered, exportColumns);
    if (ok) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Feedback Banner */}
      {actionFeedback ? (
        <div className="px-4 py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold flex items-center justify-between">
          <span>{actionFeedback}</span>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="text-blue-600 hover:text-blue-900 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      ) : null}

      {/* Filter & Export Toolbar */}
      <div className="bg-white border border-border rounded-2xl p-4 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <svg
              className="w-4 h-4 text-foreground-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search ID, name, email, college..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-surface-container-low/50 text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-primary focus:bg-white transition-all"
            />
          </div>

          <select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by source"
            className="px-3 py-2 rounded-xl border border-border bg-white text-xs font-medium text-foreground focus:outline-none focus:border-primary"
          >
            <option value="all">All Sources ({attendees.length})</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={attendanceFilter}
            onChange={(e) => {
              setAttendanceFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by attendance"
            className="px-3 py-2 rounded-xl border border-border bg-white text-xs font-medium text-foreground focus:outline-none focus:border-primary"
          >
            <option value="all">All Attendance</option>
            <option value="checked_in">Checked In (1+ Days)</option>
            <option value="not_checked_in">Not Checked In</option>
            <option value="completed_4">Completed All 4 Days</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-800 text-xs font-semibold transition-colors cursor-pointer"
          >
            <span>↓ Export to Sheets</span>
          </button>
          <button
            type="button"
            onClick={handleCopyTsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-white hover:bg-surface-container text-foreground text-xs font-semibold transition-colors cursor-pointer"
          >
            <span>{copySuccess ? "✓ Copied TSV" : "Copy TSV"}</span>
          </button>
        </div>
      </div>

      {/* Summary & Live Attendance Counters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 text-xs text-foreground-muted">
        <div>
          Showing <strong className="text-foreground">{filtered.length}</strong> of{" "}
          <strong className="text-foreground">{attendees.length}</strong>{" "}
          confirmed participants
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block animate-pulse" />
            <span>
              {checkedInCount} Checked In (
              {Math.round((checkedInCount / (activeAttendees.length || 1)) * 100)}
              %)
            </span>
          </span>
          <span className="hidden sm:inline text-border">•</span>
          <span className="font-semibold text-primary">
            {fourDayCompleters} Completed All 4 Days
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-border rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-container-low/60 text-[11px] font-bold uppercase tracking-wider text-foreground-muted">
                <th className="py-3 pl-4 pr-2 w-10">#</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Ref ID</th>
                <th className="py-3 px-3.5">Attendee</th>
                <th className="py-3 px-3.5">Academic</th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap">4-Day Attendance</th>
                <th className="py-3 px-3.5 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70 text-xs">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-foreground-muted">
                    No confirmed participants match your current filters.
                  </td>
                </tr>
              ) : (
                paginated.map((attendee) => {
                  const attendedDays =
                    attendee.checkedInDays || (attendee.checkedIn ? [1] : []);
                  const nextMissingDay = [1, 2, 3, 4].find(
                    (d) => !attendedDays.includes(d)
                  );
                  const status = attendee.status || "confirmed";
                  const isBusy = mutatingId === attendee.registrationId;

                  return (
                    <tr
                      key={attendee.id}
                      className="hover:bg-surface-container-low/40 transition-colors"
                    >
                      <td className="py-2.5 pl-4 pr-2 text-foreground-muted font-medium tabular-nums">
                        {attendee.srNo}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {attendee.registrationId}
                      </td>
                      <td className="py-2.5 px-3.5 min-w-[190px]">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">
                            {attendee.fullName}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {attendee.email}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 max-w-xs min-w-[180px]">
                        <div className="flex flex-col truncate">
                          <span className="font-medium text-slate-800 text-[11px] truncate">
                            {attendee.college || "—"}
                          </span>
                          <span className="text-[11px] text-slate-500 truncate">
                            {[attendee.department, attendee.yearOfStudy]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {[1, 2, 3, 4].map((d) => {
                            const isAttended = attendedDays.includes(d);
                            const time = attendee.checkIns?.[d];
                            return (
                              <button
                                key={d}
                                type="button"
                                disabled={isBusy}
                                onClick={() => {
                                  if (sessionRole === "core") return;
                                  if (isAttended && sessionRole === "admin") {
                                    void handleRevokeCheckIn(attendee, d);
                                  } else if (!isAttended) {
                                    void handleToggleCheckIn(attendee, d);
                                  }
                                }}
                                title={
                                  isAttended
                                    ? sessionRole === "admin"
                                      ? `Day ${d}: ${time || "Present"} (Click to undo)`
                                      : `Day ${d}: ${time || "Present"}`
                                    : sessionRole === "core"
                                      ? `Day ${d}: Absent`
                                      : `Click to Check In Day ${d}`
                                }
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-all ${
                                  isAttended
                                    ? `bg-emerald-50 text-emerald-800 border-emerald-200 ${
                                        sessionRole === "admin"
                                          ? "hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 cursor-pointer"
                                          : ""
                                      }`
                                    : sessionRole === "core"
                                      ? "bg-slate-50 text-slate-300 border-slate-200 cursor-default"
                                      : "bg-slate-50 text-slate-400 border-slate-200 hover:border-emerald-500 hover:text-emerald-700 cursor-pointer"
                                }`}
                              >
                                D{d}{" "}
                                {isAttended
                                  ? "✓"
                                  : sessionRole === "core"
                                    ? "—"
                                    : "+"}
                              </button>
                            );
                          })}
                          <span className="text-[10px] text-foreground-muted ml-1 font-mono">
                            ({attendedDays.length}/4)
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={`mailto:${attendee.email}`}
                            title={`Email ${attendee.email}`}
                            className="p-1.5 rounded-lg border border-border bg-slate-50/50 text-foreground-muted hover:text-primary hover:border-primary transition-all"
                          >
                            <svg
                              className="w-3.5 h-3.5"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                              <polyline points="22,6 12,13 2,6" />
                            </svg>
                          </a>

                          {sessionRole === "admin" ? (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditModal(attendee)}
                                disabled={isBusy}
                                title={`Edit attendee ${attendee.fullName}`}
                                className="px-2 py-1 rounded-lg border border-border bg-white text-slate-600 hover:text-primary hover:border-primary text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                              >
                                Edit
                              </button>
                              {status === "confirmed" ? (
                                <button
                                  type="button"
                                  onClick={() => handleCancelAttendee(attendee)}
                                  disabled={isBusy}
                                  title="Cancel seat"
                                  className="px-2 py-1 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-[11px] font-semibold hover:bg-amber-100 cursor-pointer disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => handleDeleteAttendee(attendee)}
                                disabled={isBusy}
                                title="Delete permanently"
                                className="px-2 py-1 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-[11px] font-semibold hover:bg-rose-100 cursor-pointer disabled:opacity-50"
                              >
                                Del
                              </button>
                            </>
                          ) : null}

                          {sessionRole === "core" ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold text-slate-400 bg-slate-100">
                              Read-Only
                            </span>
                          ) : status === "confirmed" ? (
                            nextMissingDay ? (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() =>
                                  handleToggleCheckIn(attendee, nextMissingDay)
                                }
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                              >
                                Admit Day {nextMissingDay}
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                ✓ All 4 Days
                              </span>
                            )
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 ? (
          <div className="border-t border-border bg-surface-container-low/40 px-4 py-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-3 py-1.5 rounded-lg border border-border bg-white text-xs font-semibold text-foreground hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              ← Previous
            </button>
            <span className="text-xs text-foreground-muted">
              Page <strong className="text-foreground">{currentPage}</strong> of{" "}
              <strong className="text-foreground">{totalPages}</strong> · Showing{" "}
              {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, filtered.length)} of{" "}
              {filtered.length}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-border bg-white text-xs font-semibold text-foreground hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Next →
            </button>
          </div>
        ) : null}
      </div>

      {/* Edit Modal */}
      {editingAttendee ? (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-border shadow-xl max-w-md w-full p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Edit Confirmed Attendee
                </h2>
                <p className="text-xs font-mono text-foreground-muted">
                  {editingAttendee.registrationId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingAttendee(null)}
                className="text-foreground-muted hover:text-foreground text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="flex flex-col gap-3 text-xs">
              <label className="flex flex-col gap-1">
                <span className="font-semibold text-foreground">Full Name</span>
                <input
                  type="text"
                  required
                  value={editForm.fullName}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, fullName: e.target.value }))
                  }
                  className="px-3 py-2 rounded-xl border border-border"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-semibold text-foreground">Email</span>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, email: e.target.value }))
                  }
                  className="px-3 py-2 rounded-xl border border-border"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-semibold text-foreground">Phone</span>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  className="px-3 py-2 rounded-xl border border-border"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-semibold text-foreground">College</span>
                <input
                  type="text"
                  value={editForm.college}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, college: e.target.value }))
                  }
                  className="px-3 py-2 rounded-xl border border-border"
                />
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <label className="flex flex-col gap-1">
                  <span className="font-semibold text-foreground">Department</span>
                  <input
                    type="text"
                    value={editForm.department}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, department: e.target.value }))
                    }
                    className="px-3 py-2 rounded-xl border border-border"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-semibold text-foreground">Year</span>
                  <input
                    type="text"
                    value={editForm.yearOfStudy}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, yearOfStudy: e.target.value }))
                    }
                    className="px-3 py-2 rounded-xl border border-border"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1">
                <span className="font-semibold text-foreground">Track</span>
                <input
                  type="text"
                  value={editForm.track}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, track: e.target.value }))
                  }
                  className="px-3 py-2 rounded-xl border border-border"
                />
              </label>

              <div className="flex flex-col gap-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">
                    4-Day Attendance ({editForm.checkedInDays.length}/4)
                  </span>
                  {editForm.checkedInDays.length > 0 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setEditForm((f) => ({ ...f, checkedInDays: [] }))
                      }
                      className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
                    >
                      Reset All Days
                    </button>
                  ) : null}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((d) => {
                    const active = editForm.checkedInDays.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() =>
                          setEditForm((f) => ({
                            ...f,
                            checkedInDays: active
                              ? f.checkedInDays.filter((x) => x !== d)
                              : [...f.checkedInDays, d].sort((a, b) => a - b),
                          }))
                        }
                        className={`py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          active
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                            : "bg-slate-50 text-slate-500 border-border hover:border-slate-300"
                        }`}
                      >
                        Day {d} {active ? "✓" : "—"}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setEditingAttendee(null)}
                  className="px-3.5 py-2 rounded-xl border border-border text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={mutatingId === editingAttendee.registrationId}
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
