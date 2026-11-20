"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EventStats } from "@/lib/db";
import { downloadForGoogleSheets, copyForGoogleSheets } from "@/lib/sheets-export";

interface AnalyticsViewProps {
  slug: string;
  eventTitle: string;
  stats: EventStats;
}

// Canonical academic year sorting order
const YEAR_ORDER: Record<string, number> = {
  "1st Year": 1,
  "FE (1st Year)": 1,
  "First Year": 1,
  "2nd Year": 2,
  "SE (2nd Year)": 2,
  "Second Year": 2,
  "3rd Year": 3,
  "TE (3rd Year)": 3,
  "Third Year": 3,
  "4th Year": 4,
  "BE (4th Year)": 4,
  "Fourth Year": 4,
};

// Canonical experience level sorting
const EXP_ORDER: Record<string, number> = {
  Beginner: 1,
  Intermediate: 2,
  Advanced: 3,
};

export function AnalyticsView({ slug, eventTitle, stats }: AnalyticsViewProps) {
  const router = useRouter();
  const [copySuccess, setCopySuccess] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const checkInRate =
    stats.totalRegistered > 0 ? Math.round((stats.checkedInCount / stats.totalRegistered) * 100) : 0;

  const peakCapacity = slug === "dev-to-cloud" ? 135 : stats.capacity;
  const remainingToPeak = Math.max(0, peakCapacity - stats.totalRegistered);
  const percentToPeak = Math.min(100, Math.round((stats.totalRegistered / peakCapacity) * 100));

  function handleRefresh() {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 800);
  }

  // Ordered Academic Years
  const sortedYears = Object.entries(stats.yearCounts || {}).sort((a, b) => {
    const orderA = YEAR_ORDER[a[0]] ?? 99;
    const orderB = YEAR_ORDER[b[0]] ?? 99;
    return orderA - orderB;
  });

  // Ordered Departments (highest first)
  const sortedDepartments = Object.entries(stats.departmentCounts || {}).sort(
    (a, b) => b[1] - a[1]
  );

  // Ordered Experience Levels
  const sortedExperience = Object.entries(stats.experienceCounts || {}).sort((a, b) => {
    const orderA = EXP_ORDER[a[0]] ?? 99;
    const orderB = EXP_ORDER[b[0]] ?? 99;
    return orderA - orderB;
  });

  // Consolidated Track Counts
  const rawTracks = Object.entries(stats.trackCounts || {});
  const consolidatedTracks: { name: string; count: number; pct: number }[] = [];
  let totalTrackSum = 0;
  rawTracks.forEach(([, count]) => {
    totalTrackSum += count;
  });
  if (totalTrackSum > 0) {
    consolidatedTracks.push({
      name: "Zero to Hero: Full 4-Day Journey",
      count: totalTrackSum,
      pct: 100,
    });
  }

  // Flattened data for Google Sheets export
  const exportRows = [
    { category: "Overview", metric: "Event Slug", value: slug },
    { category: "Overview", metric: "Total Capacity (Peak)", value: stats.capacity },
    { category: "Overview", metric: "Total Cohort Registered", value: stats.totalRegistered },
    { category: "Overview", metric: "Seats Remaining", value: stats.remaining },
    { category: "Overview", metric: "Percent Capacity Claimed", value: `${stats.percentFilled}%` },
    { category: "Overview", metric: "Attendance Verified (Gate Check-in)", value: stats.checkedInCount },
    { category: "Overview", metric: "Overall Check-in Rate", value: `${checkInRate}%` },
    ...(stats.dailyCheckedInCounts
      ? [
          { category: "4-Day Attendance", metric: "Day 1 (Dec 1) - Web Architecture", value: stats.dailyCheckedInCounts[1] || 0 },
          { category: "4-Day Attendance", metric: "Day 2 (Dec 2) - AI Agents & RAG", value: stats.dailyCheckedInCounts[2] || 0 },
          { category: "4-Day Attendance", metric: "Day 3 (Dec 3) - Cloud Run CI/CD", value: stats.dailyCheckedInCounts[3] || 0 },
          { category: "4-Day Attendance", metric: "Day 4 (Dec 4) - Prod Hardening", value: stats.dailyCheckedInCounts[4] || 0 },
          { category: "4-Day Attendance", metric: "4-Day Complete (GDG Certificate Qualified)", value: stats.multiDayCompletionCount || 0 },
        ]
      : []),
    ...sortedYears.map(([year, count]) => ({
      category: "Academic Year",
      metric: year,
      value: count,
    })),
    ...sortedDepartments.map(([dept, count]) => ({
      category: "Department Breakdown",
      metric: dept,
      value: count,
    })),
    ...sortedExperience.map(([exp, count]) => ({
      category: "Experience Level",
      metric: exp,
      value: count,
    })),
    ...(stats.collegeStats
      ? [
          { category: "Institution", metric: "VCET Students", value: stats.collegeStats.vcetCount },
          { category: "Institution", metric: "External College Students", value: stats.collegeStats.otherCount },
          { category: "Institution", metric: "VCET Share", value: `${stats.collegeStats.vcetPercent}%` },
          ...stats.collegeStats.topColleges.map((tc) => ({
            category: "Top External Colleges",
            metric: tc.college,
            value: tc.count,
          })),
        ]
      : []),
  ];

  function handleDownloadSheets() {
    downloadForGoogleSheets(
      `gdg_vcet_${slug}_cohort_analytics_${new Date().toISOString().slice(0, 10)}`,
      exportRows,
      [
        { key: "category", label: "Category" },
        { key: "metric", label: "Metric / Demographics" },
        { key: "value", label: "Count / Percentage" },
      ]
    );
  }

  async function handleCopySheets() {
    const ok = await copyForGoogleSheets(exportRows, [
      { key: "category", label: "Category" },
      { key: "metric", label: "Metric / Demographics" },
      { key: "value", label: "Count / Percentage" },
    ]);
    if (ok) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header with Live Sync Status & Export Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Live Cloud Analytics · {eventTitle}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Cohort Analytics &amp; Demographics
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Real-time cohort insights, 4-day attendance retention, and student demographic breakdowns.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-all active:scale-[0.98] cursor-pointer"
            title="Refresh analytics data"
          >
            <svg
              className={`w-3.5 h-3.5 text-slate-600 ${refreshing ? "animate-spin" : ""}`}
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
            <span>{refreshing ? "Syncing..." : "Sync"}</span>
          </button>

          {/* Export to Sheets Pill */}
          <div className="inline-flex rounded-xl border border-emerald-300 bg-emerald-50/80 p-0.5 shadow-xs">
            <button
              type="button"
              onClick={handleDownloadSheets}
              title="Download full analytics breakdown CSV for Google Sheets"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-emerald-900 hover:bg-emerald-100/80 text-xs font-bold transition-all cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-emerald-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Export Sheets</span>
            </button>
            <button
              type="button"
              onClick={handleCopySheets}
              title="Copy metrics to clipboard for direct Google Sheets paste"
              className="inline-flex items-center px-2.5 py-2 rounded-lg text-emerald-800 hover:bg-emerald-100/80 text-xs font-semibold border-l border-emerald-200 transition-all cursor-pointer"
            >
              {copySuccess ? <span className="font-bold text-emerald-950">Copied!</span> : <span>Copy TSV</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Hero KPI Cards with Progress Rings */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cohort */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <span>Total Cohort</span>
              <span className="text-base">👥</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-slate-900">{stats.totalRegistered}</span>
              <span className="text-xs font-bold text-slate-500">/ {peakCapacity} Peak Cap</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-1.5">
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#4285F4] h-full rounded-full transition-all duration-500"
                style={{ width: `${percentToPeak}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-500 font-medium">
              <span>Peak Target: {peakCapacity}</span>
              <span className="font-bold text-[#1a73e8]">{percentToPeak}% claimed</span>
            </div>
          </div>
        </div>

        {/* Seats Remaining */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <span>Seats Remaining</span>
              <span className="text-base">🎟️</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-emerald-600">{remainingToPeak}</span>
              <span className="text-xs font-bold text-emerald-700">Open to Peak</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Peak Capacity {peakCapacity}</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
              {remainingToPeak > 0 ? `${remainingToPeak} Seats Left` : "Peak Reached"}
            </span>
          </div>
        </div>

        {/* Attendance Verified */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <span>Attendance Verified</span>
              <span className="text-base">📷</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-[#34A853]">{stats.checkedInCount}</span>
              <span className="text-xs font-bold text-slate-500">at Gate Desk</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Verification Rate</span>
            <span className="font-bold text-[#34A853]">{checkInRate}% of cohort</span>
          </div>
        </div>

        {/* Registration Status */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <span>Registration Status</span>
              <span className="text-base">🛡️</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl sm:text-3xl font-black ${
                  stats.isOpen ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {stats.isOpen ? "Open" : "Seats Filled"}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Peak Guard Limit</span>
            <span className="font-mono font-bold text-slate-800">{stats.capacity} max</span>
          </div>
        </div>
      </div>

      {/* 4-Day Workshop Attendance & Retention Funnel */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">📊</span>
              <h2 className="text-base font-bold text-slate-900">
                4-Day Workshop Attendance &amp; Retention Funnel
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live attendance tracking, day-by-day retention rates, and GDG certificate completion across all 4 days.
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 self-start sm:self-auto inline-flex items-center gap-1.5">
            <span>🎓</span>
            <span>{stats.multiDayCompletionCount || 0} Fully Qualified for Certification</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {[
            { day: 1, title: "Web Architecture", date: "Dec 1", color: "#4285F4" },
            { day: 2, title: "AI Agents & RAG", date: "Dec 2", color: "#34A853" },
            { day: 3, title: "Cloud Run CI/CD", date: "Dec 3", color: "#FBBC05" },
            { day: 4, title: "Prod Hardening", date: "Dec 4", color: "#EA4335" },
          ].map((d) => {
            const count = stats.dailyCheckedInCounts?.[d.day] ?? (d.day === 1 ? stats.checkedInCount : 0);
            const pct = stats.totalRegistered > 0 ? Math.round((count / stats.totalRegistered) * 100) : 0;
            return (
              <div
                key={d.day}
                className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 flex flex-col justify-between gap-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-900">Day {d.day}</span>
                  <span className="font-semibold text-slate-500 text-[11px] px-2 py-0.5 rounded-md bg-white border border-slate-200/60">
                    {d.date}
                  </span>
                </div>

                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-slate-900">{count}</span>
                    <span className="text-xs text-slate-500 font-medium">/ {stats.totalRegistered}</span>
                  </div>
                  <div className="text-[11px] font-semibold text-slate-600 truncate mt-0.5">
                    {d.title}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: d.color }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                    <span>Cohort Retention</span>
                    <span className="font-bold text-slate-800">{pct}%</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* 4-Day Complete Card */}
          <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 flex flex-col justify-between gap-3 shadow-xs">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-emerald-950">4-Day Complete</span>
              <span className="text-emerald-800 text-[11px] font-black px-2 py-0.5 rounded-md bg-white/80 border border-emerald-300">
                100%
              </span>
            </div>

            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-emerald-900">
                  {stats.multiDayCompletionCount || 0}
                </span>
                <span className="text-xs text-emerald-800 font-medium">attendees</span>
              </div>
              <div className="text-[11px] font-bold text-emerald-800 mt-0.5">
                Full 4/4 Attendance
              </div>
            </div>

            <div className="space-y-1">
              <div className="w-full bg-emerald-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#34A853] h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      stats.totalRegistered > 0
                        ? Math.round(((stats.multiDayCompletionCount || 0) / stats.totalRegistered) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
              <span className="text-[10px] text-emerald-900 font-bold block truncate">
                Eligible for GDG Certificate
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4-Column Demographics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Academic Year (Chronologically Ordered) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-base">🎓</span>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Academic Year
              </h2>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">SE &amp; TE Peak</span>
          </div>

          <div className="flex flex-col gap-3.5 text-xs">
            {sortedYears.map(([year, count]) => {
              const pct = stats.totalRegistered > 0 ? Math.round((count / stats.totalRegistered) * 100) : 0;
              return (
                <div key={year} className="flex flex-col gap-1">
                  <div className="flex justify-between items-center font-medium">
                    <span className="font-semibold text-slate-800">{year}</span>
                    <span className="font-mono font-bold text-slate-900">
                      {count} <span className="text-slate-400 font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#34A853] h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Department Breakdown */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-base">💻</span>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Department Distribution
              </h2>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">{sortedDepartments.length} Branches</span>
          </div>

          <div className="flex flex-col gap-3.5 text-xs">
            {sortedDepartments.map(([dept, count]) => {
              const pct = stats.totalRegistered > 0 ? Math.round((count / stats.totalRegistered) * 100) : 0;
              return (
                <div key={dept} className="flex flex-col gap-1">
                  <div className="flex justify-between items-center font-medium">
                    <span className="font-semibold text-slate-800 truncate pr-2">{dept}</span>
                    <span className="font-mono font-bold text-slate-900 shrink-0">
                      {count} <span className="text-slate-400 font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#4285F4] h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Skill & Experience Level */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-base">⚡</span>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Experience Level
              </h2>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Audience Skill</span>
          </div>

          <div className="flex flex-col gap-3.5 text-xs">
            {sortedExperience.length > 0 ? (
              sortedExperience.map(([exp, count]) => {
                const pct = stats.totalRegistered > 0 ? Math.round((count / stats.totalRegistered) * 100) : 0;
                const barColor =
                  exp.toLowerCase() === "beginner"
                    ? "bg-[#34A853]"
                    : exp.toLowerCase() === "intermediate"
                    ? "bg-[#FBBC05]"
                    : "bg-[#EA4335]";

                return (
                  <div key={exp} className="flex flex-col gap-1">
                    <div className="flex justify-between items-center font-medium">
                      <span className="font-semibold text-slate-800">{exp}</span>
                      <span className="font-mono font-bold text-slate-900">
                        {count} <span className="text-slate-400 font-normal">({pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`${barColor} h-full rounded-full transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-6 text-center text-slate-400 text-xs">
                No experience data recorded.
              </div>
            )}
          </div>
        </div>

        {/* 4. Campus Representation (VCET vs Other Colleges) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-base">🏫</span>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Campus Reach
              </h2>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">College Split</span>
          </div>

          <div className="flex flex-col gap-3.5 text-xs">
            {/* VCET In-House */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center font-medium">
                <span className="font-semibold text-slate-800">VCET (In-House)</span>
                <span className="font-mono font-bold text-slate-900">
                  {stats.collegeStats?.vcetCount ?? stats.totalRegistered}{" "}
                  <span className="text-slate-400 font-normal">
                    ({stats.collegeStats?.vcetPercent ?? 95}%)
                  </span>
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#1a73e8] h-full rounded-full transition-all duration-500"
                  style={{ width: `${stats.collegeStats?.vcetPercent ?? 95}%` }}
                />
              </div>
            </div>

            {/* External Colleges */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center font-medium">
                <span className="font-semibold text-slate-800">External Colleges</span>
                <span className="font-mono font-bold text-slate-900">
                  {stats.collegeStats?.otherCount ?? 0}{" "}
                  <span className="text-slate-400 font-normal">
                    ({100 - (stats.collegeStats?.vcetPercent ?? 95)}%)
                  </span>
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#EA4335] h-full rounded-full transition-all duration-500"
                  style={{ width: `${100 - (stats.collegeStats?.vcetPercent ?? 95)}%` }}
                />
              </div>
            </div>

            {/* Top External List */}
            {stats.collegeStats?.topColleges && stats.collegeStats.topColleges.length > 0 ? (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Top External Campuses
                </span>
                <div className="space-y-1">
                  {stats.collegeStats.topColleges.slice(0, 3).map((col) => (
                    <div key={col.college} className="flex justify-between text-[11px] text-slate-600">
                      <span className="truncate pr-1">{col.college}</span>
                      <span className="font-mono font-bold">{col.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Track & Journey Alignment Card */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-xl shrink-0">
            🚀
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              Track Commitment: Full 4-Day Hands-on Journey
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              100% of the cohort is enrolled in the full 4-day intensive roadmap from Local Code to Cloud Run AI Agents.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <span className="text-xl font-black text-slate-900">{stats.totalRegistered}</span>
            <span className="text-xs text-slate-500 block">Enrolled Students</span>
          </div>
          <span className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200">
            All-Access Pass
          </span>
        </div>
      </div>
    </div>
  );
}
