import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getConfirmedAttendeesAsync, getEventBySlugAsync } from "@/lib/db";
import { getAdminRoleFromCookies } from "@/lib/auth";
import type { ConfirmedAttendeeRecord } from "@/types";
import { AdminHeader } from "@/components/admin/admin-header";
import { ConfirmedAttendeesTable } from "@/components/admin/confirmed-attendees-table";
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
    title: `Confirmed Attendees · ${slug}`,
  };
}

async function AdminConfirmedAttendeesContent({ slug }: { slug: string }) {
  await connection();
  const event = await getEventBySlugAsync(slug);
  if (!event) notFound();

  const role = await getAdminRoleFromCookies();

  let attendees: ConfirmedAttendeeRecord[] = [];
  try {
    attendees = await getConfirmedAttendeesAsync(slug);
  } catch (err) {
    console.warn("Failed to load confirmed attendees:", err);
  }

  const gdgIdCount = attendees.filter((a) =>
    a.registrationId.startsWith("G-")
  ).length;
  const lumaIdCount = attendees.filter((a) =>
    a.registrationId.startsWith("L-")
  ).length;

  return (
    <div className="min-h-screen bg-surface-container-low flex flex-col">
      <AdminHeader
        currentTab="confirmed-attendees"
        eventSlug={slug}
        initialRole={role}
      />

      <main className="flex-1 max-w-(--container-max) w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-foreground-muted mb-1">
              <span>Events</span>
              <span>›</span>
              <span className="font-semibold text-foreground">{event.title}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Confirmed Attendees
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="bg-white border border-border px-3.5 py-1.5 rounded-full text-xs font-semibold">
              <span>Total Confirmed: </span>
              <span className="text-primary font-bold">{attendees.length}</span>
            </div>
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-3 py-1.5 rounded-full text-xs font-semibold">
              G-IDs: {gdgIdCount}
            </div>
            <div className="bg-purple-50 border border-purple-200 text-purple-800 px-3 py-1.5 rounded-full text-xs font-semibold">
              L-IDs: {lumaIdCount}
            </div>
          </div>
        </div>

        <ConfirmedAttendeesTable
          initialAttendees={attendees}
          eventSlug={slug}
          role={role}
        />
      </main>
    </div>
  );
}

export default async function AdminConfirmedAttendeesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <Suspense fallback={<AdminPageSkeleton label="Loading confirmed attendees…" />}>
      <AdminConfirmedAttendeesContent slug={slug} />
    </Suspense>
  );
}
