"use client";

import { useState } from "react";
import type { RegistrationRecord } from "@/types";

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
        setActionFeedback(`✅ Successfully checked in ${reg.fullName} (#${reg.referenceId})!`);
        setTimeout(() => setActionFeedback(null), 3500);
      } else {
        setActionFeedback(`⚠️ ${data.message}`);
        setTimeout(() => setActionFeedback(null), 3500);
      }
    } catch {
      setActionFeedback("Error processing check-in.");
      setTimeout(() => setActionFeedback(null), 3500);
    }
  }

  function handleExportCsv() {
    const headers = [
      "Reference ID",
      "Full Name",
      "Email",
      "Phone",
      "College",
      "Department",
      "Year of Study",
      "Track",
      "Experience Level",
      "Portfolio URL",
      "Status",
      "Checked In",
      "Checked In At",
      "Registered At",
    ];

    const rows = filtered.map((r) => [
      `"${r.referenceId}"`,
      `"${r.fullName.replace(/"/g, '""')}"`,
      `"${r.email}"`,
      `"${r.phone}"`,
      `"${r.college.replace(/"/g, '""')}"`,
      `"${r.department}"`,
      `"${r.yearOfStudy}"`,
      `"${r.track}"`,
      `"${r.experienceLevel}"`,
      `"${r.portfolioUrl || ""}"`,
      `"${r.status}"`,
      r.checkedIn ? "YES" : "NO",
      `"${r.checkedInAt || ""}"`,
      `"${r.createdAt}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `gdg_vcet_${eventSlug}_registrations.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Action Notification */}
      {actionFeedback ? (
        <div className="p-4 rounded-xl bg-primary-fixed text-on-primary-fixed-variant text-sm font-semibold flex items-center gap-2 border border-primary/20 shadow-xs animate-fade-in">
          <span className="material-symbols-outlined text-[20px]">info</span>
          <span>{actionFeedback}</span>
        </div>
      ) : null}

      {/* Filter Toolbar */}
      <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, pass reference (#GDG-...), or college..."
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-surface-container-low text-xs sm:text-sm text-foreground focus:outline-hidden focus:border-primary focus:bg-white transition-all"
          />
          <span className="material-symbols-outlined text-[20px] text-foreground-muted absolute left-3 top-2.5">
            search
          </span>
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={trackFilter}
            onChange={(e) => setTrackFilter(e.target.value)}
            className="h-11 px-3 rounded-xl border border-border bg-surface-container-low text-xs text-foreground focus:outline-hidden"
          >
            <option value="all">All Tracks</option>
            <option value="Track A: Modern Web & Gemini AI">Track A: Web &amp; AI</option>
            <option value="Track B: Cloud Architecture & GCP">Track B: Cloud &amp; GCP</option>
          </select>

          <select
            value={checkInFilter}
            onChange={(e) => setCheckInFilter(e.target.value)}
            className="h-11 px-3 rounded-xl border border-border bg-surface-container-low text-xs text-foreground focus:outline-hidden"
          >
            <option value="all">All Check-ins</option>
            <option value="checked-in">Checked In Only</option>
            <option value="not-checked-in">Not Checked In</option>
          </select>

          <button
            type="button"
            onClick={handleExportCsv}
            className="h-11 inline-flex items-center gap-2 px-4 rounded-xl bg-surface-container hover:bg-surface-container-high border border-border text-foreground text-xs font-semibold transition-all shrink-0 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px] text-primary">download</span>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Roster Summary Strip */}
      <div className="flex items-center justify-between text-xs text-foreground-muted px-1">
        <span>
          Showing <strong className="text-foreground">{filtered.length}</strong> of{" "}
          <strong className="text-foreground">{registrations.length}</strong> registered attendees
        </span>
        <span className="flex items-center gap-1 font-semibold text-secondary">
          <span className="w-2 h-2 rounded-full bg-secondary inline-block"></span>
          {checkedInCount} Checked In
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="border-b border-border bg-surface-container-low/60 text-foreground-muted font-bold text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Pass ID</th>
                <th className="py-3 px-4">Attendee</th>
                <th className="py-3 px-4">College &amp; Dept</th>
                <th className="py-3 px-4">Track</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Check-in</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-foreground-muted">
                    No attendees match the active filters.
                  </td>
                </tr>
              ) : (
                filtered.map((reg) => (
                  <tr key={reg.id} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-foreground text-xs">
                      #{reg.referenceId}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground">{reg.fullName}</span>
                        <span className="text-[11px] text-foreground-muted font-mono">{reg.email}</span>
                        <span className="text-[11px] text-foreground-muted">{reg.phone}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-col max-w-xs">
                        <span className="font-semibold text-foreground text-xs truncate">
                          {reg.college}
                        </span>
                        <span className="text-[11px] text-foreground-muted">
                          {reg.department} · {reg.yearOfStudy}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant text-[11px] font-bold inline-block">
                        {reg.track.includes("Track A") ? "Track A (Web/AI)" : "Track B (Cloud/GCP)"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-surface-container text-foreground-muted text-[11px] font-semibold capitalize">
                        {reg.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {reg.checkedIn ? (
                        <div className="inline-flex items-center gap-1 bg-secondary-fixed text-on-secondary-fixed text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                          <span className="material-symbols-outlined text-[14px]">check</span>
                          <span>Checked In</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-foreground-muted font-medium">Pending</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {!reg.checkedIn ? (
                        <button
                          type="button"
                          onClick={() => handleToggleCheckIn(reg)}
                          className="px-3 py-1 rounded-full bg-secondary text-on-secondary text-xs font-semibold hover:bg-secondary/90 transition-all cursor-pointer"
                        >
                          Check In
                        </button>
                      ) : (
                        <span className="text-[11px] text-foreground-muted">Verified</span>
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

