import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getAllEventsAsync,
  getEventStatsAsync,
  getRegistrationsAsync,
  type EventStats,
} from "@/lib/db";
import type { RegistrationRecord } from "@/types";
import { formatEventDateRange } from "@/lib/events";
import { getAdminRoleFromCookies } from "@/lib/auth";
import { AdminHeader } from "@/components/admin/admin-header";
import { ConsoleOverviewExport } from "@/components/admin/console-overview-export";
import { EventStatusToggle } from "@/components/admin/event-status-toggle";
import { ChapterEventsDirectory } from "@/components/admin/chapter-events-directory";
import { AdminPageSkeleton } from "@/components/skeletons/admin-skeletons";

export const metadata = {
  title: "Admin Console · GDG on Campus VCET",
};

function createFallbackStats(capacity = 135): EventStats {
  return {
    totalRegistered: 0,
    capacity,
    remaining: capacity,
    percentFilled: 0,
    isOpen: true,
    checkedInCount: 0,
    trackCounts: {},
    yearCounts: {},
    departmentCounts: {},
  };
}

function isEventRegistrationOpen(stats?: EventStats): boolean {
  return (
    (stats as { isRegistrationOpen?: boolean; isOpen: boolean } | undefined)
      ?.isRegistrationOpen ??
    stats?.isOpen ??
    true
  );
}

function computeVelocityStats(registrations: RegistrationRecord[]) {
  if (registrations.length === 0) {
    return { avg: "0", peakCount: 0, peakDate: "N/A" };
  }
  const dateCounts: Record<string, number> = {};
  for (const r of registrations) {
    const d = r.createdAt ? r.createdAt.slice(0, 10) : "2026-11-19";
    dateCounts[d] = (dateCounts[d] ?? 0) + 1;
  }
  const dates = Object.keys(dateCounts);
  const totalDays = Math.max(dates.length, 1);
  const avg = (registrations.length / totalDays).toFixed(1);
  let peakDate = dates[0] ?? "N/A";
  let peakCount = 0;
  for (const [d, count] of Object.entries(dateCounts)) {
    if (count > peakCount) {
      peakCount = count;
      peakDate = d;
    }
  }
  return { avg, peakCount, peakDate };
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-emerald-100 text-emerald-700 border-emerald-200",
  "bg-purple-100 text-purple-700 border-purple-200",
  "bg-amber-100 text-amber-800 border-amber-200",
  "bg-rose-100 text-rose-700 border-rose-200",
];

