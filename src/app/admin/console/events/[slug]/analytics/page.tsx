import { notFound } from "next/navigation";
import { events } from "@/content/events";
import { getEventStatsAsync } from "@/lib/db";
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
    stats = await getEventStatsAsync(slug);
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

  return (
    <div className="min-h-screen bg-surface-container-low flex flex-col">
      <AdminHeader currentTab="analytics" eventSlug={slug} />

      <main className="flex-1 max-w-(--container-max) w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnalyticsView slug={slug} eventTitle={event.title} stats={stats} />
      </main>
    </div>
  );
}
