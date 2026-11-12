import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getEventBySlugAsync, getEventStatsAsync } from "@/lib/db";
import { AdminHeader } from "@/components/admin/admin-header";
import { AnalyticsView } from "@/components/admin/analytics-view";

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

async function AdminAnalyticsContent({ slug }: { slug: string }) {
  await connection();
  const event = await getEventBySlugAsync(slug);
  if (!event) notFound();

  let stats;
  try {
    stats = await getEventStatsAsync(slug);
  } catch {
    stats = {
      totalRegistered: 0,
      capacity: 150,
      remaining: 150,
      percentFilled: 0,
      isOpen: true,
      checkedInCount: 0,
      trackCounts: {},
      yearCounts: {},
      departmentCounts: {},
    };
  }

  return (
    <div className="min-h-screen bg-surface-container-low flex flex-col">
      <AdminHeader currentTab="analytics" eventSlug={slug} />

      <main className="flex-1 max-w-(--container-max) w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnalyticsView slug={slug} eventTitle={event.title} stats={stats} />
      </main>
    </div>
  );
}

export default async function AdminAnalyticsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface-container-low p-8 text-sm text-foreground-muted">
          Loading event analytics…
        </div>
      }
    >
      <AdminAnalyticsContent slug={slug} />
    </Suspense>
  );
}