async function AdminConsoleContent() {
  await connection();

  const role = await getAdminRoleFromCookies();
  const allEvents = await getAllEventsAsync();

  const flagshipWorkshop =
    allEvents.find((e) => e.slug === "dev-to-cloud") ??
    allEvents.find((e) => Boolean(e.workshop)) ??
    allEvents[0];
  const flagshipSlug = flagshipWorkshop?.slug ?? "dev-to-cloud";

  // Role Rule: Volunteer Desk is restricted to Registrations, Check-in, and Analytics only (no Dashboard)
  if (role === "volunteer") {
    redirect(`/admin/console/events/${flagshipSlug}/check-in`);
  }

  // Fetch registrations once (populates shared cache for flagshipStats too) instead of scanning every archived event
  let flagshipRegistrations: RegistrationRecord[] = [];
  let flagshipStats = createFallbackStats(
    flagshipWorkshop?.capacity ?? flagshipWorkshop?.workshop?.capacity ?? 135
  );
  try {
    flagshipRegistrations = await getRegistrationsAsync(flagshipSlug);
    flagshipStats = await getEventStatsAsync(flagshipSlug);
  } catch {
    // fallback to defaults
  }

  // Derive lightweight summary stats for directory rows directly from event docs (0 extra Firestore reads)
  const statsEntries: [string, EventStats][] = allEvents.map((e) => {
    if (e.slug === flagshipSlug) {
      return [e.slug, flagshipStats];
    }
    const cap = e.capacity ?? e.workshop?.capacity ?? 135;
    const regCount = e.registeredCount ?? e.workshop?.initialRegisteredCount ?? 0;
    const remaining = Math.max(0, cap - regCount);
    const open =
      e.isRegistrationOpen ?? e.workshop?.registrationConfig?.isOpen ?? true;
    return [
      e.slug,
      {
        totalRegistered: regCount,
        capacity: cap,
        remaining,
        percentFilled: cap > 0 ? Math.min(100, Math.round((regCount / cap) * 100)) : 100,
        isOpen: Boolean(open) && remaining > 0,
        isRegistrationOpen: Boolean(open),
        checkedInCount: 0,
        trackCounts: {},
        yearCounts: {},
        departmentCounts: {},
      },
    ];
  });

  const statsBySlug = new Map<string, EventStats>(statsEntries);
  const statsRecord: Record<string, EventStats> = {};
  statsEntries.forEach(([slug, s]) => {
    statsRecord[slug] = s;
  });

  const activeFlagshipRegistrations = flagshipRegistrations.filter((r) => r.status !== "cancelled");
  const recentRegistrations = activeFlagshipRegistrations.slice(0, 5);
  const velocityStats = computeVelocityStats(activeFlagshipRegistrations);

  // Group events into active vs historical
  const activeEventsList = allEvents.filter((e) => {
    const stats = statsBySlug.get(e.slug);
    const isOpen = isEventRegistrationOpen(stats);
    return (
      Boolean(e.registrationUrl) ||
      (isOpen && (!e.endsAt || new Date(e.endsAt) >= new Date("2026-11-01")))
    );
  });
  const archivedEventsList = allEvents.filter((e) => !activeEventsList.includes(e));

  const totalCapacityAll = statsEntries.reduce((sum, [, s]) => sum + s.capacity, 0);

  const gateVerificationRate = Math.round(
    (flagshipStats.checkedInCount / Math.max(flagshipStats.totalRegistered, 1)) * 100
  );

  // Top departments breakdown
  const topDepartments = Object.entries(flagshipStats.departmentCounts || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  // Top years breakdown
  const topYears = Object.entries(flagshipStats.yearCounts || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-surface-container-low flex flex-col">
      <AdminHeader currentTab="overview" eventSlug={flagshipSlug} initialRole={role} />

      <main className="flex-1 max-w-(--container-max) w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        {/* Google 4-Color Brand Accent Strip */}
        <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC04] to-[#34A853] shadow-xs" />

        {/* Executive Chapter Command Center Greeting */}
        <div className="bg-white rounded-3xl border border-border shadow-xs p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Google Developer Groups on Campus · VCET Chapter
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-foreground-muted text-[11px] font-semibold">
                Winter 2026 Cycle
              </span>
              {role === "admin" ? (
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold inline-flex items-center gap-1">
                  <span>👑</span> Master Admin (Full Control)
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold inline-flex items-center gap-1">
                  <span>🛡️</span> Core Member (Read-Only)
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Chapter Operations &amp; Command Center
            </h1>
            <p className="text-sm text-foreground-muted max-w-2xl">
              Centralized real-time hub for attendee intake velocity, gate scanner telemetry, and flagship 4-day cloud workshop coordination.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {role === "admin" ? (
              <>
                <Link
                  href="/admin/console/events/new"
                  className="inline-flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-xl text-xs font-semibold hover:bg-primary-hover shadow-2xs active:scale-[0.98] transition-all cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>Create Event</span>
                </Link>
                <Link
                  href="/admin/console/settings"
                  prefetch={false}
                  className="inline-flex items-center gap-1.5 bg-surface-container text-foreground px-3.5 py-2 rounded-xl text-xs font-semibold hover:bg-surface-container-high transition-all border border-border"
                >
                  <span className="material-symbols-outlined text-[15px]">tune</span>
                  <span>Site &amp; Team CMS</span>
                </Link>
              </>
            ) : null}

            <ConsoleOverviewExport events={allEvents} workshopStats={flagshipStats} />

            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1.5 bg-surface-container text-foreground px-3.5 py-2 rounded-xl text-xs font-semibold hover:bg-surface-container-high transition-all border border-border"
            >
              <span>Public Chapter</span>
              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            </Link>

            <span className="inline-flex items-center gap-1.5 bg-status-success/10 text-status-success px-3 py-2 rounded-xl text-xs font-semibold border border-status-success/20">
              <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
              <span>Live Telemetry Active</span>
            </span>
          </div>
        </div>

        {/* Executive KPI Infocards (Zero Static Numbers) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Flagship Cohort Intake */}
          <div className="bg-white p-5 rounded-3xl border border-border shadow-xs flex flex-col justify-between gap-3 relative overflow-hidden group hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
                Flagship Cohort Intake
              </span>
              <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[18px]">group</span>
              </span>
            </div>

            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl font-extrabold text-primary tracking-tight">
                  {flagshipStats.totalRegistered}
                </span>
                <span className="text-sm font-semibold text-foreground-muted">
                  / {flagshipStats.capacity} Cap
                </span>
              </div>
              <div className="w-full bg-surface-container rounded-full h-2 mt-2.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${flagshipStats.percentFilled}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[11px]">
                {flagshipStats.remaining} Open Seats
              </span>
              <span className="font-semibold text-foreground-muted text-[11px]">
                {flagshipStats.percentFilled}% filled
              </span>
            </div>
          </div>

          {/* Card 2: Attendance Verified */}
          <div className="bg-white p-5 rounded-3xl border border-border shadow-xs flex flex-col justify-between gap-3 relative overflow-hidden group hover:border-emerald-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
                Gate Check-in Desk
              </span>
              <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
              </span>
            </div>

            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl font-extrabold text-emerald-600 tracking-tight">
                  {flagshipStats.checkedInCount}
                </span>
                <span className="text-sm font-semibold text-foreground-muted">
                  / {flagshipStats.totalRegistered}
                </span>
              </div>
              <div className="w-full bg-surface-container rounded-full h-2 mt-2.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${gateVerificationRate}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px]">
                {gateVerificationRate}% Verified
              </span>
              <span className="font-semibold text-foreground-muted text-[11px]">
                {flagshipStats.totalRegistered - flagshipStats.checkedInCount} Pending
              </span>
            </div>
          </div>

          {/* Card 3: Registration Velocity */}
          <div className="bg-white p-5 rounded-3xl border border-border shadow-xs flex flex-col justify-between gap-3 relative overflow-hidden group hover:border-amber-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
                Intake Velocity
              </span>
              <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[18px]">trending_up</span>
              </span>
            </div>

            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
                  {velocityStats.avg}
                </span>
                <span className="text-sm font-semibold text-foreground-muted">
                  / day avg
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-2.5 text-xs text-foreground-muted">
                <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-bold text-[10px]">
                  Peak: {velocityStats.peakCount}
                </span>
                <span className="text-[11px] truncate">on {velocityStats.peakDate}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
              <span className="text-emerald-600 font-bold text-[11px] inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Intake Active
              </span>
              <span className="text-foreground-muted text-[11px]">
                Auto Pass Ready
              </span>
            </div>
          </div>

          {/* Card 4: Total Chapter Footprint */}
          <div className="bg-white p-5 rounded-3xl border border-border shadow-xs flex flex-col justify-between gap-3 relative overflow-hidden group hover:border-indigo-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
                Community Footprint
              </span>
              <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[18px]">hub</span>
              </span>
            </div>

            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
                  {totalCapacityAll}
                </span>
                <span className="text-sm font-semibold text-foreground-muted">
                  Seats Hosted
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-2.5 text-xs text-foreground-muted">
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-[10px]">
                  {activeEventsList.length} Active
                </span>
                <span className="text-[11px]">{archivedEventsList.length} Archived Sessions</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
              <span className="text-foreground-muted font-bold text-[11px]">
                {allEvents.length} Chapter Initiatives
              </span>
              <span className="text-foreground-muted text-[11px]">
                VCET Students
              </span>
            </div>
          </div>
        </div>

        {/* Flagship Active Event Command Center */}
        {flagshipWorkshop ? (
          <div className="bg-white rounded-3xl border border-border shadow-xs p-6 sm:p-8 flex flex-col gap-6 relative overflow-hidden">
            {/* Top Accent Gradient Line for Flagship */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-primary to-emerald-500" />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-border/50">
              <div className="flex items-start sm:items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                  <span className="material-symbols-outlined text-[24px]">rocket_launch</span>
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant text-[11px] font-bold tracking-wide">
                      FLAGSHIP 4-DAY WORKSHOP
                    </span>
                    {role === "admin" ? (
                      <EventStatusToggle
                        eventSlug={flagshipSlug}
                        initialIsOpen={isEventRegistrationOpen(flagshipStats)}
                        compact
                      />
                    ) : (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${
                          isEventRegistrationOpen(flagshipStats)
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isEventRegistrationOpen(flagshipStats)
                              ? "bg-emerald-500 animate-pulse"
                              : "bg-slate-400"
                          }`}
                        />
                        <span>{isEventRegistrationOpen(flagshipStats) ? "Open" : "Closed"}</span>
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                    {flagshipWorkshop.title}
                  </h2>
                </div>
              </div>

              {/* Public Portal Button */}
              <div className="flex items-center gap-2">
                <Link
                  href={`/events/${flagshipSlug}/register`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 bg-white text-primary px-4 py-2 rounded-xl text-xs font-semibold hover:bg-primary/5 transition-all border border-border shadow-2xs"
                >
                  <span>Public Registration Form</span>
                  <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                </Link>
              </div>
            </div>

            {/* Event Logistics Info Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-surface-container-low/70 border border-border/50 flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted">Dates &amp; Schedule</span>
                <span className="text-sm font-bold text-foreground">
                  {formatEventDateRange(flagshipWorkshop)}
                </span>
                <span className="text-xs text-foreground-muted capitalize">
                  4-Day Intensive · {flagshipWorkshop.format ?? "in-person"} event
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-surface-container-low/70 border border-border/50 flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted">Venue &amp; Computer Labs</span>
                <span className="text-sm font-bold text-foreground truncate">
                  {flagshipWorkshop.location || "VCET Vasai · Seminar Hall & Labs 402, 403"}
                </span>
                <span className="text-xs text-foreground-muted">Collegiate chapter venue</span>
              </div>
              <div className="p-4 rounded-2xl bg-surface-container-low/70 border border-border/50 flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted">Capacity Status</span>
                <span className="text-sm font-bold text-primary">
                  {flagshipStats.totalRegistered} / {flagshipStats.capacity} Seats Claimed
                </span>
                <span className="text-xs text-secondary font-semibold">
                  {flagshipStats.remaining} seats remaining before auto-waitlist
                </span>
              </div>
            </div>

            {/* High-Impact Capacity Progress Gauge */}
            <div className="bg-surface-container-low p-4 rounded-2xl border border-border/50 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground">
                  Cohort Seat Claim Rate:{" "}
                  <span className="text-primary font-extrabold">{flagshipStats.percentFilled}%</span>
                </span>
                <span className="text-foreground-muted">
                  {flagshipStats.remaining} of {flagshipStats.capacity} seats still open
                </span>
              </div>
              <div className="w-full bg-white rounded-full h-3 overflow-hidden p-0.5 border border-border/50">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 via-primary to-emerald-500 transition-all duration-700"
                  style={{ width: `${flagshipStats.percentFilled}%` }}
                />
              </div>
            </div>

            {/* Interactive Quick-Action Command Launchpad */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground-muted">
                  Operational Control Launchpad
                </span>
                <span className="text-xs text-foreground-muted">
                  Direct shortcuts to event tools
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* 1. Registrations Roster */}
                <Link
                  href={`/admin/console/events/${flagshipSlug}/registrations`}
                  className="p-4 rounded-2xl border border-border hover:border-primary/40 hover:bg-surface-container-low/50 transition-all flex items-start gap-3.5 group shadow-2xs"
                >
                  <span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[20px]">group</span>
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                        Attendee Roster
                      </h4>
                      <span className="text-xs font-mono font-bold text-primary">
                        {flagshipStats.totalRegistered}
                      </span>
                    </div>
                    <p className="text-xs text-foreground-muted mt-0.5 line-clamp-1">
                      Search, filter by branch &amp; inspect pass IDs
                    </p>
                  </div>
                </Link>

                {/* 2. Check-in Terminal */}
                <Link
                  href={`/admin/console/events/${flagshipSlug}/check-in`}
                  className="p-4 rounded-2xl border border-border hover:border-emerald-300 hover:bg-surface-container-low/50 transition-all flex items-start gap-3.5 group shadow-2xs"
                >
                  <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-foreground group-hover:text-emerald-600 transition-colors">
                        Check-in Terminal
                      </h4>
                      <span className="text-xs font-mono font-bold text-emerald-600">
                        {flagshipStats.checkedInCount} verified
                      </span>
                    </div>
                    <p className="text-xs text-foreground-muted mt-0.5 line-clamp-1">
                      Rapid camera scanning &amp; manual gate search
                    </p>
                  </div>
                </Link>

                {/* 3. Analytics View */}
                <Link
                  href={`/admin/console/events/${flagshipSlug}/analytics`}
                  className="p-4 rounded-2xl border border-border hover:border-purple-300 hover:bg-surface-container-low/50 transition-all flex items-start gap-3.5 group shadow-2xs"
                >
                  <span className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[20px]">bar_chart</span>
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-foreground group-hover:text-purple-600 transition-colors">
                        Cohort Analytics
                      </h4>
                      <span className="text-xs font-bold text-purple-600">
                        4-Day Funnel
                      </span>
                    </div>
                    <p className="text-xs text-foreground-muted mt-0.5 line-clamp-1">
                      Intake velocity, retention funnel &amp; demographics
                    </p>
                  </div>
                </Link>

                {/* 4. Public Registration Page */}
                <Link
                  href={`/events/${flagshipSlug}/register`}
                  target="_blank"
                  className="p-4 rounded-2xl border border-border hover:border-sky-300 hover:bg-surface-container-low/50 transition-all flex items-start gap-3.5 group shadow-2xs"
                >
                  <span className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-foreground group-hover:text-sky-600 transition-colors">
                        Public Portal
                      </h4>
                      <span className="text-xs font-bold text-sky-600">
                        Live Pass Form
                      </span>
                    </div>
                    <p className="text-xs text-foreground-muted mt-0.5 line-clamp-1">
                      View live registration form as applicants see it
                    </p>
                  </div>
                </Link>

                {/* 5. Email Hub (Master Admin Only) */}
                {role === "admin" ? (
                  <Link
                    href={`/admin/console/events/${flagshipSlug}/email`}
                    className="p-4 rounded-2xl border border-border hover:border-amber-300 hover:bg-surface-container-low/50 transition-all flex items-start gap-3.5 group shadow-2xs"
                  >
                    <span className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-[20px]">mail</span>
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-foreground group-hover:text-amber-700 transition-colors">
                          Email &amp; Broadcast
                        </h4>
                        <span className="text-xs font-bold text-amber-700">
                          Pass Dispatch
                        </span>
                      </div>
                      <p className="text-xs text-foreground-muted mt-0.5 line-clamp-1">
                        Send digital QR passes &amp; logistics updates
                      </p>
                    </div>
                  </Link>
                ) : null}

                {/* 6. Edit Workshop (Master Admin Only) */}
                {role === "admin" ? (
                  <Link
                    href={`/admin/console/events/${flagshipSlug}/edit`}
                    className="p-4 rounded-2xl border border-border hover:border-slate-400 hover:bg-surface-container-low/50 transition-all flex items-start gap-3.5 group shadow-2xs"
                  >
                    <span className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-[20px]">tune</span>
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-foreground group-hover:text-slate-800 transition-colors">
                          Workshop Settings
                        </h4>
                        <span className="text-xs font-bold text-slate-600">
                          Configuration
                        </span>
                      </div>
                      <p className="text-xs text-foreground-muted mt-0.5 line-clamp-1">
                        Edit dates, venue, topics &amp; seat limits
                      </p>
                    </div>
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {/* Two-Column Live Operations Hub: Demographics & Recent Stream */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Column 1: Cohort Telemetry & Department Split */}
          <div className="bg-white rounded-3xl border border-border shadow-xs p-6 flex flex-col justify-between gap-5">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">pie_chart</span>
                  <h3 className="text-base font-bold text-foreground">
                    Cohort Telemetry &amp; Department Mix
                  </h3>
                </div>
                <Link
                  href={`/admin/console/events/${flagshipSlug}/analytics`}
                  className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                >
                  <span>Full Analytics</span>
                  <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                </Link>
              </div>

              {/* Department Split Bars */}
              <div className="mt-4 flex flex-col gap-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted">
                  Top Academic Branches
                </span>
                {topDepartments.map(([dept, count], idx) => {
                  const pct = Math.round((count / Math.max(flagshipStats.totalRegistered, 1)) * 100);
                  const barColors = ["bg-primary", "bg-emerald-500", "bg-amber-500", "bg-purple-500"];
                  return (
                    <div key={dept} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground truncate max-w-[220px]">
                          {dept}
                        </span>
                        <span className="font-mono text-foreground-muted">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColors[idx % barColors.length]}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Academic Seniority Spectrum */}
              <div className="mt-6 pt-4 border-t border-border/40 flex flex-col gap-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted">
                  Academic Year Seniority
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {topYears.map(([year, count]) => {
                    const pct = Math.round((count / Math.max(flagshipStats.totalRegistered, 1)) * 100);
                    return (
                      <div
                        key={year}
                        className="p-2.5 rounded-xl bg-surface-container-low border border-border/40 text-center"
                      >
                        <div className="text-xs font-bold text-foreground">{year}</div>
                        <div className="text-sm font-extrabold text-primary mt-0.5">{count}</div>
                        <div className="text-[10px] text-foreground-muted">{pct}% cohort</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs text-foreground-muted">
              <span>Dynamic aggregation from {flagshipStats.totalRegistered} registered records</span>
              <Link
                href={`/admin/console/events/${flagshipSlug}/analytics`}
                className="text-primary font-semibold hover:underline"
              >
                View 4-day retention →
              </Link>
            </div>
          </div>

          {/* Column 2: Recent Attendee Stream (Live Intake Feed) */}
          <div className="bg-white rounded-3xl border border-border shadow-xs p-6 flex flex-col justify-between gap-5">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-[20px]">how_to_reg</span>
                  <h3 className="text-base font-bold text-foreground">
                    Live Attendee Stream ({recentRegistrations.length})
                  </h3>
                </div>
                <Link
                  href={`/admin/console/events/${flagshipSlug}/registrations`}
                  className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                >
                  <span>View All {flagshipStats.totalRegistered}</span>
                  <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                </Link>
              </div>

              {recentRegistrations.length === 0 ? (
                <div className="py-12 text-center text-foreground-muted text-xs">
                  No registrations recorded yet.
                </div>
              ) : (
                <div className="mt-3 divide-y divide-border/40">
                  {recentRegistrations.map((reg, idx) => {
                    const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                    return (
                      <div
                        key={reg.id}
                        className="py-3 flex items-center justify-between gap-3 hover:bg-surface-container-low/40 px-2 rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`w-9 h-9 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 border ${avatarColor}`}
                          >
                            {getInitials(reg.fullName)}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-foreground truncate">
                                {reg.fullName}
                              </span>
                              <span className="px-1.5 py-0.5 rounded-md bg-surface-container text-foreground-muted text-[10px] font-mono">
                                {reg.yearOfStudy || "Student"}
                              </span>
                            </div>
                            <div className="text-[11px] text-foreground-muted truncate">
                              {reg.department || "Engineering"} · {reg.email}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              reg.checkedIn
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {reg.checkedIn ? "Checked In" : "Confirmed"}
                          </span>
                          <span className="text-[10px] font-mono text-foreground-muted">
                            {reg.referenceId.slice(0, 16)}…
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs text-foreground-muted">
              <span>Showing latest 5 of {flagshipStats.totalRegistered} attendees</span>
              <Link
                href={`/admin/console/events/${flagshipSlug}/registrations`}
                className="text-primary font-semibold hover:underline"
              >
                Inspect roster table →
              </Link>
            </div>
          </div>
        </div>

        {/* Chapter Events Portfolio & Directory */}
        <ChapterEventsDirectory
          events={allEvents}
          statsBySlug={statsRecord}
          role={role}
        />
      </main>
    </div>
  );
}

export default function AdminConsolePage() {
  return (
    <Suspense fallback={<AdminPageSkeleton label="Loading Admin Console…" />}>
      <AdminConsoleContent />
    </Suspense>
  );
}
