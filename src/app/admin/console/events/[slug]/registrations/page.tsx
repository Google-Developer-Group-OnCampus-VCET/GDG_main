import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventBySlugAsync, getRegistrationsAsync, getEventStatsAsync } from "@/lib/db";
import type { RegistrationRecord } from "@/types";
import { AdminHeader } from "@/components/admin/admin-header";
import { RegistrationsTable } from "@/components/admin/registrations-table";
import { EventStatusToggle } from "@/components/admin/event-status-toggle";

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

async function AdminRegistrationsContent({ slug }: { slug: string }) {
  await connection();
  const event = await getEventBySlugAsync(slug);
  if (!event) notFound();

  let registrations: RegistrationRecord[] = [];
  let stats;
  try {
    registrations = await getRegistrationsAsync(slug);
    stats = await getEventStatsAsync(slug);
  } catch {
    // fallback
  }

  const initialIsOpen =
    (stats as { isRegistrationOpen?: boolean; isOpen: boolean } | undefined)
      ?.isRegistrationOpen ??
    stats?.isOpen ??
    true;

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

          <div className="flex flex-wrap items-center gap-3">
            {stats ? (
              <div className="bg-white border border-border px-3.5 py-1.5 rounded-full text-xs font-semibold">
                <span>Capacity: </span>
                <span className="text-primary font-bold">
                  {stats.totalRegistered} / {stats.capacity}
                </span>
              </div>
            ) : null}
            <EventStatusToggle eventSlug={slug} initialIsOpen={initialIsOpen} />
            <Link
              href={`/admin/console/events/${slug}/edit`}
              className="inline-flex items-center gap-1.5 bg-white border border-border px-3.5 py-1.5 rounded-full text-xs font-semibold text-foreground hover:bg-surface-container transition-all"
            >
              <svg
                className="w-3.5 h-3.5 text-foreground-muted"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <span>Edit Event</span>
            </Link>
          </div>
        </div>

        <RegistrationsTable
          initialRegistrations={registrations}
          eventSlug={slug}
        />
      </main>
    </div>
  );
}

export default async function AdminRegistrationsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface-container-low p-8 text-sm text-foreground-muted">
          Loading registrations…
        </div>
      }
    >
      <AdminRegistrationsContent slug={slug} />
    </Suspense>
  );
}
