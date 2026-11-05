import { Suspense } from "react";
import type { Metadata } from "next";
import { getAllEventsAdmin } from "@/lib/db";
import { EventsManagerView } from "@/components/admin/events-manager-view";

export const metadata: Metadata = {
  title: "Events Management · GDG on Campus VCET Admin",
};

export default function AdminEventsPage() {
  const initialEvents = getAllEventsAdmin();

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <Suspense fallback={<div className="h-64 flex items-center justify-center">Loading events...</div>}>
        <EventsManagerView initialEvents={initialEvents} />
      </Suspense>
    </div>
  );
}

