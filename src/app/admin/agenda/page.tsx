import { Suspense } from "react";
import type { Metadata } from "next";
import { getAgendaSessions, getAllEventsAdmin } from "@/lib/db";
import { AgendaBuilderView } from "@/components/admin/agenda-builder-view";

export const metadata: Metadata = {
  title: "Agenda & Timeline Session Builder · GDG VCET Admin",
};

export default function AdminAgendaPage() {
  const events = getAllEventsAdmin();
  const initialSessions = getAgendaSessions();

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <Suspense fallback={<div className="h-64 flex items-center justify-center">Loading agenda builder...</div>}>
        <AgendaBuilderView events={events} initialSessions={initialSessions} />
      </Suspense>
    </div>
  );
}

