import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { getAllEventsAsync, getEventStatsAsync, type EventStats } from "@/lib/db";
import { formatEventDateRange } from "@/lib/events";
import { AdminHeader } from "@/components/admin/admin-header";
import { ConsoleOverviewExport } from "@/components/admin/console-overview-export";
import { EventStatusToggle } from "@/components/admin/event-status-toggle";

export const metadata = {
  title: "Admin Console · GDG on Campus VCET",
};

function createFallbackStats(capacity = 150): EventStats {
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

async function AdminConsoleContent() {
  await connection();

  const allEvents = await getAllEventsAsync();
  const statsEntries = await Promise.all(
    allEvents.map(async (e): Promise<[string, EventStats]> => {
      try {
        const stats = await getEventStatsAsync(e.slug);
        return [e.slug, stats];
      } catch {
        return [e.slug, createFallbackStats(e.workshop?.capacity ?? 150)];
      }
    })
  );

  const statsBySlug = new Map<string, EventStats>(statsEntries);
  const devcraftStats = statsBySlug.get("devcraft-2025") ?? createFallbackStats(150);

  const totalRegisteredAll = statsEntries.reduce((sum, [, s]) => sum + s.totalRegistered, 0);
  const activeEventsCount = statsEntries.filter(([, s]) => isEventRegistrationOpen(s)).length;
  const totalCheckedInAll = statsEntries.reduce((sum, [, s]) => sum + s.checkedInCount, 0);
  const totalCapacityAll = statsEntries.reduce((sum, [, s]) => sum + s.capacity, 0);

  const flagshipWorkshop = allEvents.find((e) => e.slug === "devcraft-2025");
  const otherEventsList = allEvents.filter((e) => e.slug !== "devcraft-2025");

  return (
    <div className="min-h-screen bg-surface-container-low flex flex-col">
      <AdminHeader currentTab="overview" eventSlug="devcraft-2025" />

      <main className="flex-1 max-w-(--container-max) w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        {/* Page Heading */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Event Management &amp; Community Operations
            </h1>
            <p className="text-sm text-foreground-muted mt-1">
              Centralized administrative workspace for GDG on Campus VCET organizers.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/admin/console/events/new"
              className="inline-flex items-center gap-2 bg-primary text-on-primary px-3.5 py-1.5 rounded-xl text-xs font-semibold hover:bg-primary-hover shadow-2xs active:scale-[0.98] transition-all cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Create Event</span>
            </Link>
            <ConsoleOverviewExport events={allEvents} devcraftStats={devcraftStats} />
            <span className="inline-flex items-center gap-1.5 bg-status-success/10 text-status-success px-3 py-1.5 rounded-xl text-xs font-semibold border border-status-success/20">
              <span className="w-2 h-2 rounded-full bg-status-success animate-pulse"></span>
              <span>Sync Active</span>
            </span>
          </div>
        </div>

        {/* Global Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex flex-col gap-1">
            <span className="text-xs font-bold text-foreground-muted uppercase tracking-wider">
              Total Registered
            </span>
            <span className="text-3xl font-bold text-primary">
              {totalRegisteredAll}
            </span>
            <span className="text-xs text-foreground-muted mt-1">
              Across {totalCapacityAll} total seats
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex flex-col gap-1">
            <span className="text-xs font-bold text-foreground-muted uppercase tracking-wider">
              Active Events
            </span>
            <span className="text-3xl font-bold text-foreground">
              {activeEventsCount}
            </span>
            <span className="text-xs text-foreground-muted mt-1">
              Accepting registrations now
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex flex-col gap-1">
            <span className="text-xs font-bold text-foreground-muted uppercase tracking-wider">
              Checked-in
            </span>
            <span className="text-3xl font-bold text-secondary">
              {totalCheckedInAll}
            </span>
            <span className="text-xs text-foreground-muted mt-1">
              Verified entrance badges
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex flex-col gap-1">
            <span className="text-xs font-bold text-foreground-muted uppercase tracking-wider">
              Total Chapter Events
            </span>
            <span className="text-3xl font-bold text-foreground">
              {allEvents.length}
            </span>
            <span className="text-xs text-foreground-muted mt-1">
              Active &amp; chapter archives
            </span>
          </div>
        </div>

        {/* Flagship Active Event Section */}
        {flagshipWorkshop ? (
          <div className="bg-white rounded-3xl border border-border shadow-xs p-6 sm:p-8 flex flex-col gap-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-primary shrink-0"></span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant text-[11px] font-bold">
                      FLAGSHIP WORKSHOP
                    </span>
                    <EventStatusToggle
                      eventSlug="devcraft-2025"
                      initialIsOpen={isEventRegistrationOpen(devcraftStats)}
                      compact
                    />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mt-1.5">
                    {flagshipWorkshop.title}
                  </h2>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/admin/console/events/devcraft-2025/registrations"
                  className="inline-flex items-center gap-1.5 bg-primary text-on-primary px-4 py-2 rounded-full text-xs font-semibold hover:bg-primary-hover transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">group</span>
                  <span>Registrations ({devcraftStats.totalRegistered})</span>
                </Link>
                <Link
                  href="/admin/console/events/devcraft-2025/check-in"
                  className="inline-flex items-center gap-1.5 bg-surface-container text-foreground px-4 py-2 rounded-full text-xs font-semibold hover:bg-surface-container-high transition-all border border-border"
                >
                  <span className="material-symbols-outlined text-[16px] text-secondary">qr_code_scanner</span>
                  <span>Check-in</span>
                </Link>
                <Link
                  href="/admin/console/events/devcraft-2025/analytics"
                  className="inline-flex items-center gap-1.5 bg-surface-container text-foreground px-4 py-2 rounded-full text-xs font-semibold hover:bg-surface-container-high transition-all border border-border"
                >
                  <span className="material-symbols-outlined text-[16px] text-primary">bar_chart</span>
                  <span>Analytics</span>
                </Link>
                <Link
                  href="/admin/console/events/devcraft-2025/edit"
                  className="inline-flex items-center gap-1.5 bg-surface-container text-foreground px-4 py-2 rounded-full text-xs font-semibold hover:bg-surface-container-high transition-all border border-border"
                >
                  <span>Edit</span>
                </Link>
                <Link
                  href="/events/devcraft-2025/register"
                  className="inline-flex items-center gap-1.5 bg-white text-primary px-4 py-2 rounded-full text-xs font-semibold hover:bg-primary-fixed/40 transition-all border border-border"
                >
                  <span>Public Form</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </Link>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-surface-container-low border border-border/50 flex flex-col gap-1">
                <span className="text-xs text-foreground-muted">Dates &amp; Time</span>
                <span className="text-sm font-bold text-foreground">
                  {formatEventDateRange(flagshipWorkshop)}
                </span>
                <span className="text-xs text-foreground-muted capitalize">
                  {flagshipWorkshop.format ?? "in-person"} event
                </span>
              </div>
              <div className="p-4 rounded-xl bg-surface-container-low border border-border/50 flex flex-col gap-1">
                <span className="text-xs text-foreground-muted">Location / Labs</span>
                <span className="text-sm font-bold text-foreground">
                  {flagshipWorkshop.location || "VCET Vasai · Labs 402, 403 & Auditorium"}
                </span>
                <span className="text-xs text-foreground-muted">Collegiate chapter venue</span>
              </div>
              <div className="p-4 rounded-xl bg-surface-container-low border border-border/50 flex flex-col gap-1">
                <span className="text-xs text-foreground-muted">Capacity Status</span>
                <span className="text-sm font-bold text-primary">
                  {devcraftStats.totalRegistered} / {devcraftStats.capacity} Seats Claimed
                </span>
                <span className="text-xs text-secondary font-medium">
                  {devcraftStats.remaining} seats remaining before auto-waitlist
                </span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Chapter Events Archive & New Events */}
        <div className="bg-white rounded-3xl border border-border shadow-xs p-6 sm:p-8 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">
              Chapter Events Directory ({otherEventsList.length})
            </h2>
            <span className="text-xs text-foreground-muted">Live sync from Firestore &amp; archive</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-border text-foreground-muted font-bold text-[11px] uppercase tracking-wider bg-surface-container-low/50">
                <tr>
                  <th className="py-3 px-4">Event Title</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Format</th>
                  <th className="py-3 px-4">Seats</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {otherEventsList.map((e) => {
                  const eventStats = statsBySlug.get(e.slug) ?? createFallbackStats(e.workshop?.capacity ?? 150);
                  const eventIsOpen = isEventRegistrationOpen(eventStats);

                  return (
                    <tr key={e.id} className="hover:bg-surface-container-low/30 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-foreground">
                        <div>{e.title}</div>
                        {e.location ? (
                          <div className="text-[11px] font-normal text-foreground-muted truncate max-w-xs">
                            {e.location}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-3.5 px-4 text-foreground-muted font-mono whitespace-nowrap">
                        {formatEventDateRange(e)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-surface-container text-foreground-muted text-xs capitalize">
                          {e.format ?? "in-person"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs font-semibold text-foreground whitespace-nowrap">
                        <span className="text-primary">{eventStats.totalRegistered}</span>
                        <span className="text-foreground-muted"> / {eventStats.capacity}</span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <EventStatusToggle
                          eventSlug={e.slug}
                          initialIsOpen={eventIsOpen}
                          compact
                        />
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-3">
                          <Link
                            href={`/admin/console/events/${e.slug}/registrations`}
                            className="text-primary hover:text-primary-hover font-semibold text-xs"
                          >
                            Registrations
                          </Link>
                          <Link
                            href={`/admin/console/events/${e.slug}/check-in`}
                            className="text-foreground-muted hover:text-foreground font-semibold text-xs"
                          >
                            Check-in
                          </Link>
                          <Link
                            href={`/admin/console/events/${e.slug}/analytics`}
                            className="text-foreground-muted hover:text-foreground font-semibold text-xs"
                          >
                            Analytics
                          </Link>
                          <Link
                            href={`/admin/console/events/${e.slug}/edit`}
                            className="text-foreground-muted hover:text-foreground font-semibold text-xs"
                          >
                            Edit
                          </Link>
                          <Link
                            href={`/events/${e.slug}/register`}
                            className="text-foreground-muted hover:text-primary font-semibold inline-flex items-center gap-1 text-xs"
                          >
                            <span>Public Form</span>
                            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AdminConsolePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface-container-low p-8 text-sm text-foreground-muted">
          Loading Admin Console…
        </div>
      }
    >
      <AdminConsoleContent />
    </Suspense>
  );
}

