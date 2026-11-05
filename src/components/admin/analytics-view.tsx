"use client";

import { useState } from "react";
import type { EventStats } from "@/lib/db";
import { downloadForGoogleSheets, copyForGoogleSheets } from "@/lib/sheets-export";

interface AnalyticsViewProps {
  slug: string;
  eventTitle: string;
  stats: EventStats;
}

export function AnalyticsView({ slug, eventTitle, stats }: AnalyticsViewProps) {
  const [copySuccess, setCopySuccess] = useState(false);

  const checkInRate =
    stats.totalRegistered > 0 ? Math.round((stats.checkedInCount / stats.totalRegistered) * 100) : 0;

  // Flattened data for Google Sheets export
  const exportRows = [
    { metric: "Total Capacity", value: stats.capacity, category: "Overview" },
    { metric: "Total Registered", value: stats.totalRegistered, category: "Overview" },
    { metric: "Seats Remaining", value: stats.remaining, category: "Overview" },
    { metric: "Percent Capacity Claimed", value: `${stats.percentFilled}%`, category: "Overview" },
    { metric: "Checked In Attendees", value: stats.checkedInCount, category: "Overview" },
    { metric: "Attendance Rate", value: `${checkInRate}%`, category: "Overview" },
    ...Object.entries(stats.trackCounts).map(([track, count]) => ({
      metric: track,
      value: count,
      category: "Track Distribution",
    })),
    ...Object.entries(stats.yearCounts).map(([year, count]) => ({
      metric: year,
      value: count,
      category: "Year of Study",
    })),
    ...Object.entries(stats.departmentCounts).map(([dept, count]) => ({
      metric: dept,
      value: count,
      category: "Department Breakdown",
    })),
  ];

  function handleDownloadSheets() {
    downloadForGoogleSheets(
      `gdg_vcet_${slug}_analytics_${new Date().toISOString().slice(0, 10)}`,
      exportRows,
      [
        { key: "category", label: "Category" },
        { key: "metric", label: "Metric / Breakdown" },
        { key: "value", label: "Count / Value" },
      ]
    );
  }

  async function handleCopySheets() {
    const ok = await copyForGoogleSheets(exportRows, [
      { key: "category", label: "Category" },
      { key: "metric", label: "Metric / Breakdown" },
      { key: "value", label: "Count / Value" },
    ]);
    if (ok) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Heading with Export to Sheets Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-foreground-muted mb-1">
            <span>Events</span>
            <span>›</span>
            <span className="font-semibold text-foreground">{eventTitle}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Cohort Analytics &amp; Demographics
          </h1>
        </div>

        {/* Universal Export to Sheets */}
        <div className="inline-flex rounded-xl border border-emerald-300 bg-emerald-50/70 p-0.5 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleDownloadSheets}
            title="Download full analytics breakdown CSV for Google Sheets"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-emerald-800 hover:bg-emerald-100 text-xs font-semibold transition-all cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Export Metrics to Sheets</span>
          </button>
          <button
            type="button"
            onClick={handleCopySheets}
            title="Copy metrics to clipboard for direct Google Sheets paste"
            className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-emerald-700 hover:bg-emerald-100 text-xs font-medium border-l border-emerald-200 transition-all cursor-pointer"
          >
            {copySuccess ? <span className="font-bold text-emerald-800">Copied!</span> : <span>Copy TSV</span>}
          </button>
        </div>
      </div>

      {/* Simplified KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-border shadow-xs flex flex-col gap-1">
          <span className="text-xs font-bold text-foreground-muted uppercase tracking-wider">
            Total Cohort
          </span>
          <span className="text-2xl sm:text-3xl font-bold text-primary">{stats.totalRegistered}</span>
          <span className="text-[11px] text-foreground-muted">Cap: {stats.capacity}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-border shadow-xs flex flex-col gap-1">
          <span className="text-xs font-bold text-foreground-muted uppercase tracking-wider">
            Seats Remaining
          </span>
          <span className="text-2xl sm:text-3xl font-bold text-foreground">{stats.remaining}</span>
          <span className="text-[11px] text-emerald-700 font-semibold">{stats.percentFilled}% filled</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-border shadow-xs flex flex-col gap-1">
          <span className="text-xs font-bold text-foreground-muted uppercase tracking-wider">
            Attendance Verified
          </span>
          <span className="text-2xl sm:text-3xl font-bold text-emerald-600">{stats.checkedInCount}</span>
          <span className="text-[11px] text-foreground-muted">{checkInRate}% rate</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-border shadow-xs flex flex-col gap-1">
          <span className="text-xs font-bold text-foreground-muted uppercase tracking-wider">
            Registration Status
          </span>
          <span className="text-lg sm:text-xl font-bold text-emerald-700 pt-1">
            {stats.isOpen ? "Open" : "Closed"}
          </span>
          <span className="text-[11px] text-foreground-muted">Instant pass issuing</span>
        </div>
      </div>

      {/* High-Density Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Track Selection */}
        <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex flex-col gap-3">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Track Preference
          </h2>
          <div className="flex flex-col gap-3 divide-y divide-border/40 text-xs">
            {Object.entries(stats.trackCounts).map(([track, count]) => {
              const pct = stats.totalRegistered > 0 ? Math.round((count / stats.totalRegistered) * 100) : 0;
              return (
                <div key={track} className="pt-2 first:pt-0 flex flex-col gap-1">
                  <div className="flex justify-between items-center font-medium">
                    <span className="text-slate-800">{track}</span>
                    <span className="font-mono font-bold text-slate-900">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-primary h-full rounded-full" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Academic Year */}
        <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex flex-col gap-3">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Academic Year
          </h2>
          <div className="flex flex-col gap-3 divide-y divide-border/40 text-xs">
            {Object.entries(stats.yearCounts).map(([year, count]) => {
              const pct = stats.totalRegistered > 0 ? Math.round((count / stats.totalRegistered) * 100) : 0;
              return (
                <div key={year} className="pt-2 first:pt-0 flex flex-col gap-1">
                  <div className="flex justify-between items-center font-medium">
                    <span className="text-slate-800">{year}</span>
                    <span className="font-mono font-bold text-slate-900">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Department Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex flex-col gap-3">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Department Distribution
          </h2>
          <div className="flex flex-col gap-3 divide-y divide-border/40 text-xs">
            {Object.entries(stats.departmentCounts).map(([dept, count]) => {
              const pct = stats.totalRegistered > 0 ? Math.round((count / stats.totalRegistered) * 100) : 0;
              return (
                <div key={dept} className="pt-2 first:pt-0 flex flex-col gap-1">
                  <div className="flex justify-between items-center font-medium">
                    <span className="text-slate-800 truncate pr-2">{dept}</span>
                    <span className="font-mono font-bold text-slate-900 shrink-0">{count}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

