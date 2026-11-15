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
    ...(stats.dailyCheckedInCounts
      ? [
          { metric: "Day 1 Attendees (Dec 1)", value: stats.dailyCheckedInCounts[1] || 0, category: "4-Day Attendance" },
          { metric: "Day 2 Attendees (Dec 2)", value: stats.dailyCheckedInCounts[2] || 0, category: "4-Day Attendance" },
          { metric: "Day 3 Attendees (Dec 3)", value: stats.dailyCheckedInCounts[3] || 0, category: "4-Day Attendance" },
          { metric: "Day 4 Attendees (Dec 4)", value: stats.dailyCheckedInCounts[4] || 0, category: "4-Day Attendance" },
          { metric: "All 4 Days Completed", value: stats.multiDayCompletionCount || 0, category: "4-Day Attendance" },
        ]
      : []),
    ...Object.entries(stats.trackCounts || {}).map(([track, count]) => ({
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

      {/* 4-Day Workshop Attendance & Retention Funnel */}
      <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
          <div>
            <h2 className="text-sm font-bold text-foreground">
              4-Day Workshop Attendance &amp; Retention Funnel
            </h2>
            <p className="text-xs text-foreground-muted mt-0.5">
              Live attendance tracking, daily retention rates, and GDG certificate completion across all 4 days.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 self-start sm:self-auto">
            {stats.multiDayCompletionCount || 0} Fully Qualified for Certification
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { day: 1, title: "Day 1: Web Architecture", date: "Dec 1" },
            { day: 2, title: "Day 2: AI Agents & RAG", date: "Dec 2" },
            { day: 3, title: "Day 3: Cloud Run CI/CD", date: "Dec 3" },
            { day: 4, title: "Day 4: Prod Hardening", date: "Dec 4" },
          ].map((d) => {
            const count = stats.dailyCheckedInCounts?.[d.day] ?? (d.day === 1 ? stats.checkedInCount : 0);
            const pct = stats.totalRegistered > 0 ? Math.round((count / stats.totalRegistered) * 100) : 0;
            return (
              <div key={d.day} className="p-3.5 rounded-xl border border-border bg-slate-50/50 flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-foreground">Day {d.day}</span>
                  <span className="text-foreground-muted text-[11px]">{d.date}</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-foreground">{count}</span>
                  <span className="text-xs text-foreground-muted">/ {stats.totalRegistered}</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[10px] text-foreground-muted truncate">{pct}% cohort retention</span>
              </div>
            );
          })}

          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-emerald-900">4-Day Complete</span>
              <span className="text-emerald-700 text-[11px] font-bold">100%</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-emerald-800">{stats.multiDayCompletionCount || 0}</span>
              <span className="text-xs text-emerald-700">attendees</span>
            </div>
            <div className="w-full bg-emerald-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all"
                style={{
                  width: `${
                    stats.totalRegistered > 0
                      ? Math.round(((stats.multiDayCompletionCount || 0) / stats.totalRegistered) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
            <span className="text-[10px] text-emerald-800 font-medium">Eligible for GDG Certificate</span>
          </div>
        </div>
      </div>

      {/* High-Density Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Track Selection (Optional: only if track data exists) */}
        {Object.keys(stats.trackCounts || {}).length > 0 ? (
          <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex flex-col gap-3">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Track Preference
            </h2>
            <div className="flex flex-col gap-3 divide-y divide-border/40 text-xs">
              {Object.entries(stats.trackCounts || {}).map(([track, count]) => {
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
        ) : null}

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

