import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getEventBySlugAsync, getEventStatsAsync } from "@/lib/db";
import { AdminHeader } from "@/components/admin/admin-header";
import { EventEditForm } from "@/components/admin/event-edit-form";
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
    title: `Edit Event · ${slug}`,
  };
}

async function AdminEditEventContent({ slug }: { slug: string }) {
  await connection();
  const event = await getEventBySlugAsync(slug);
  if (!event) notFound();

  let initialCapacity = event.capacity ?? event.workshop?.capacity ?? 120;
  let initialIsOpen = true;

  try {
    const stats = await getEventStatsAsync(slug);
    initialCapacity = stats.capacity;
    initialIsOpen =
      (stats as { isRegistrationOpen?: boolean; isOpen: boolean })
        ?.isRegistrationOpen ??
      stats?.isOpen ??
      true;
  } catch {
    // fallback to event defaults
  }

  return (
    <div className="min-h-screen bg-surface-container-low flex flex-col">
      <AdminHeader currentTab="overview" eventSlug={slug} />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
        <EventEditForm
          event={event}
          initialCapacity={initialCapacity}
          initialIsOpen={initialIsOpen}
        />
      </main>
    </div>
  );
}

export default async function AdminEditEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <Suspense fallback={<AdminPageSkeleton label="Loading event editor…" />}>
      <AdminEditEventContent slug={slug} />
    </Suspense>
  );
}
