import { notFound } from "next/navigation";
import { events } from "@/content/events";
import { getRegistrations, getEventStats } from "@/lib/db";
import type { RegistrationRecord } from "@/types";
import { AdminHeader } from "@/components/admin/admin-header";
import { RegistrationsTable } from "@/components/admin/registrations-table";

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
    title: `Registrations · ${slug}`,
  };
}

export default async function AdminRegistrationsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = events.find((e) => e.slug === slug);
  if (!event) notFound();

  let registrations: RegistrationRecord[] = [];
  let stats;
  try {
    registrations = getRegistrations(slug);
    stats = getEventStats(slug);
  } catch {
    // fallback
  }

  return (
    <div className="min-h-screen bg-surface-container-low flex flex-col">
      <AdminHeader currentTab="registrations" eventSlug={slug} />

      <main className="flex-1 max-w-(--container-max) w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-foreground-muted mb-1">
              <span>Events</span>
              <span>›</span>
              <span className="font-semibold text-foreground">{event.title}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Attendee Roster &amp; Ticket Passes
            </h1>
          </div>

          {stats ? (
            <div className="flex items-center gap-3">
              <div className="bg-white border border-border px-3.5 py-1.5 rounded-full text-xs font-semibold">
                <span>Capacity: </span>
                <span className="text-primary font-bold">{stats.totalRegistered} / {stats.capacity}</span>
              </div>
            </div>
          ) : null}
        </div>

        <RegistrationsTable
          initialRegistrations={registrations}
          eventSlug={slug}
        />
      </main>
    </div>
  );
}

