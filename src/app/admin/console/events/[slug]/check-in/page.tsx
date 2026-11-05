import { notFound } from "next/navigation";
import { events } from "@/content/events";
import { getEventStatsAsync } from "@/lib/db";
import { AdminHeader } from "@/components/admin/admin-header";
import { CheckInTerminal } from "@/components/admin/check-in-terminal";

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
    title: `Check-in Terminal · ${slug}`,
  };
}

export default async function AdminCheckInPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = events.find((e) => e.slug === slug);
  if (!event) notFound();

  let checkedInCount = 0;
  try {
    const stats = await getEventStatsAsync(slug);
    checkedInCount = stats.checkedInCount;
  } catch {
    // fallback
  }

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
        </div>

        <CheckInTerminal
          eventSlug={slug}
          initialCheckedInCount={checkedInCount}
        />
      </main>
    </div>
  );
}

