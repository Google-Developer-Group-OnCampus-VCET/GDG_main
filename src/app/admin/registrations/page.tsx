import { Suspense } from "react";
import type { Metadata } from "next";
import { getAllRegistrationsAdmin, getAllEventsAdmin } from "@/lib/db";
import { CentralRegistrationsView } from "@/components/admin/central-registrations-view";

export const metadata: Metadata = {
  title: "Centralized Registrations & Attendee Roster · GDG VCET Admin",
};

export default function CentralRegistrationsPage() {
  const initialRegistrations = getAllRegistrationsAdmin();
  const events = getAllEventsAdmin();

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <Suspense fallback={<div className="h-64 flex items-center justify-center">Loading registration roster...</div>}>
        <CentralRegistrationsView
          initialRegistrations={initialRegistrations}
          events={events}
        />
      </Suspense>
    </div>
  );
}

