import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getEventBySlugAsync, getEventStatsAsync } from "@/lib/db";
import { getAdminRoleFromCookies } from "@/lib/auth";
import { AdminHeader } from "@/components/admin/admin-header";
import { AnalyticsView } from "@/components/admin/analytics-view";
import { AdminPageSkeleton } from "@/components/skeletons/admin-skeletons";

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
    const fallbackCap = event.capacity ?? event.workshop?.capacity ?? 120;
    stats = {
      totalRegistered: 0,
      capacity: fallbackCap,
      remaining: fallbackCap,
      percentFilled: 0,
      isOpen: true,
      checkedInCount: 0,
      trackCounts: {},
      yearCounts: {},
      departmentCounts: {},
    };
  }

  const role = await getAdminRoleFromCookies();

  return (
    <div className="min-h-screen bg-surface-container-low flex flex-col">
      <AdminHeader currentTab="analytics" eventSlug={slug} initialRole={role} />

      <main className="flex-1 max-w-(--container-max) w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnalyticsView slug={slug} eventTitle={event.title} stats={stats} event={event} />
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
    <Suspense fallback={<AdminPageSkeleton label="Loading event analytics…" />}>
      <AdminAnalyticsContent slug={slug} />
    </Suspense>
  );
}
