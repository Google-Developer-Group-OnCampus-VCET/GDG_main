import Image from "next/image";
import Link from "next/link";
import type { ChapterEvent } from "@/types";
import { formatEventDateRange } from "@/lib/events";
import { Card } from "@/components/ui/card";

const topicLabels: Record<string, string> = {
  web: "Web",
  "ai-ml": "AI / ML",
  cloud: "Cloud",
  android: "Android",
  general: "General",
};

const formatLabels: Record<string, string> = {
  "in-person": "In person",
  online: "Online",
  hybrid: "Hybrid",
};

export function EventCard({
  event,
  status,
}: {
  event: ChapterEvent;
  /** Known ahead of time by the caller, so this component never reads the clock. */
  status?: "upcoming" | "past";
}) {
  return (
    <Card className="flex flex-col gap-4">
      {event.image ? (
        <div className="relative -mx-6 -mt-6 aspect-[4/3] overflow-hidden rounded-t-(--radius-md)">
          <Image
            src={event.image}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {status === "past" ? (
          <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-foreground-muted">
            Past event
          </span>
        ) : null}
        {event.topics.map((topic) => (
          <span
            key={topic}
            className="rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-foreground-muted"
          >
            {topicLabels[topic] ?? topic}
          </span>
        ))}
        {event.format ? (
          <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-foreground-muted">
            {formatLabels[event.format] ?? event.format}
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-medium text-foreground">
          <Link href={`/events/${event.slug}`} className="hover:text-primary">
            {event.title}
          </Link>
        </h3>
        <p className="text-sm text-foreground-muted">{formatEventDateRange(event)}</p>
        {event.location ? <p className="text-sm text-foreground-muted">{event.location}</p> : null}
      </div>

      {event.summary ? (
        <p className="text-[15px] leading-relaxed text-foreground-muted">{event.summary}</p>
      ) : null}

      {event.priceNote ? (
        <p className="text-xs text-foreground-muted">
          {event.priceNote}
          {status === "past" ? " (historical — registration is closed)" : ""}
        </p>
      ) : null}

      <Link
        href={`/events/${event.slug}`}
        className="text-sm font-medium text-primary hover:underline"
      >
        {event.cancelled ? "View details" : "View details →"}
      </Link>
    </Card>
  );
}
