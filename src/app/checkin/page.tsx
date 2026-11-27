import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import {
  computeConfirmedAttendeeStats,
  getConfirmedAttendeesAsync,
  getEventBySlugAsync,
} from "@/lib/db";
import {
  getAdminRoleFromCookies,
  isCheckinPortalAuthenticatedFromCookies,
} from "@/lib/auth";
import { CheckInPortalClient } from "@/components/checkin/checkin-portal-client";
import { AdminPageSkeleton } from "@/components/skeletons/admin-skeletons";

export const metadata = {
  title: "Check-in Desk · GDG on Campus VCET",
};

const DEFAULT_EVENT_SLUG = "dev-to-cloud";

async function CheckInPortalContent() {
  await connection();

  const event = await getEventBySlugAsync(DEFAULT_EVENT_SLUG);
  if (!event) notFound();

  const [portalAuthed, adminRole] = await Promise.all([
    isCheckinPortalAuthenticatedFromCookies(),
    getAdminRoleFromCookies(),
  ]);
  const initialAuthenticated = portalAuthed || Boolean(adminRole);

  let checkedInCount = 0;
  let dailyCheckedInCounts: Record<number, number> | undefined;
  if (initialAuthenticated) {
    try {
      const confirmed = await getConfirmedAttendeesAsync(DEFAULT_EVENT_SLUG);
      if (confirmed.length > 0) {
        const stats = computeConfirmedAttendeeStats(confirmed);
        checkedInCount = stats.checkedInCount;
        dailyCheckedInCounts = stats.dailyCheckedInCounts;
      }
    } catch {
      // fallback
    }
  }

  const totalDays =
    event.workshop?.agenda && event.workshop.agenda.length > 0
      ? event.workshop.agenda.reduce((max, item) => Math.max(max, item.day || 1), 1)
      : 4;

  return (
    <CheckInPortalClient
      initialAuthenticated={initialAuthenticated}
      eventSlug={DEFAULT_EVENT_SLUG}
      eventTitle={event.title}
      initialCheckedInCount={checkedInCount}
      initialDailyCounts={dailyCheckedInCounts}
      totalDays={totalDays}
    />
  );
}

export default function CheckInPortalPage() {
  return (
    <Suspense fallback={<AdminPageSkeleton label="Loading check-in desk…" />}>
      <CheckInPortalContent />
    </Suspense>
  );
}
