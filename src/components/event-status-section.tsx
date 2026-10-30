import { connection } from "next/server";
import type { ChapterEvent } from "@/types";
import { isUpcoming } from "@/lib/events";
import { Button } from "@/components/ui/button";

export async function EventStatusEyebrow({ event }: { event: ChapterEvent }) {
  await connection();
  const upcoming = isUpcoming(event, new Date());
  return (
    <p className="text-sm font-medium uppercase tracking-wide text-primary">
      {upcoming ? "Upcoming event" : "Past event"}
    </p>
  );
}

/** The only parts of the detail page that depend on the current time. */
export async function EventStatusActions({ event }: { event: ChapterEvent }) {
  await connection();
  const upcoming = isUpcoming(event, new Date());

  return (
    <>
      {event.priceNote && !upcoming ? (
        <p className="mb-4 text-sm text-foreground-muted">
          Listed as &ldquo;{event.priceNote}&rdquo; at the time — historical information only;
          registration for this event is closed.
        </p>
      ) : null}

      {!event.cancelled && upcoming && event.registrationUrl ? (
        <Button href={event.registrationUrl} size="lg">
          Register
        </Button>
      ) : null}
    </>
  );
}
