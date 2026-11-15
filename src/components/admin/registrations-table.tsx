"use client";

import { useState } from "react";
import Link from "next/link";
import type { RegistrationRecord } from "@/types";
import { downloadForGoogleSheets, copyForGoogleSheets, type ExportColumn } from "@/lib/sheets-export";

interface RegistrationsTableProps {
  initialRegistrations: RegistrationRecord[];
  eventSlug: string;
}

export function RegistrationsTable({ initialRegistrations, eventSlug }: RegistrationsTableProps) {
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>(initialRegistrations);
  const [search, setSearch] = useState("");
  const [trackFilter, setTrackFilter] = useState("all");
  const [checkInFilter, setCheckInFilter] = useState("all");
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [emailingRef, setEmailingRef] = useState<string | null>(null);

  async function handleEmailPass(reg: RegistrationRecord) {
    setEmailingRef(reg.referenceId);
    try {
      const res = await fetch(`/api/events/${eventSlug}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send-pass", referenceId: reg.referenceId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionFeedback(`Official pass successfully emailed to ${reg.email}!`);
      } else {
        setActionFeedback(data.message || `Failed to email pass to ${reg.email}.`);
      }
    } catch {
      setActionFeedback("Network error emailing pass.");
    } finally {
      setEmailingRef(null);
      setTimeout(() => setActionFeedback(null), 3500);
    }
  }

  const filtered = registrations.filter((r) => {
    const matchesSearch =
      search === "" ||
      r.fullName.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase()) ||
      r.referenceId.toLowerCase().includes(search.toLowerCase()) ||
      r.college.toLowerCase().includes(search.toLowerCase());

    const matchesTrack = trackFilter === "all" || r.track === trackFilter;

    let matchesCheckIn = true;
    if (checkInFilter === "checked-in") {
      matchesCheckIn = Boolean(r.checkedIn || (r.checkedInDays && r.checkedInDays.length > 0));
    } else if (checkInFilter === "not-checked-in" || checkInFilter === "absent") {
      matchesCheckIn = !r.checkedIn && (!r.checkedInDays || r.checkedInDays.length === 0);
    } else if (checkInFilter.startsWith("day-")) {
      const dayNum = parseInt(checkInFilter.replace("day-", ""), 10);
      matchesCheckIn = Boolean(r.checkedInDays?.includes(dayNum) || (dayNum === 1 && r.checkedIn));
    } else if (checkInFilter === "all-days") {
      matchesCheckIn = Boolean(
        r.checkedInDays?.includes(1) &&
        r.checkedInDays?.includes(2) &&
        r.checkedInDays?.includes(3) &&
        r.checkedInDays?.includes(4)
      );
    }

    return matchesSearch && matchesTrack && matchesCheckIn;
  });

  const checkedInCount = registrations.filter((r) => r.checkedIn || (r.checkedInDays && r.checkedInDays.length > 0)).length;
  const fourDayCompleters = registrations.filter(
    (r) =>
      r.checkedInDays?.includes(1) &&
      r.checkedInDays?.includes(2) &&
      r.checkedInDays?.includes(3) &&
      r.checkedInDays?.includes(4)
  ).length;

  const availableTracks = Array.from(
    new Set(registrations.map((r) => r.track).filter(Boolean))
  );

  const exportColumns: ExportColumn<RegistrationRecord>[] = [
    { key: "referenceId", label: "Pass Reference ID" },
    { key: "fullName", label: "Full Name" },
    { key: "email", label: "Email Address" },
    { key: "phone", label: "Phone Number" },
    { key: "college", label: "College Name" },
    { key: "department", label: "Department" },
    { key: "yearOfStudy", label: "Year of Study" },
    { key: "track", label: "Track Selected" },
    { key: "experienceLevel", label: "Experience Level" },
    { key: "portfolioUrl", label: "Portfolio / GitHub" },
    { key: "status", label: "Registration Status" },
    {
      key: "checkedInDays",
      label: "Days Attended Count",
      format: (_, row) => String(row?.checkedInDays?.length ?? (row?.checkedIn ? 1 : 0)),
    },
    {
      key: "checkedInDays",
      label: "Attended Days List",
      format: (_, row) => (row?.checkedInDays?.length ? row.checkedInDays.join(", ") : row?.checkedIn ? "1" : "None"),
    },
    {
      key: "checkIns",
      label: "Day 1 Timestamp",
      format: (_, row) => row?.checkIns?.[1] || (row?.checkedIn ? row.checkedInAt : "") || "—",
    },
    {
      key: "checkIns",
      label: "Day 2 Timestamp",
      format: (_, row) => row?.checkIns?.[2] || "—",
    },
    {
      key: "checkIns",
      label: "Day 3 Timestamp",
      format: (_, row) => row?.checkIns?.[3] || "—",
    },
    {
      key: "checkIns",
      label: "Day 4 Timestamp",
      format: (_, row) => row?.checkIns?.[4] || "—",
    },
    {
      key: "checkedInDays",
      label: "Certification Eligible (>=3 Days)",
      format: (_, row) => ((row?.checkedInDays?.length ?? (row?.checkedIn ? 1 : 0)) >= 3 ? "YES" : "NO"),
    },
    { key: "createdAt", label: "Registered At" },
  ];

  function handleDownloadSheets() {
    downloadForGoogleSheets(
      `gdg_vcet_${eventSlug}_registrations_${new Date().toISOString().slice(0, 10)}`,
      filtered,
      exportColumns
    );
  }

  async function handleCopySheets() {
    const ok = await copyForGoogleSheets(filtered, exportColumns);
    if (ok) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    }
  }

  async function handleToggleCheckIn(reg: RegistrationRecord, day?: number) {
    const existingDays = reg.checkedInDays || (reg.checkedIn ? [1] : []);
    const targetDay = day ?? ([1, 2, 3, 4].find((d) => !existingDays.includes(d)) || 1);

    if (existingDays.includes(targetDay)) {
      setActionFeedback(`${reg.fullName} is already checked in for Day ${targetDay}.`);
      setTimeout(() => setActionFeedback(null), 3000);
      return;
    }

    try {
      const res = await fetch(`/api/events/${eventSlug}/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referenceId: reg.referenceId, day: targetDay }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const updatedDays = Array.from(new Set([...existingDays, targetDay])).sort((a, b) => a - b);
        const updatedCheckIns = {
          ...(reg.checkIns || {}),
          [targetDay]: data.registration?.checkIns?.[targetDay] || new Date().toLocaleString(),
        };

        setRegistrations((prev) =>
          prev.map((item) =>
            item.referenceId === reg.referenceId
              ? data.registration || {
                  ...item,
                  checkedIn: true,
                  checkedInAt: data.registration?.checkedInAt || item.checkedInAt,
                  checkedInDays: updatedDays,
                  checkIns: updatedCheckIns,
                }
              : item
          )
        );
        setActionFeedback(`Checked in ${reg.fullName} for Day ${targetDay}! (${updatedDays.length}/4 days)`);
        setTimeout(() => setActionFeedback(null), 3500);
      } else {
        setActionFeedback(data.message || `Failed to check in attendee for Day ${targetDay}.`);
        setTimeout(() => setActionFeedback(null), 3500);
      }
    } catch {
      setActionFeedback("Error processing check-in.");
      setTimeout(() => setActionFeedback(null), 3500);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toast Feedback */}
      {actionFeedback ? (
        <div className="p-3.5 rounded-xl bg-blue-50 text-blue-900 text-xs font-semibold flex items-center justify-between border border-blue-200 shadow-xs">
          <span>{actionFeedback}</span>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="text-blue-500 hover:text-blue-700"
          >
            ✕
          </button>
        </div>
      ) : null}

      {/* Simplified Filter & Export Toolbar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-border shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, pass ID, college..."
            className="w-full h-11 pl-9 pr-3 rounded-xl border border-border bg-slate-50/50 text-base sm:text-xs text-foreground placeholder:text-foreground-muted/60 focus:bg-white focus:border-primary focus:outline-hidden transition-all"
          />
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>

        {/* Filter Controls & Universal Export to Sheets */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2">
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
            <select
              value={trackFilter}
              onChange={(e) => setTrackFilter(e.target.value)}
              className="h-11 px-3 rounded-xl border border-border bg-slate-50/50 text-base sm:text-xs text-foreground focus:bg-white focus:outline-hidden"
            >
              <option value="all">All Tracks</option>
              {availableTracks.map((trk) => (
                <option key={trk} value={trk}>
                  {trk}
                </option>
              ))}
            </select>

            <select
              value={checkInFilter}
              onChange={(e) => setCheckInFilter(e.target.value)}
              className="h-11 px-3 rounded-xl border border-border bg-slate-50/50 text-base sm:text-xs text-foreground focus:bg-white focus:outline-hidden"
            >
              <option value="all">All Attendance</option>
              <option value="checked-in">Any Day Present</option>
              <option value="day-1">Day 1 Present (Dec 1)</option>
              <option value="day-2">Day 2 Present (Dec 2)</option>
              <option value="day-3">Day 3 Present (Dec 3)</option>
              <option value="day-4">Day 4 Present (Dec 4)</option>
              <option value="all-days">All 4 Days (100% Attendance)</option>
              <option value="not-checked-in">Absent (0 Days)</option>
            </select>
          </div>

          {/* Export to Google Sheets Actions */}
          <div className="inline-flex rounded-xl border border-emerald-300 bg-emerald-50/70 p-0.5 shrink-0 justify-between sm:justify-start">
            <button
              type="button"
              onClick={handleDownloadSheets}
              title="Download UTF-8 CSV formatted for Google Sheets & Excel"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-emerald-800 hover:bg-emerald-100 text-xs font-semibold transition-all cursor-pointer flex-1 sm:flex-initial justify-center"
            >
              <svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Export to Sheets</span>
            </button>

            <button
              type="button"
              onClick={handleCopySheets}
              title="Copy table to clipboard for instant paste (Ctrl+V) into any open Google Spreadsheet"
              className="inline-flex items-center px-2.5 py-2 rounded-lg text-emerald-700 hover:bg-emerald-100 text-xs font-medium border-l border-emerald-200 transition-all cursor-pointer"
            >
              {copySuccess ? (
                <span className="font-bold text-emerald-800">Copied!</span>
              ) : (
                <span>Copy TSV</span>
              )}
            </button>
          </div>

          {/* Email Hub & Broadcast Shortcut */}
          <Link
            href={`/admin/console/events/${eventSlug}/email`}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 text-xs font-bold transition-all shrink-0"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            <span>Email Hub &amp; Broadcast</span>
          </Link>
        </div>
      </div>

      {/* Metrics Counter Strip */}
      <div className="flex flex-wrap items-center justify-between text-xs text-foreground-muted px-1 gap-2">
        <span>
          Showing <strong className="text-foreground">{filtered.length}</strong> of{" "}
          <strong className="text-foreground">{registrations.length}</strong> registered attendees
        </span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block animate-pulse"></span>
            <span>{checkedInCount} Checked In ({Math.round((checkedInCount / (registrations.length || 1)) * 100)}%)</span>
          </span>
          <span className="hidden sm:inline text-border">•</span>
          <span className="font-semibold text-primary">
            {fourDayCompleters} Completed All 4 Days
          </span>
        </div>
      </div>

      {/* High-Density Data Display (Cards on Mobile, Table on Desktop) */}
      <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
        {/* Mobile Attendee Card View */}
        <div className="md:hidden divide-y divide-border/60">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs">
              No attendees match the active filters.
            </div>
          ) : (
            filtered.map((reg) => {
              const attendedDays = reg.checkedInDays || (reg.checkedIn ? [1] : []);
              const nextMissingDay = [1, 2, 3, 4].find((d) => !attendedDays.includes(d));

              return (
                <div key={reg.id} className="p-3.5 flex flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900 text-sm">{reg.fullName}</span>
                      <span className="text-xs text-slate-500 font-mono">{reg.email}</span>
                    </div>
                    <span className="font-mono font-bold text-xs text-slate-800 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                      #{reg.referenceId}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{reg.department} · {reg.yearOfStudy}</span>
                    <span>•</span>
                    <span className="truncate max-w-[200px]">{reg.college}</span>
                  </div>

                  {/* 4-Day Attendance Pills */}
                  <div className="flex items-center justify-between pt-1 border-t border-border/50">
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4].map((d) => {
                        const isAttended = attendedDays.includes(d);
                        const time = reg.checkIns?.[d] || (d === 1 && reg.checkedIn ? reg.checkedInAt : undefined);
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => !isAttended && handleToggleCheckIn(reg, d)}
                            title={isAttended ? `Day ${d}: ${time || "Present"}` : `Check in for Day ${d}`}
                            className={`px-2 py-1 rounded-md text-[11px] font-bold border transition-all cursor-pointer ${
                              isAttended
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-slate-50 text-slate-400 border-slate-200 hover:border-emerald-500 hover:text-emerald-700"
                            }`}
                          >
                            D{d} {isAttended ? "✓" : "+"}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleEmailPass(reg)}
                        disabled={emailingRef === reg.referenceId}
                        title={`Email pass & QR code to ${reg.email}`}
                        className="px-2.5 py-1.5 rounded-lg border border-border text-foreground-muted hover:text-primary hover:border-primary text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1 min-h-[36px]"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                          <polyline points="22,6 12,13 2,6" />
                        </svg>
                        <span>{emailingRef === reg.referenceId ? "Sending…" : "Email Pass"}</span>
                      </button>

                      {nextMissingDay ? (
                        <button
                          type="button"
                          onClick={() => handleToggleCheckIn(reg, nextMissingDay)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer min-h-[36px]"
                        >
                          Admit D{nextMissingDay}
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-200">
                          <svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>4/4 Days</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Data Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-slate-50 text-slate-600 font-bold text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3.5">Ref ID</th>
                <th className="py-2.5 px-3.5">Attendee</th>
                <th className="py-2.5 px-3.5">Academic</th>
                <th className="py-2.5 px-3.5">Track</th>
                <th className="py-2.5 px-3.5 text-center">Status</th>
                <th className="py-2.5 px-3.5 text-center">4-Day Attendance</th>
                <th className="py-2.5 px-3.5 text-right">Quick Admit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No attendees match the active filters.
                  </td>
                </tr>
              ) : (
                filtered.map((reg) => {
                  const attendedDays = reg.checkedInDays || (reg.checkedIn ? [1] : []);
                  const nextMissingDay = [1, 2, 3, 4].find((d) => !attendedDays.includes(d));

                  return (
                    <tr key={reg.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3.5 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {reg.referenceId}
                      </td>

                      <td className="py-2.5 px-3.5">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">{reg.fullName}</span>
                          <span className="text-[11px] text-slate-500 font-mono">{reg.email}</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3.5 max-w-xs">
                        <div className="flex flex-col truncate">
                          <span className="font-medium text-slate-800 text-[11px] truncate">{reg.college}</span>
                          <span className="text-[11px] text-slate-500">{reg.department} · {reg.yearOfStudy}</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-semibold border border-blue-100 inline-block">
                          {reg.track.includes("Track A")
                            ? "Track A (Web/AI)"
                            : reg.track.includes("Track B")
                              ? "Track B (Cloud/GCP)"
                              : reg.track}
                        </span>
                      </td>

                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">
                          {reg.status}
                        </span>
                      </td>

                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {[1, 2, 3, 4].map((d) => {
                            const isAttended = attendedDays.includes(d);
                            const time = reg.checkIns?.[d] || (d === 1 && reg.checkedIn ? reg.checkedInAt : undefined);
                            return (
                              <button
                                key={d}
                                type="button"
                                onClick={() => !isAttended && handleToggleCheckIn(reg, d)}
                                title={isAttended ? `Day ${d}: ${time || "Present"}` : `Click to Check In Day ${d}`}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                                  isAttended
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    : "bg-slate-50 text-slate-400 border-slate-200 hover:border-emerald-500 hover:text-emerald-700"
                                }`}
                              >
                                D{d} {isAttended ? "✓" : "+"}
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
                          <button
                            type="button"
                            onClick={() => handleEmailPass(reg)}
                            disabled={emailingRef === reg.referenceId}
                            title={`Email pass & QR code to ${reg.email}`}
                            className="p-1.5 rounded-lg border border-border bg-slate-50/50 text-foreground-muted hover:text-primary hover:border-primary transition-all cursor-pointer disabled:opacity-50"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                              <polyline points="22,6 12,13 2,6" />
                            </svg>
                          </button>
                          {nextMissingDay ? (
                            <button
                              type="button"
                              onClick={() => handleToggleCheckIn(reg, nextMissingDay)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
                            >
                              Admit Day {nextMissingDay}
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              ✓ All 4 Days
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
