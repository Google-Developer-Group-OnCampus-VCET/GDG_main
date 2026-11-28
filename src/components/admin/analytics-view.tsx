"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { EventStats } from "@/lib/db";
import type { ChapterEvent } from "@/types";
import { downloadForGoogleSheets, copyForGoogleSheets } from "@/lib/sheets-export";

interface AnalyticsViewProps {
  slug: string;
  eventTitle: string;
  stats: EventStats;
  event?: ChapterEvent;
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

// Year brand colors for spectrum visualization
const YEAR_COLORS: Record<string, string> = {
  "1st Year": "#4285F4",
  "FE (1st Year)": "#4285F4",
  "First Year": "#4285F4",
  "2nd Year": "#34A853",
  "SE (2nd Year)": "#34A853",
  "Second Year": "#34A853",
  "3rd Year": "#FBBC05",
  "TE (3rd Year)": "#FBBC05",
  "Third Year": "#FBBC05",
  "4th Year": "#EA4335",
  "BE (4th Year)": "#EA4335",
  "Fourth Year": "#EA4335",
};

// Canonical experience level sorting
const EXP_ORDER: Record<string, number> = {
  Beginner: 1,
  Intermediate: 2,
  Advanced: 3,
};

export function AnalyticsView({ slug, eventTitle, stats: initialStats, event }: AnalyticsViewProps) {
  const router = useRouter();
  const [stats, setStats] = useState<EventStats>(initialStats);
  const [copySuccess, setCopySuccess] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const lastVersionRef = useRef<number>(0);

  const syncStats = useCallback(
    async (force = false) => {
      try {
        const qs = !force && lastVersionRef.current > 0 ? `?version=${lastVersionRef.current}` : "";
        const res = await fetch(`/api/events/${slug}/confirmed-attendees${qs}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.unchanged) return;
        if (typeof data?.version === "number") {
          lastVersionRef.current = data.version;
        }
        if (data?.success && data.stats && data.stats.totalRegistered > 0) {
          setStats(data.stats);
        }
      } catch {
        // ignore transient errors
      }
    },
    [slug]
  );

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void syncStats(false);
      }
    }, 60000);

    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        void syncStats(false);
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(`gdg-confirmed-${slug}`);
      channel.onmessage = () => {
        void syncStats(true);
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
  }, [slug, syncStats]);

  // Dynamic calculations from stats & event - NO STATIC NUMBERS
  const totalRegistered = stats.totalRegistered;
  const totalCapacity = stats.capacity;
  const remainingSeats = stats.remaining;
  const percentClaimed = stats.percentFilled;
  const checkedInCount = stats.checkedInCount;
  const pendingCheckIn = Math.max(0, totalRegistered - checkedInCount);
  const checkInRate = totalRegistered > 0 ? Math.round((checkedInCount / totalRegistered) * 100) : 0;

  async function handleRefresh() {
    setRefreshing(true);
    await syncStats(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 600);
  }

  // 1. Dynamic Academic Year Distribution
  const sortedYears = Object.entries(stats.yearCounts || {}).sort((a, b) => {
    const orderA = YEAR_ORDER[a[0]] ?? 99;
    const orderB = YEAR_ORDER[b[0]] ?? 99;
    return orderA - orderB;
  });
  const topYearEntry = [...sortedYears].sort((a, b) => b[1] - a[1])[0];
  const peakYearLabel = topYearEntry
    ? `${topYearEntry[0]} Dominant (${totalRegistered > 0 ? Math.round((topYearEntry[1] / totalRegistered) * 100) : 0}%)`
    : "Year Distribution";

  // 2. Dynamic Department Distribution
  const sortedDepartments = Object.entries(stats.departmentCounts || {}).sort(
    (a, b) => b[1] - a[1]
  );
  const topDeptEntry = sortedDepartments[0];
  const peakDeptLabel = topDeptEntry
    ? `${topDeptEntry[0]} Leading (${topDeptEntry[1]})`
    : "Department Distribution";

  // 3. Dynamic Experience Level Distribution
  const sortedExperience = Object.entries(stats.experienceCounts || {}).sort((a, b) => {
    const orderA = EXP_ORDER[a[0]] ?? 99;
    const orderB = EXP_ORDER[b[0]] ?? 99;
    return orderA - orderB;
  });
  const topExpEntry = [...sortedExperience].sort((a, b) => b[1] - a[1])[0];
  const expPacingInsight = topExpEntry
    ? topExpEntry[0].toLowerCase() === "beginner"
      ? "Recommend 15-min CLI setup walkthrough & Git fundamentals checkpoint."
      : topExpEntry[0].toLowerCase() === "intermediate"
      ? "Cohort ready for multi-agent workflows, vector RAG, and Cloud Run deployments."
      : "Cohort skilled: expand into zero-trust security rules and production optimization."
    : "Experience level insights will appear as attendees complete registration.";

  // 4. Dynamic Campus Reach
  const vcetCount = stats.collegeStats?.vcetCount ?? 0;
  const otherCount = stats.collegeStats?.otherCount ?? 0;
  const reportedCampuses = vcetCount + otherCount;
  const effectiveCampusTotal = reportedCampuses > 0 ? reportedCampuses : totalRegistered;
  const vcetPct = effectiveCampusTotal > 0 ? Math.round((vcetCount / effectiveCampusTotal) * 100) : 0;
  const otherPct = Math.max(0, 100 - vcetPct);

  // 5. Dynamic Track Preferences
  const rawTracks = Object.entries(stats.trackCounts || {}).sort((a, b) => b[1] - a[1]);
  const totalTrackSum = rawTracks.reduce((acc, [, count]) => acc + count, 0);

  // 6. Dynamic Registration Intake Velocity Timeline
  const dateEntries = Object.entries(stats.registrationDates || {}).sort((a, b) =>
    a[0].localeCompare(b[0])
  );
  let runningCumulative = 0;
  const timelineData = dateEntries.map(([dateStr, count]) => {
    runningCumulative += count;
    return {
      dateStr,
      count,
      cumulative: runningCumulative,
    };
  });
  const maxIntakePerDay = timelineData.length > 0 ? Math.max(...timelineData.map((d) => d.count), 1) : 1;
  const peakIntakeEntry = [...timelineData].sort((a, b) => b.count - a.count)[0];
  const activeIntakeDays = timelineData.length;
  const avgVelocity = activeIntakeDays > 0 ? (totalRegistered / activeIntakeDays).toFixed(1) : "0";

  // 7. Dynamic Multi-Day Workshop Funnel
  // Derive dynamically from event.workshop.pillars or dailyCheckedInCounts
  const googleColors = ["#4285F4", "#34A853", "#FBBC05", "#EA4335"];
  const workshopPillars = event?.workshop?.pillars || [];
  const dailyCountsMap = stats.dailyCheckedInCounts || {};
  const activeDayKeys = Object.keys(dailyCountsMap).map(Number).sort((a, b) => a - b);
  const derivedDayCount = workshopPillars.length > 0 ? workshopPillars.length : Math.max(activeDayKeys.length, 1);

  const dynamicDays = Array.from({ length: derivedDayCount }, (_, idx) => {
    const dayNum = idx + 1;
    const pillar = workshopPillars[idx];
    const pillarTitle = pillar?.title ? pillar.title.replace(/^Day\s*\d+:\s*/i, "") : `Session ${dayNum}`;

    let dateLabel = `Day ${dayNum}`;
    if (event?.startsAt) {
      const baseDate = new Date(event.startsAt);
      if (!isNaN(baseDate.getTime())) {
        baseDate.setDate(baseDate.getDate() + idx);
        dateLabel = baseDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      }
    }

    const count = dailyCountsMap[dayNum] ?? (dayNum === 1 && derivedDayCount === 1 ? checkedInCount : 0);
    const pct = totalRegistered > 0 ? Math.round((count / totalRegistered) * 100) : 0;
    const prevCount = dayNum > 1 ? (dailyCountsMap[dayNum - 1] ?? 0) : totalRegistered;
    const retentionFromPrev = prevCount > 0 ? Math.round((count / prevCount) * 100) : 0;

    return {
      day: dayNum,
      title: pillarTitle,
      date: dateLabel,
      color: googleColors[idx % googleColors.length],
      count,
      pct,
      retentionFromPrev,
      tags: pillar?.tags || [],
    };
  });

  const completionCount = stats.multiDayCompletionCount ?? 0;
  const completionPct = totalRegistered > 0 ? Math.round((completionCount / totalRegistered) * 100) : 0;

  // Flattened data for Google Sheets export
  const exportRows = [
    { category: "Overview", metric: "Event Slug", value: slug },
    { category: "Overview", metric: "Event Title", value: eventTitle },
    { category: "Overview", metric: "Configured Capacity", value: totalCapacity },
    { category: "Overview", metric: "Total Cohort Registered", value: totalRegistered },
    { category: "Overview", metric: "Seats Remaining", value: remainingSeats },
    { category: "Overview", metric: "Capacity Claimed", value: `${percentClaimed}%` },
    { category: "Overview", metric: "Attendance Verified (Gate Check-in)", value: checkedInCount },
    { category: "Overview", metric: "Pending Gate Arrival", value: pendingCheckIn },
    { category: "Overview", metric: "Overall Check-in Rate", value: `${checkInRate}%` },
    ...dynamicDays.map((d) => ({
      category: "Multi-Day Attendance",
      metric: `Day ${d.day} (${d.date}) - ${d.title}`,
      value: d.count,
    })),
    {
      category: "Multi-Day Attendance",
      metric: "Completed All Days (GDG Certificate Qualified)",
      value: completionCount,
    },
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
    { category: "Institution", metric: "VCET Students (In-House)", value: vcetCount },
    { category: "Institution", metric: "External College Students", value: otherCount },
    { category: "Institution", metric: "VCET In-House Share", value: `${vcetPct}%` },
    ...(stats.collegeStats?.topColleges?.map((tc) => ({
      category: "Top External Colleges",
      metric: tc.college,
      value: tc.count,
    })) || []),
    ...rawTracks.map(([track, count]) => ({
      category: "Track Preferences",
      metric: track,
      value: count,
    })),
    ...timelineData.map((td) => ({
      category: "Registration Intake Timeline",
      metric: `${td.dateStr} Daily / Cumulative`,
      value: `${td.count} joined / ${td.cumulative} total`,
    })),
  ];

  function handleDownloadSheets() {
    downloadForGoogleSheets(
      `gdg_vcet_${slug}_analytics_${new Date().toISOString().slice(0, 10)}`,
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

  // Circular gauge calculations for gate verification
  const ringRadius = 40;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringStrokeOffset = ringCircumference - (checkInRate / 100) * ringCircumference;

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
            Real-time cohort insights, multi-day retention funnel, and registration intake velocity.
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

      {/* Hero KPI Cards with Dynamic Progress */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cohort */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <span>Total Cohort</span>
              <span className="text-base">👥</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-slate-900">{totalRegistered}</span>
              <span className="text-xs font-bold text-slate-500">/ {totalCapacity} Cap</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-1.5">
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#4285F4] h-full rounded-full transition-all duration-500"
                style={{ width: `${percentClaimed}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-500 font-medium">
              <span>Capacity: {totalCapacity}</span>
              <span className="font-bold text-[#1a73e8]">{percentClaimed}% filled</span>
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
              <span className="text-3xl sm:text-4xl font-black text-emerald-600">{remainingSeats}</span>
              <span className="text-xs font-bold text-emerald-700">Open</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Seat Availability</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
              {remainingSeats > 0 ? `${remainingSeats} Left` : "Cap Reached"}
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
              <span className="text-3xl sm:text-4xl font-black text-[#34A853]">{checkedInCount}</span>
              <span className="text-xs font-bold text-slate-500">at Gate Desk</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Gate Verified</span>
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
            <span className="text-slate-500">Intake Policy</span>
            <span className="font-mono font-bold text-slate-800">
              {stats.isOpen ? "Instant Pass Issuing" : "Intake Paused"}
            </span>
          </div>
        </div>
      </div>

      {/* INFOGRAPHIC SECTION 1: Dual Overview (Intake Velocity Chart + Gate Radial Ring) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Infographic: Registration Intake Velocity & Growth Curve (2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base">📈</span>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Registration Intake Velocity &amp; Daily Inflow
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Daily registration momentum, surge dates, and cumulative cohort build-up.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200">
                Avg: {avgVelocity} / day
              </span>
              {peakIntakeEntry ? (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200">
                  Peak: {peakIntakeEntry.count} ({peakIntakeEntry.dateStr})
                </span>
              ) : null}
            </div>
          </div>

          {timelineData.length > 0 ? (
            <div className="flex flex-col gap-4">
              {/* SVG / Bar Timeline Graph */}
              <div className="h-44 w-full flex items-end gap-2 pt-6 pb-2 px-2 border-b border-slate-100">
                {timelineData.map((d) => {
                  const barHeightPct = Math.max(12, Math.round((d.count / maxIntakePerDay) * 100));
                  return (
                    <div
                      key={d.dateStr}
                      className="flex-1 flex flex-col items-center justify-end h-full group relative"
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity bg-slate-900 text-white text-[11px] font-semibold py-1 px-2 rounded-md shadow-lg whitespace-nowrap z-20">
                        {d.dateStr}: {d.count} registrations (Total: {d.cumulative})
                      </div>

                      {/* Value Count badge */}
                      <span className="text-[10px] font-bold text-slate-500 mb-1">
                        {d.count}
                      </span>

                      {/* Bar visual */}
                      <div
                        className="w-full max-w-[48px] rounded-t-lg bg-gradient-to-t from-[#1a73e8] to-[#4285F4] transition-all duration-500 hover:brightness-110 shadow-xs"
                        style={{ height: `${barHeightPct}%` }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Date Labels under bars */}
              <div className="flex items-center gap-2 px-2 text-[11px] text-slate-500 font-medium justify-between">
                {timelineData.map((d) => (
                  <div key={d.dateStr} className="flex-1 text-center truncate">
                    {d.dateStr.slice(5)}
                  </div>
                ))}
              </div>

              {/* Cumulative Progress Spectrum Bar */}
              <div className="pt-2 flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                  <span>Cohort Cumulative Trajectory</span>
                  <span className="font-mono text-[#1a73e8]">
                    {totalRegistered} / {totalCapacity} Seats ({percentClaimed}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#4285F4] via-[#34A853] to-[#FBBC05] rounded-full transition-all duration-500"
                    style={{ width: `${percentClaimed}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              Registration dates will populate automatically as entries are recorded.
            </div>
          )}
        </div>

        {/* Infographic: Gate Verification Radial Donut & Check-in Split (1 col) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between gap-5">
          <div className="pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-base">🎯</span>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Gate Arrival &amp; Verification
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live scanner desk rate and attendee check-in split.
            </p>
          </div>

          {/* Radial Ring Infographic */}
          <div className="flex flex-col items-center justify-center py-2 relative">
            <svg className="w-36 h-36 -rotate-90 transform" viewBox="0 0 100 100">
              {/* Background ring */}
              <circle
                cx="50"
                cy="50"
                r={ringRadius}
                fill="transparent"
                stroke="#F1F5F9"
                strokeWidth="10"
              />
              {/* Progress ring */}
              <circle
                cx="50"
                cy="50"
                r={ringRadius}
                fill="transparent"
                stroke="#34A853"
                strokeWidth="10"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringStrokeOffset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            </svg>

            {/* Inner ring content */}
            <div className="absolute flex flex-col items-center text-center">
              <span className="text-2xl font-black text-slate-900">{checkInRate}%</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Verified
              </span>
            </div>
          </div>

          {/* Verification Status Breakdown */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                Checked In
              </span>
              <span className="text-xl font-black text-emerald-950">{checkedInCount}</span>
              <span className="text-[10px] text-emerald-700">QR Badges active</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Pending Arrival
              </span>
              <span className="text-xl font-black text-slate-800">{pendingCheckIn}</span>
              <span className="text-[10px] text-slate-500">Awaiting gate scan</span>
            </div>
          </div>

          {/* Terminal Action Pill */}
          <Link
            href={`/admin/console/events/${slug}/check-in`}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all active:scale-[0.98]"
          >
            <span>Open Check-in Terminal</span>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      </div>

      {/* INFOGRAPHIC SECTION 2: Multi-Day Workshop Attendance & Retention Funnel */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">📊</span>
              <h2 className="text-base font-bold text-slate-900">
                Multi-Day Workshop Attendance &amp; Retention Funnel
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live attendance tracking, step-down continuation rates, and certificate completion across all sessions.
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 self-start sm:self-auto inline-flex items-center gap-1.5">
            <span>🎓</span>
            <span>{completionCount} Fully Qualified for Certification</span>
          </span>
        </div>

        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(dynamicDays.length + 1, 5)} gap-3.5`}>
          {dynamicDays.map((d) => (
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
                  <span className="text-3xl font-black text-slate-900">{d.count}</span>
                  <span className="text-xs text-slate-500 font-medium">/ {totalRegistered}</span>
                </div>
                <div className="text-[11px] font-semibold text-slate-600 truncate mt-0.5">
                  {d.title}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${d.pct}%`, backgroundColor: d.color }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                  <span>Cohort Retention</span>
                  <span className="font-bold text-slate-800">{d.pct}%</span>
                </div>
                {d.day > 1 ? (
                  <div className="text-[9px] text-slate-400 font-medium text-right">
                    {d.retentionFromPrev}% from Day {d.day - 1}
                  </div>
                ) : null}
              </div>
            </div>
          ))}

          {/* Certificate Qualification Card */}
          <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 flex flex-col justify-between gap-3 shadow-xs">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-emerald-950">Workshop Complete</span>
              <span className="text-emerald-800 text-[11px] font-black px-2 py-0.5 rounded-md bg-white/80 border border-emerald-300">
                {completionPct}%
              </span>
            </div>

            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-emerald-900">{completionCount}</span>
                <span className="text-xs text-emerald-800 font-medium">attendees</span>
              </div>
              <div className="text-[11px] font-bold text-emerald-800 mt-0.5">
                Full Multi-Day Attendance
              </div>
            </div>

            <div className="space-y-1">
              <div className="w-full bg-emerald-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#34A853] h-full rounded-full transition-all duration-500"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
              <span className="text-[10px] text-emerald-900 font-bold block truncate">
                Eligible for GDG Certificate
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* INFOGRAPHIC SECTION 3: 4-Column Demographics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Academic Year with Segmented Spectrum Infographic */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-base">🎓</span>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Academic Year
              </h2>
            </div>
            <span className="text-[11px] text-slate-500 font-semibold">{peakYearLabel}</span>
          </div>

          {/* Multi-Year Stacked Spectrum Bar */}
          {sortedYears.length > 0 && totalRegistered > 0 ? (
            <div className="flex flex-col gap-1.5">
              <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100">
                {sortedYears.map(([year, count]) => {
                  const pct = Math.round((count / totalRegistered) * 100);
                  const color = YEAR_COLORS[year] || "#4285F4";
                  return (
                    <div
                      key={year}
                      title={`${year}: ${count} (${pct}%)`}
                      style={{ width: `${pct}%`, backgroundColor: color }}
                      className="h-full transition-all duration-500 hover:opacity-90"
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 font-medium">
                <span>1st Year</span>
                <span>4th Year</span>
              </div>
            </div>
          ) : null}

          {/* Chronological Breakdown List */}
          <div className="flex flex-col gap-3.5 text-xs">
            {sortedYears.map(([year, count]) => {
              const pct = totalRegistered > 0 ? Math.round((count / totalRegistered) * 100) : 0;
              const barColor = YEAR_COLORS[year] || "#34A853";
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
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: barColor }}
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
                Departments
              </h2>
            </div>
            <span className="text-[11px] text-slate-500 font-semibold">{peakDeptLabel}</span>
          </div>

          <div className="flex flex-col gap-3.5 text-xs">
            {sortedDepartments.map(([dept, count]) => {
              const pct = totalRegistered > 0 ? Math.round((count / totalRegistered) * 100) : 0;
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

        {/* 3. Skill & Experience Profile */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-base">⚡</span>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Experience Level
              </h2>
            </div>
            <span className="text-[11px] text-slate-500 font-semibold">
              {topExpEntry ? `${topExpEntry[0]} Dominant` : "Skill Profile"}
            </span>
          </div>

          <div className="flex flex-col gap-3.5 text-xs">
            {sortedExperience.length > 0 ? (
              sortedExperience.map(([exp, count]) => {
                const pct = totalRegistered > 0 ? Math.round((count / totalRegistered) * 100) : 0;
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

            {/* Dynamic Instructor Recommendation Note */}
            <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[10px] text-slate-600 leading-relaxed">
              <strong className="text-slate-800 block mb-0.5">Instructor Insight:</strong>
              {expPacingInsight}
            </div>
          </div>
        </div>

        {/* 4. Campus Representation (VCET In-House vs Other Colleges) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-base">🏫</span>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Campus Reach
              </h2>
            </div>
            <span className="text-[11px] text-slate-500 font-semibold">{vcetPct}% VCET</span>
          </div>

          <div className="flex flex-col gap-3.5 text-xs">
            {/* VCET In-House */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center font-medium">
                <span className="font-semibold text-slate-800">VCET (In-House)</span>
                <span className="font-mono font-bold text-slate-900">
                  {vcetCount} <span className="text-slate-400 font-normal">({vcetPct}%)</span>
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#1a73e8] h-full rounded-full transition-all duration-500"
                  style={{ width: `${vcetPct}%` }}
                />
              </div>
            </div>

            {/* External Colleges */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center font-medium">
                <span className="font-semibold text-slate-800">External Colleges</span>
                <span className="font-mono font-bold text-slate-900">
                  {otherCount} <span className="text-slate-400 font-normal">({otherPct}%)</span>
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#EA4335] h-full rounded-full transition-all duration-500"
                  style={{ width: `${otherPct}%` }}
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

      {/* INFOGRAPHIC SECTION 4: Track Preference Breakdown */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base">🚀</span>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Track Preferences &amp; Cohort Enrollment Distribution
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live breakdown of attendee track selections from registration records.
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 self-start sm:self-auto">
            {rawTracks.length} Track{rawTracks.length === 1 ? "" : "s"} Active
          </span>
        </div>

        {rawTracks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rawTracks.map(([trackName, count]) => {
              const pct = totalTrackSum > 0 ? Math.round((count / totalTrackSum) * 100) : 0;
              return (
                <div
                  key={trackName}
                  className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 flex flex-col justify-between gap-3"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900 text-sm truncate pr-2">
                      {trackName}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100/80 text-blue-900 font-bold text-xs shrink-0">
                      {pct}%
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#1a73e8] h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                      <span>{count} Registered Attendees</span>
                      <span>of {totalTrackSum} track selections</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-slate-400 text-xs">
            No track preference records found.
          </div>
        )}
      </div>
    </div>
  );
}
