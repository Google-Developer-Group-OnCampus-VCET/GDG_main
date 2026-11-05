"use client";

import { useState } from "react";
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

  const filtered = registrations.filter((r) => {
    const matchesSearch =
      search === "" ||
      r.fullName.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase()) ||
      r.referenceId.toLowerCase().includes(search.toLowerCase()) ||
      r.college.toLowerCase().includes(search.toLowerCase());

    const matchesTrack = trackFilter === "all" || r.track === trackFilter;

    const matchesCheckIn =
      checkInFilter === "all" ||
      (checkInFilter === "checked-in" && r.checkedIn) ||
      (checkInFilter === "not-checked-in" && !r.checkedIn);

    return matchesSearch && matchesTrack && matchesCheckIn;
  });

  const checkedInCount = registrations.filter((r) => r.checkedIn).length;

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
      key: "checkedIn",
      label: "Attendance",
      format: (val) => (val ? "CHECKED_IN" : "ABSENT"),
    },
    { key: "checkedInAt", label: "Check-in Timestamp" },
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

  async function handleToggleCheckIn(reg: RegistrationRecord) {
    if (reg.checkedIn) {
      setActionFeedback(`${reg.fullName} is already checked in.`);
      setTimeout(() => setActionFeedback(null), 3000);
      return;
    }

    try {
      const res = await fetch(`/api/events/${eventSlug}/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referenceId: reg.referenceId }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setRegistrations((prev) =>
          prev.map((item) =>
            item.referenceId === reg.referenceId
              ? { ...item, checkedIn: true, checkedInAt: data.registration?.checkedInAt }
              : item
          )
        );
        setActionFeedback(`Checked in ${reg.fullName} (#${reg.referenceId})`);
        setTimeout(() => setActionFeedback(null), 3500);
      } else {
        setActionFeedback(data.message || "Failed to check in attendee.");
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
      <div className="bg-white p-4 rounded-2xl border border-border shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, pass ID, college..."
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-border bg-slate-50/50 text-xs text-foreground placeholder:text-foreground-muted/60 focus:bg-white focus:border-primary focus:outline-hidden transition-all"
          />
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none"
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
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={trackFilter}
            onChange={(e) => setTrackFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-border bg-slate-50/50 text-xs text-foreground focus:bg-white focus:outline-hidden"
          >
            <option value="all">All Tracks</option>
            <option value="Track A: Modern Web & Gemini AI">Track A: Web &amp; AI</option>
            <option value="Track B: Cloud Architecture & GCP">Track B: Cloud &amp; GCP</option>
          </select>

          <select
            value={checkInFilter}
            onChange={(e) => setCheckInFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-border bg-slate-50/50 text-xs text-foreground focus:bg-white focus:outline-hidden"
          >
            <option value="all">All Status</option>
            <option value="checked-in">Checked In Only</option>
            <option value="not-checked-in">Pending Check-in</option>
          </select>

          {/* Export to Google Sheets Actions */}
          <div className="inline-flex rounded-xl border border-emerald-300 bg-emerald-50/70 p-0.5 shrink-0">
            <button
              type="button"
              onClick={handleDownloadSheets}
              title="Download UTF-8 CSV formatted for Google Sheets & Excel"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-emerald-800 hover:bg-emerald-100 text-xs font-semibold transition-all cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Export to Sheets (.csv)</span>
            </button>

            <button
              type="button"
              onClick={handleCopySheets}
              title="Copy table to clipboard for instant paste (Ctrl+V) into any open Google Spreadsheet"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-emerald-700 hover:bg-emerald-100 text-xs font-medium border-l border-emerald-200 transition-all cursor-pointer"
            >
              {copySuccess ? (
                <span className="font-bold text-emerald-800">Copied!</span>
              ) : (
                <span>Copy TSV</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Counter Strip */}
      <div className="flex items-center justify-between text-xs text-foreground-muted px-1">
        <span>
          Showing <strong className="text-foreground">{filtered.length}</strong> of{" "}
          <strong className="text-foreground">{registrations.length}</strong> registered attendees
        </span>
        <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
          <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block animate-pulse"></span>
          <span>{checkedInCount} Checked In ({Math.round((checkedInCount / (registrations.length || 1)) * 100)}%)</span>
        </span>
      </div>

      {/* High-Density Data Table */}
      <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-slate-50 text-slate-600 font-bold text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3.5">Ref ID</th>
                <th className="py-2.5 px-3.5">Attendee</th>
                <th className="py-2.5 px-3.5">Academic</th>
                <th className="py-2.5 px-3.5">Track</th>
                <th className="py-2.5 px-3.5 text-center">Status</th>
                <th className="py-2.5 px-3.5 text-center">Check-in</th>
                <th className="py-2.5 px-3.5 text-right">Action</th>
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
                filtered.map((reg) => (
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
                        {reg.track.includes("Track A") ? "Track A (Web/AI)" : "Track B (Cloud/GCP)"}
                      </span>
                    </td>

                    <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">
                        {reg.status}
                      </span>
                    </td>

                    <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                      {reg.checkedIn ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                          <svg className="w-3 h-3 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>Present</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Absent</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                      {!reg.checkedIn ? (
                        <button
                          type="button"
                          onClick={() => handleToggleCheckIn(reg)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
                        >
                          Check In
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono">{reg.checkedInAt?.slice(-8) || "Verified"}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
