import { Suspense } from "react";
import type { Metadata } from "next";
import { getAnnouncementsAdmin, getAllEventsAdmin } from "@/lib/db";
import { AnnouncementsManagerView } from "@/components/admin/announcements-manager-view";

export const metadata: Metadata = {
  title: "Announcements & Email Broadcasts · GDG VCET Admin",
};

export default function AdminAnnouncementsPage() {
  const announcements = getAnnouncementsAdmin();
  const events = getAllEventsAdmin();

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <Suspense fallback={<div className="h-64 flex items-center justify-center">Loading announcements...</div>}>
        <AnnouncementsManagerView initialAnnouncements={announcements} events={events} />
      </Suspense>
    </div>
  );
}

