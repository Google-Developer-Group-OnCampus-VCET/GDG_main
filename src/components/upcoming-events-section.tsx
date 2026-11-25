import { connection } from "next/server";
import type { ChapterEvent } from "@/types";
import { upcomingEvents } from "@/lib/events";
import { getCachedAllEvents } from "@/lib/db/cached";
import { EventCard } from "@/components/event-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { chapter as defaultChapter } from "@/content/chapter";

export async function UpcomingEventsSection({
  events: initialEvents,
  chapterPageUrl,
}: {
  events?: ChapterEvent[];
  chapterPageUrl?: string;
}) {
  await connection();
  let sourceEvents = initialEvents;
  if (!sourceEvents) {
    try {
      sourceEvents = await getCachedAllEvents();
    } catch {
      sourceEvents = [];
    }
  }
  const nextEvents = upcomingEvents(sourceEvents, new Date()).slice(0, 3);

  if (nextEvents.length === 0) {
    return (
      <EmptyState
        title="No upcoming events right now"
        description="Check back soon, or follow the official chapter page for the latest announcements."
        action={
          <Button href={chapterPageUrl || defaultChapter.chapterPageUrl} variant="secondary">
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
