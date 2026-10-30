import { connection } from "next/server";
import type { ChapterEvent } from "@/types";
import { upcomingEvents } from "@/lib/events";
import { EventCard } from "@/components/event-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { chapter } from "@/content/chapter";

export async function UpcomingEventsSection({ events }: { events: ChapterEvent[] }) {
  await connection();
  const nextEvents = upcomingEvents(events, new Date()).slice(0, 3);

  if (nextEvents.length === 0) {
    return (
      <EmptyState
        title="No upcoming events right now"
        description="Check back soon, or follow the official chapter page for the latest announcements."
        action={
          <Button href={chapter.chapterPageUrl} variant="secondary">
            View chapter page
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {nextEvents.map((event) => (
        <EventCard key={event.id} event={event} status="upcoming" />
      ))}
    </div>
  );
}
