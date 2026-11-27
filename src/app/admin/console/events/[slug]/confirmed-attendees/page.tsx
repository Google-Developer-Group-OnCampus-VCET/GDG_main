import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getEventBySlugAsync } from "@/lib/db";
import { getAdminRoleFromCookies } from "@/lib/auth";
import { AdminHeader } from "@/components/admin/admin-header";
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
        </div>

        <section
          aria-label="Confirmed Attendees"
          className="flex-1 min-h-[360px] rounded-2xl border border-border bg-white shadow-2xs"
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
