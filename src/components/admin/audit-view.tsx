"use client";

import { useMemo, useState } from "react";
import type { AuditAction, AuditActorRole, AuditLogEntry } from "@/types";

interface AuditViewProps {
  slug: string;
  eventTitle: string;
  initialLogs: AuditLogEntry[];
}

const ACTION_CONFIG: Record<
  AuditAction,
  { label: string; icon: string; bg: string; text: string; border: string }
> = {
  ATTENDEE_CHECK_IN: {
    label: "Check-in Admitted",
    icon: "✅",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
  },
  CHECK_IN_DUPLICATE_BLOCKED: {
    label: "Duplicate Scan Blocked",
    icon: "⚠️",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
  },
  CHECK_IN_REVOKED: {
    label: "Check-in Undone",
    icon: "↩️",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
  },
  AUTH_LOGIN: {
    label: "Admin Login",
    icon: "🔐",
    bg: "bg-blue-50",
    text: "text-blue-800",
    border: "border-blue-200",
  },
  AUTH_LOGIN_FAILED: {
    label: "Failed Login Attempt",
    icon: "🚫",
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-200",
  },
  EVENT_UPDATE: {
    label: "Settings Updated",
    icon: "⚙️",
    bg: "bg-purple-50",
    text: "text-purple-800",
    border: "border-purple-200",
  },
  EVENT_CREATE: {
    label: "Event Created",
    icon: "✨",
    bg: "bg-indigo-50",
    text: "text-indigo-800",
    border: "border-indigo-200",
  },
  EVENT_DELETED: {
    label: "Event Deleted",
    icon: "🗑️",
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-200",
  },
  EMAIL_BROADCAST: {
    label: "Email Broadcast",
    icon: "📢",
    bg: "bg-sky-50",
    text: "text-sky-800",
    border: "border-sky-200",
  },
  SPEAKER_CONFIRMATION_SENT: {
    label: "Speaker Mail Sent",
    icon: "🎤",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
  },
  REGISTRATION_CANCELLED: {
    label: "Pass Revoked / Cancelled",
    icon: "🚫",
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-200",
  },
  REGISTRATION_CREATED: {
    label: "Walk-in / Admin Pass Added",
    icon: "🎫",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
  },
  REGISTRATION_APPROVED: {
    label: "Application Approved",
    icon: "✅",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
  },
  REGISTRATION_DECLINED: {
    label: "Application Declined",
    icon: "❌",
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-200",
  },
  REGISTRATION_UPDATED: {
    label: "Attendee Updated",
    icon: "✏️",
    bg: "bg-sky-50",
    text: "text-sky-800",
    border: "border-sky-200",
  },
  SITE_SETTINGS_UPDATED: {
    label: "Site CMS Updated",
    icon: "🌐",
    bg: "bg-indigo-50",
    text: "text-indigo-800",
    border: "border-indigo-200",
  },
};

const ROLE_BADGES: Record<
  AuditActorRole,
  { label: string; bg: string; text: string; border: string }
> = {
  admin: {
    label: "👑 Master Admin",
    bg: "bg-blue-50",
    text: "text-blue-800",
    border: "border-blue-200",
  },
  core: {
    label: "🛡️ Core Member",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
  },
  volunteer: {
    label: "📷 Volunteer Desk",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
  },
  system: {
    label: "⚙️ System Engine",
    bg: "bg-zinc-50",
    text: "text-zinc-700",
    border: "border-zinc-200",
  },
};

function formatIstTime(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return d.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    return isoStr;
  }
}

