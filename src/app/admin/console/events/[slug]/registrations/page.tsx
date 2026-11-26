import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventBySlugAsync, getRegistrationsPaginatedAsync, getEventStatsAsync } from "@/lib/db";
import { getAdminRoleFromCookies } from "@/lib/auth";
import type { PaginatedRegistrationsResult } from "@/lib/db";
import { AdminHeader } from "@/components/admin/admin-header";
import { RegistrationsTable } from "@/components/admin/registrations-table";
import { EventStatusToggle } from "@/components/admin/event-status-toggle";
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
    title: `Registrations · ${slug}`,
  };
}

async function AdminRegistrationsContent({ slug }: { slug: string }) {
  await connection();
  const event = await getEventBySlugAsync(slug);
  if (!event) notFound();

  const role = await getAdminRoleFromCookies();

  let initialData: PaginatedRegistrationsResult | undefined;
  let stats;
  try {
    const [paginated, eventStats] = await Promise.all([
      getRegistrationsPaginatedAsync(slug, { page: 1, pageSize: 50, status: "confirmed" }),
      getEventStatsAsync(slug),
    ]);
    initialData = paginated;
    stats = eventStats;
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
      <AdminHeader currentTab="registrations" eventSlug={slug} initialRole={role} />

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
              <div className="bg-white border border-border px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2">
                <span>Capacity: </span>
                <span className="text-primary font-bold">
                  {stats.totalRegistered} / {stats.capacity}
                </span>
                {stats.pendingCount && stats.pendingCount > 0 ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px]">
                    {stats.pendingCount} Pending
                  </span>
                ) : null}
              </div>
            ) : null}

            {role === "admin" ? (
              <>
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
              </>
            ) : role === "core" ? (
              <span className="px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs">
                <span>🛡️</span> Core Member · Read-Only Roster
              </span>
            ) : (
              <span className="px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs">
                <span>📷</span> Volunteer Desk Active
              </span>
            )}
          </div>
        </div>

        <RegistrationsTable
          eventSlug={slug}
          initialData={initialData}
          role={role}
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
    <Suspense fallback={<AdminPageSkeleton label="Loading registrations…" />}>
      <AdminRegistrationsContent slug={slug} />
    </Suspense>
  );
}
