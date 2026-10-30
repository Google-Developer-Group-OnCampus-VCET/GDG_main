import { connection } from "next/server";
import type { ChapterEvent } from "@/types";
import { pastEvents } from "@/lib/events";
import { EventCard } from "@/components/event-card";
import { EmptyState } from "@/components/ui/empty-state";

export async function RecentPastEventsSection({ events }: { events: ChapterEvent[] }) {
  await connection();
  const recent = pastEvents(events, new Date()).slice(0, 3);

  if (recent.length === 0) {
    return (
      <EmptyState
        title="No past events yet"
        description="This is where recaps of past sessions will appear once the chapter has run one."
      />
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {recent.map((event) => (
        <EventCard key={event.id} event={event} status="past" />
      ))}
    </div>
  );
}
