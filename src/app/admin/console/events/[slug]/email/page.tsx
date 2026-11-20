import { Suspense } from "react";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { getEventBySlugAsync, getRegistrationsAsync, getEmailLogsAsync } from "@/lib/db";
import { getAdminRoleFromCookies } from "@/lib/auth";
import { AdminHeader } from "@/components/admin/admin-header";
import { EmailHub } from "@/components/admin/email-hub";
import { AdminPageSkeleton } from "@/components/skeletons/admin-skeletons";
import type { RegistrationRecord, EmailLog } from "@/types";

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
    title: `Email & Broadcast Console · ${slug}`,
  };
}

async function AdminEmailContent({ slug }: { slug: string }) {
  await connection();

  const role = await getAdminRoleFromCookies();
  // Role Rule: Email & Broadcast is restricted strictly to Master Admin (Dev)
  if (role !== "admin") {
    redirect(`/admin/console/events/${slug}/analytics`);
  }

  const event = await getEventBySlugAsync(slug);
  if (!event) notFound();

  let registrations: RegistrationRecord[] = [];
  try {
    registrations = await getRegistrationsAsync(slug);
  } catch {
    registrations = [];
  }

  let logs: EmailLog[] = [];
  try {
    logs = await getEmailLogsAsync(slug);
  } catch {
    logs = [];
  }

  return (
    <div className="min-h-screen bg-surface-container-low flex flex-col">
      <AdminHeader currentTab="email" eventSlug={slug} initialRole={role} />

      <main className="flex-1 max-w-(--container-max) w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-foreground-muted mb-1">
            <span>Events</span>
            <span>›</span>
            <span className="font-semibold text-foreground">{event.title}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Attendee Communication &amp; Pass Dispatch Hub
          </h1>
          <p className="text-sm text-foreground-muted mt-1">
            Email scannable 4-day passes, schedule reminders, and broadcast event announcements.
          </p>
        </div>

        <EmailHub
          eventSlug={slug}
          eventTitle={event.title}
          registrations={registrations}
          initialLogs={logs}
        />
      </main>
    </div>
  );
}

export default async function AdminEmailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <Suspense fallback={<AdminPageSkeleton label="Loading email and communication hub…" />}>
      <AdminEmailContent slug={slug} />
    </Suspense>
  );
}