export function AuditView({ slug, eventTitle, initialLogs }: AuditViewProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>(initialLogs);
  const [loading, setLoading] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const availableRoles = useMemo<AuditActorRole[]>(() => {
    return Array.from(
      new Set(
        logs
          .map((l) => l.actorRole)
          .filter((r): r is AuditActorRole => Boolean(r))
      )
    ).sort();
  }, [logs]);

  const isFiltered =
    searchQuery.trim() !== "" ||
    selectedAction !== "all" ||
    selectedRole !== "all";

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedAction("all");
    setSelectedRole("all");
  };

  async function refreshLogs() {
    setLoading(true);
    try {
      const url = new URL("/api/admin/audit-logs", window.location.origin);
      if (slug) url.searchParams.set("eventSlug", slug);
      if (selectedAction !== "all") url.searchParams.set("action", selectedAction);
      url.searchParams.set("limit", "150");

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.logs)) {
          setLogs(data.logs);
        }
      }
    } catch (err) {
      console.warn("Failed to refresh audit logs:", err);
    } finally {
      setLoading(false);
    }
  }

  // Filter logs locally by search query, action, and operator role
  const filteredLogs = logs.filter((log) => {
    if (selectedAction !== "all" && log.action !== selectedAction) {
      return false;
    }
    if (selectedRole !== "all" && log.actorRole !== selectedRole) {
      return false;
    }
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const detailsStr = JSON.stringify(log.details || {}).toLowerCase();
    const identifier = (log.actorIdentifier || "").toLowerCase();
    const ip = (log.ipAddress || "").toLowerCase();

    return (
      log.action.toLowerCase().includes(query) ||
      identifier.includes(query) ||
      ip.includes(query) ||
      detailsStr.includes(query)
    );
  });

  const checkInCount = logs.filter(
    (l) => l.action === "ATTENDEE_CHECK_IN" || l.action === "CHECK_IN_DUPLICATE_BLOCKED"
  ).length;
  const loginCount = logs.filter((l) => l.action.startsWith("AUTH_LOGIN")).length;
  const eventUpdateCount = logs.filter(
    (l) => l.action === "EVENT_UPDATE" || l.action === "EVENT_CREATE"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header and Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Audit &amp; Accountability
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Security &amp; Operations Audit Trail
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Real-time immutable log of admin logins, operator check-ins, broadcasts, and setting updates for{" "}
            <span className="font-semibold text-slate-900">{eventTitle}</span>.
          </p>
        </div>

        <button
          onClick={refreshLogs}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
        >
          <svg
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 21h5v-5" />
          </svg>
          <span>{loading ? "Refreshing..." : "Refresh Audit Feed"}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-2">
            <span>Total Logged Events</span>
            <span className="text-base">📋</span>
          </div>
          <div className="text-2xl font-black text-slate-900">{logs.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Immutable Firestore &amp; SQLite trail</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-2">
            <span>Check-in Operations</span>
            <span className="text-base">📷</span>
          </div>
          <div className="text-2xl font-black text-emerald-600">{checkInCount}</div>
          <div className="text-[11px] text-emerald-700 mt-1">Verified desk scans &amp; admits</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-2">
            <span>Authentication Events</span>
            <span className="text-base">🔐</span>
          </div>
          <div className="text-2xl font-black text-blue-600">{loginCount}</div>
          <div className="text-[11px] text-blue-700 mt-1">Master, Core &amp; Volunteer logins</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-2">
            <span>Config &amp; Broadcasts</span>
            <span className="text-base">⚙️</span>
          </div>
          <div className="text-2xl font-black text-purple-600">{eventUpdateCount}</div>
          <div className="text-[11px] text-purple-700 mt-1">Administrative modifications</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by attendee name, email, pass ID, IP, or operator..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
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
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              aria-label="Filter by operator role"
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="all">All Operator Roles</option>
              {availableRoles.map((r) => (
                <option key={r} value={r}>
                  {r === "admin"
                    ? "Master Admin"
                    : r === "core"
                    ? "Core Member"
                    : r === "volunteer"
                    ? "Volunteer Desk"
                    : r}
                </option>
              ))}
            </select>

            {isFiltered && (
              <button
                type="button"
                onClick={resetFilters}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                Reset Filters
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 font-medium whitespace-nowrap self-center">
            Showing <span className="font-bold text-slate-900">{filteredLogs.length}</span> of{" "}
            {logs.length} events
          </div>
        </div>

        {/* Action Category Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          {[
            { id: "all", label: "All Activity" },
            { id: "ATTENDEE_CHECK_IN", label: "Check-ins" },
            { id: "CHECK_IN_DUPLICATE_BLOCKED", label: "Duplicate Blocks" },
            { id: "AUTH_LOGIN", label: "Admin Sign-ins" },
            { id: "EVENT_UPDATE", label: "Event Updates" },
            { id: "EMAIL_BROADCAST", label: "Broadcasts" },
            { id: "SPEAKER_CONFIRMATION_SENT", label: "Speaker Mails" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedAction(cat.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedAction === cat.id
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <span className="text-3xl">🔍</span>
            <p className="mt-2 text-sm font-semibold text-slate-800">No audit events match your filter</p>
            <p className="text-xs text-slate-400 mt-1">
              New actions (logins, check-ins, registrations) will appear here instantly.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 sm:px-6">Timestamp (IST)</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Operator Role</th>
                  <th className="py-3 px-4">Identity / Target</th>
                  <th className="py-3 px-4">Network IP</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredLogs.map((log) => {
                  const cfg =
                    ACTION_CONFIG[log.action] || {
                      label: log.action,
                      icon: "📌",
                      bg: "bg-slate-50",
                      text: "text-slate-700",
                      border: "border-slate-200",
                    };
                  const roleCfg =
                    ROLE_BADGES[log.actorRole] || {
                      label: log.actorRole,
                      bg: "bg-slate-50",
                      text: "text-slate-700",
                      border: "border-slate-200",
                    };
                  const isExpanded = expandedLogId === log.id;

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    >
                      {/* Timestamp */}
                      <td className="py-3.5 px-4 sm:px-6 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {formatIstTime(log.timestamp)}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                        >
                          <span>{cfg.icon}</span>
                          <span>{cfg.label}</span>
                        </span>
                      </td>

                      {/* Operator Role */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${roleCfg.bg} ${roleCfg.text} ${roleCfg.border}`}
                        >
                          {roleCfg.label}
                        </span>
                      </td>

                      {/* Target Identity */}
                      <td className="py-3.5 px-4 font-medium text-slate-900 max-w-[220px] truncate">
                        {log.details?.attendeeName ? (
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 truncate">
                              {String(log.details.attendeeName)}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500 truncate">
                              {String(log.details.referenceId || log.details.attendeeEmail || "")}
                            </span>
                          </div>
                        ) : log.actorIdentifier ? (
                          <span className="font-mono text-slate-800">{log.actorIdentifier}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Network IP */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {log.ipAddress || "127.0.0.1"}
                      </td>

                      {/* Details Toggle */}
                      <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                        <button
                          type="button"
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2"
                        >
                          {isExpanded ? "Hide Details" : "View Data"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Expanded Details Modal / Drawer if an item is selected */}
      {expandedLogId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          {(() => {
            const current = logs.find((l) => l.id === expandedLogId);
            if (!current) return null;
            const cfg = ACTION_CONFIG[current.action] || {
              label: current.action,
              icon: "📌",
              bg: "bg-slate-50",
              text: "text-slate-700",
              border: "border-slate-200",
            };

            return (
              <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{cfg.icon}</span>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                        {cfg.label}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {formatIstTime(current.timestamp)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setExpandedLogId(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Action</span>
                      <span className="font-mono font-semibold text-slate-900">{current.action}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Operator Role</span>
                      <span className="font-semibold text-slate-900">{current.actorRole}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Client IP</span>
                      <span className="font-mono text-slate-900">{current.ipAddress || "127.0.0.1"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Event Target</span>
                      <span className="font-mono text-slate-900">{current.eventSlug || "dev-to-cloud"}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px] font-bold uppercase tracking-wider mb-1">
                      Event Payload &amp; Metadata
                    </span>
                    <pre className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto max-h-60 leading-relaxed">
                      {JSON.stringify(current.details || {}, null, 2)}
                    </pre>
                  </div>
                </div>

                <div className="mt-5 text-right">
                  <button
                    onClick={() => setExpandedLogId(null)}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      ) : null}
    </div>
  );
}
