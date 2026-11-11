import type { ChapterEvent, EventFormat, EventTopic } from "@/types";

const DISPLAY_TIMEZONE = "Asia/Kolkata";

export function eventEndInstant(event: ChapterEvent): Date {
  return new Date(event.endsAt ?? event.startsAt);
}

export function isUpcoming(event: ChapterEvent, now: Date): boolean {
  if (event.cancelled) return false;
  return eventEndInstant(event).getTime() >= now.getTime();
}

/** A slug is registerable if it's a static workshop event or an admin-created one — the
 * same two sources mergeEventSources combines for display. Pass the result of an admin-DB
 * lookup for the slug (or null) rather than the whole admin event list, so callers keep
 * using an indexed single-row lookup instead of scanning every admin event. */
export function eventSlugExists(
  slug: string,
  staticEvents: ChapterEvent[],
  dbEvent: ChapterEvent | null,
): boolean {
  if (staticEvents.some((e) => e.slug === slug)) return true;
  return dbEvent !== null;
}

export function sortByStart(events: ChapterEvent[]): ChapterEvent[] {
  return [...events].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
}

export function upcomingEvents(events: ChapterEvent[], now: Date): ChapterEvent[] {
  return sortByStart(events.filter((event) => isUpcoming(event, now)));
}

export function pastEvents(events: ChapterEvent[], now: Date): ChapterEvent[] {
  return sortByStart(events.filter((event) => !isUpcoming(event, now))).reverse();
}

/** A value with no "T" is a date-only string ("YYYY-MM-DD"), not a timed instant. */
function hasTimeComponent(value: string): boolean {
  return value.includes("T");
}

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: DISPLAY_TIMEZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: DISPLAY_TIMEZONE,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export function formatEventDateRange(event: ChapterEvent): string {
  const start = new Date(event.startsAt);
  const datePart = dateFormatter.format(start);

  if (!hasTimeComponent(event.startsAt)) {
    return datePart;
  }

  const end = event.endsAt ? new Date(event.endsAt) : null;
  const startTimePart = timeFormatter.format(start);

  if (!end) {
    return `${datePart} · ${startTimePart} IST`;
  }

  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) {
    return `${datePart} · ${startTimePart}–${timeFormatter.format(end)} IST`;
  }

  return `${datePart} ${startTimePart} IST – ${dateFormatter.format(end)} ${timeFormatter.format(end)} IST`;
}

export interface EventFilters {
  query: string;
  topic: EventTopic | "all";
  format: EventFormat | "all";
}

export const defaultEventFilters: EventFilters = {
  query: "",
  topic: "all",
  format: "all",
};

export function filterEvents(
  events: ChapterEvent[],
  filters: Partial<EventFilters>,
): ChapterEvent[] {
  const query = (filters.query ?? "").trim().toLowerCase();
  const topic = filters.topic ?? "all";
  const format = filters.format ?? "all";

  return events.filter((event) => {
    if (topic !== "all" && !event.topics.includes(topic)) return false;
    if (format !== "all" && event.format !== format) return false;
    if (query) {
      const haystack = [event.title, event.summary, event.location]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

/** Topics actually present in the dataset, in the enum's display order. */
export function availableTopics(events: ChapterEvent[]): EventTopic[] {
  const order: EventTopic[] = ["web", "ai-ml", "cloud", "android", "general"];
  const present = new Set(events.flatMap((event) => event.topics));
  return order.filter((topic) => present.has(topic));
}

/** Formats actually present in the dataset, in a stable display order. */
export function availableFormats(events: ChapterEvent[]): EventFormat[] {
  const order: EventFormat[] = ["in-person", "online", "hybrid"];
  const present = new Set(events.map((event) => event.format).filter(Boolean) as EventFormat[]);
  return order.filter((format) => present.has(format));
}

/**
 * Merges the static, hand-curated event content (which carries rich workshop detail pages —
 * pillars, FAQ, speakers, agenda, etc. — that the admin DB schema has no field for) with
 * events created/edited through the admin panel (which only exist in SQLite). A slug present
 * in both wins from the static side, so existing rich detail pages are never downgraded;
 * any admin-created event not present in the static set is appended as-is so it actually
 * becomes visible on the public site instead of being silently invisible.
 */
export function mergeEventSources(
  staticEvents: ChapterEvent[],
  dbEvents: ChapterEvent[],
): ChapterEvent[] {
  const staticSlugs = new Set(staticEvents.map((e) => e.slug));
  const dbOnly = dbEvents.filter((e) => !staticSlugs.has(e.slug) && e.visibility !== "draft");
  return [...staticEvents, ...dbOnly];
}
