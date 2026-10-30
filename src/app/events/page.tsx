import { Suspense } from "react";
import type { Metadata } from "next";
import { events } from "@/content/events";
import { SectionHeading } from "@/components/ui/section-heading";
import { EventsExplorer } from "@/components/events-explorer";

export const metadata: Metadata = {
  title: "Events",
  description: "Upcoming and past events from GDG on Campus VCET.",
};

export default function EventsPage() {
  return (
    <div className="mx-auto max-w-(--container-max) px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
      <div className="mb-10">
        <SectionHeading
          eyebrow="Events"
          title="Events"
          description="Browse upcoming sessions and past event recaps from the chapter."
        />
      </div>

      <Suspense fallback={<p className="text-sm text-foreground-muted">Loading events…</p>}>
        <EventsExplorer events={events} />
      </Suspense>
    </div>
  );
}
