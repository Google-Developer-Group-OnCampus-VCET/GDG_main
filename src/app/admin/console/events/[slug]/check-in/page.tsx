import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getEventBySlugAsync, getEventStatsAsync } from "@/lib/db";
import { AdminHeader } from "@/components/admin/admin-header";
import { CheckInTerminal } from "@/components/admin/check-in-terminal";

export function generateStaticParams() {
  return [{ slug: "dev-to-cloud" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return {
    title: `Check-in Terminal · ${slug}`,
  };
}

async function AdminCheckInContent({ slug }: { slug: string }) {
  await connection();
  const event = await getEventBySlugAsync(slug);
  if (!event) notFound();

  let checkedInCount = 0;
  let dailyCheckedInCounts: Record<number, number> | undefined;
  try {
    const stats = await getEventStatsAsync(slug);
    checkedInCount = stats.checkedInCount;
    dailyCheckedInCounts = stats.dailyCheckedInCounts;
  } catch {
    // fallback
  }

  const totalDays =
    event.workshop?.agenda && event.workshop.agenda.length > 0
      ? event.workshop.agenda.reduce((max, item) => Math.max(max, item.day || 1), 1)
      : slug === "dev-to-cloud"
      ? 4
      : 1;

  return (
    <div className="min-h-screen bg-surface-container-low flex flex-col">
      <AdminHeader currentTab="check-in" eventSlug={slug} />

      <main className="flex-1 max-w-(--container-max) w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-foreground-muted mb-1">
            <span>Events</span>
            <span>›</span>
            <span className="font-semibold text-foreground">{event.title}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Live Check-in &amp; Pass Verification Terminal
          </h1>
          <p className="text-sm text-foreground-muted mt-1">
            4-Day Workshop Check-in Management &middot; Days 1, 2, 3, and 4
          </p>
        </div>

        <CheckInTerminal
          eventSlug={slug}
          initialCheckedInCount={checkedInCount}
          initialDailyCounts={dailyCheckedInCounts}
          totalDays={totalDays}
        />
      </main>
    </div>
  );
}

export default async function AdminCheckInPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface-container-low p-8 text-sm text-foreground-muted">
          Loading check-in terminal…
        </div>
      }
    >
      <AdminCheckInContent slug={slug} />
    </Suspense>
  );
}
