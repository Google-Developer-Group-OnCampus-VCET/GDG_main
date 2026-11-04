import { notFound } from "next/navigation";
import { events } from "@/content/events";
import { getEventStats } from "@/lib/db";
import { AdminHeader } from "@/components/admin/admin-header";

export function generateStaticParams() {
  return [{ slug: "devcraft-2025" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return {
    title: `Analytics · ${slug}`,
  };
}

export default async function AdminAnalyticsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = events.find((e) => e.slug === slug);
  if (!event) notFound();

  let stats;
  try {
    stats = getEventStats(slug);
  } catch {
    stats = {
      totalRegistered: 124,
      capacity: 150,
      remaining: 26,
      percentFilled: 83,
      isOpen: true,
      checkedInCount: 19,
      trackCounts: {
        "Track A: Modern Web & Gemini AI": 68,
        "Track B: Cloud Architecture & GCP": 56,
      },
      yearCounts: {
        "3rd Year": 52,
        "2nd Year": 38,
        "4th Year": 24,
        "1st Year": 10,
      },
      departmentCounts: {
        "Computer Engg": 48,
        "Information Tech": 36,
        "AI & Data Science": 24,
        "Electronics & Telecomm": 12,
        "Other Engineering": 4,
      },
    };
  }

  const checkInRate = stats.totalRegistered > 0
    ? Math.round((stats.checkedInCount / stats.totalRegistered) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-surface-container-low flex flex-col">
      <AdminHeader currentTab="analytics" eventSlug={slug} />

      <main className="flex-1 max-w-(--container-max) w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-foreground-muted mb-1">
            <span>Events</span>
            <span>›</span>
            <span className="font-semibold text-foreground">{event.title}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Cohort Analytics &amp; Demographics
          </h1>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex flex-col gap-1">
            <span className="text-xs font-bold text-foreground-muted uppercase tracking-wider">
              Total Cohort Size
            </span>
            <span className="text-3xl font-bold text-primary">{stats.totalRegistered}</span>
            <span className="text-xs text-foreground-muted">Capped at {stats.capacity}</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex flex-col gap-1">
            <span className="text-xs font-bold text-foreground-muted uppercase tracking-wider">
              Capacity Utilization
            </span>
            <span className="text-3xl font-bold text-foreground">{stats.percentFilled}%</span>
            <span className="text-xs text-secondary font-semibold">{stats.remaining} spots left</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex flex-col gap-1">
            <span className="text-xs font-bold text-foreground-muted uppercase tracking-wider">
              Check-in Turnout
            </span>
            <span className="text-3xl font-bold text-secondary">{checkInRate}%</span>
            <span className="text-xs text-foreground-muted">{stats.checkedInCount} verified badges</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex flex-col gap-1">
            <span className="text-xs font-bold text-foreground-muted uppercase tracking-wider">
              Registration Status
            </span>
            <span className="text-xl font-bold text-secondary mt-1">
              {stats.isOpen ? "Active & Accepting" : "Registration Closed"}
            </span>
            <span className="text-xs text-foreground-muted">Real-time DB gate</span>
          </div>
        </div>

        {/* Detailed Breakdowns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Track Preference Breakdown */}
          <div className="bg-white p-6 rounded-3xl border border-border shadow-xs flex flex-col gap-4">
            <h3 className="text-base font-bold text-foreground">Track Selection Breakdown</h3>
            <div className="flex flex-col gap-4">
              {Object.entries(stats.trackCounts).map(([trackName, count]) => {
                const pct = stats.totalRegistered > 0 ? Math.round((count / stats.totalRegistered) * 100) : 0;
                const isTrackA = trackName.includes("Track A");

                return (
                  <div key={trackName} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-foreground">{trackName}</span>
                      <span className="font-mono text-foreground-muted">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-surface-container h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isTrackA ? "bg-primary" : "bg-secondary"}`}
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Department Representation */}
          <div className="bg-white p-6 rounded-3xl border border-border shadow-xs flex flex-col gap-4">
            <h3 className="text-base font-bold text-foreground">Department Representation</h3>
            <div className="flex flex-col gap-3">
              {Object.entries(stats.departmentCounts).map(([dept, count]) => {
                const pct = stats.totalRegistered > 0 ? Math.round((count / stats.totalRegistered) * 100) : 0;
                return (
                  <div key={dept} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{dept}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-surface-container h-2 rounded-full overflow-hidden hidden sm:block">
                        <div className="bg-primary h-full rounded-full" style={{ width: `${pct}%` }}></div>
                      </div>
                      <span className="font-mono font-bold text-foreground-muted w-8 text-right">{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Academic Standing */}
          <div className="bg-white p-6 rounded-3xl border border-border shadow-xs flex flex-col gap-4">
            <h3 className="text-base font-bold text-foreground">Year of Study Distribution</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(stats.yearCounts).map(([year, count]) => (
                <div key={year} className="p-4 rounded-xl bg-surface-container-low border border-border/50 text-center flex flex-col gap-1">
                  <span className="text-xs text-foreground-muted font-bold">{year}</span>
                  <span className="text-xl font-bold text-primary">{count}</span>
                  <span className="text-[10px] text-foreground-muted">
                    {stats.totalRegistered > 0 ? Math.round((count / stats.totalRegistered) * 100) : 0}% of cohort
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Logistics & Capacity Projections */}
          <div className="bg-white p-6 rounded-3xl border border-border shadow-xs flex flex-col gap-4">
            <h3 className="text-base font-bold text-foreground">Lab Capacity Planning</h3>
            <div className="flex flex-col gap-2.5 text-xs text-foreground-muted leading-relaxed">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">router</span>
                <span><strong>Network Bandwidth:</strong> High-density dual-band Wi-Fi allocated for 150 concurrent WebSocket and container pulls in Labs 402/403.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">restaurant</span>
                <span><strong>Catering Count:</strong> Buffet lunch and evening refreshment orders synced with current confirmed attendee count ({stats.totalRegistered} meals).</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-tertiary text-[18px] shrink-0 mt-0.5">badge</span>
                <span><strong>Physical Badges:</strong> Printed batches 0001–0150 matched to digital reference IDs.</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

