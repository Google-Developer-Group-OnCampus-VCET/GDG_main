import { describe, expect, it } from "vitest";
import type { ChapterEvent } from "@/types";
import {
  availableFormats,
  availableTopics,
  defaultEventFilters,
  filterEvents,
  formatEventDateRange,
  isUpcoming,
  pastEvents,
  upcomingEvents,
} from "./events";

const NOW = new Date("2026-10-29T12:00:00+05:30");

function makeEvent(overrides: Partial<ChapterEvent>): ChapterEvent {
  return {
    id: "evt-1",
    slug: "evt-1",
    title: "Sample event",
    startsAt: "2026-11-01T10:00:00+05:30",
    timezone: "Asia/Kolkata",
    format: "in-person",
    location: "VCET campus",
    topics: ["web"],
    summary: "A sample event",
    ...overrides,
  };
}

describe("isUpcoming", () => {
  it("treats an event ending after now as upcoming", () => {
    const event = makeEvent({ startsAt: "2026-11-01T10:00:00+05:30" });
    expect(isUpcoming(event, NOW)).toBe(true);
  });

  it("treats an event ending before now as past", () => {
    const event = makeEvent({ startsAt: "2026-10-01T10:00:00+05:30" });
    expect(isUpcoming(event, NOW)).toBe(false);
  });

  it("uses endsAt over startsAt when both are present", () => {
    const event = makeEvent({
      startsAt: "2026-10-28T10:00:00+05:30",
      endsAt: "2026-10-30T10:00:00+05:30",
    });
    expect(isUpcoming(event, NOW)).toBe(true);
  });

  it("treats a cancelled event as not upcoming regardless of date", () => {
    const event = makeEvent({
      startsAt: "2026-12-01T10:00:00+05:30",
      cancelled: true,
    });
    expect(isUpcoming(event, NOW)).toBe(false);
  });

  it("treats an event ending exactly now as upcoming (boundary inclusive)", () => {
    const event = makeEvent({ startsAt: NOW.toISOString() });
    expect(isUpcoming(event, NOW)).toBe(true);
  });
});

describe("upcomingEvents / pastEvents", () => {
  const events = [
    makeEvent({ id: "a", slug: "a", startsAt: "2026-11-05T10:00:00+05:30" }),
    makeEvent({ id: "b", slug: "b", startsAt: "2026-09-01T10:00:00+05:30" }),
    makeEvent({ id: "c", slug: "c", startsAt: "2026-11-01T10:00:00+05:30" }),
  ];

  it("sorts upcoming events chronologically ascending", () => {
    const result = upcomingEvents(events, NOW);
    expect(result.map((e) => e.id)).toEqual(["c", "a"]);
  });

  it("sorts past events most-recent-first", () => {
    const result = pastEvents(events, NOW);
    expect(result.map((e) => e.id)).toEqual(["b"]);
  });
});

describe("filterEvents", () => {
  const events = [
    makeEvent({
      id: "web-1",
      slug: "web-1",
      title: "React workshop",
      topics: ["web"],
      format: "in-person",
      summary: "Hands-on React",
    }),
    makeEvent({
      id: "cloud-1",
      slug: "cloud-1",
      title: "Cloud Study Jam",
      topics: ["cloud"],
      format: "online",
      summary: "Intro to GCP",
    }),
  ];

  it("returns all events with default filters", () => {
    expect(filterEvents(events, defaultEventFilters)).toHaveLength(2);
  });

  it("filters by topic", () => {
    const result = filterEvents(events, { topic: "cloud" });
    expect(result.map((e) => e.id)).toEqual(["cloud-1"]);
  });

  it("filters by format", () => {
    const result = filterEvents(events, { format: "online" });
    expect(result.map((e) => e.id)).toEqual(["cloud-1"]);
  });

  it("filters by case-insensitive text query across title/summary/location", () => {
    const result = filterEvents(events, { query: "REACT" });
    expect(result.map((e) => e.id)).toEqual(["web-1"]);
  });

  it("combines topic and query filters", () => {
    const result = filterEvents(events, { topic: "cloud", query: "gcp" });
    expect(result.map((e) => e.id)).toEqual(["cloud-1"]);
  });

  it("returns an empty array when nothing matches", () => {
    const result = filterEvents(events, { query: "nonexistent" });
    expect(result).toHaveLength(0);
  });
});

describe("formatEventDateRange", () => {
  it("formats a single-day event with start and end time", () => {
    const event = makeEvent({
      startsAt: "2026-11-01T10:00:00+05:30",
      endsAt: "2026-11-01T12:00:00+05:30",
    });
    expect(formatEventDateRange(event)).toBe("1 November 2026 · 10:00 am–12:00 pm IST");
  });

  it("formats an event with only a start time", () => {
    const event = makeEvent({ startsAt: "2026-11-01T10:00:00+05:30", endsAt: undefined });
    expect(formatEventDateRange(event)).toBe("1 November 2026 · 10:00 am IST");
  });

  it("formats a date-only event (no time component) with no time suffix", () => {
    const event = makeEvent({ startsAt: "2026-10-21", endsAt: undefined, timezone: undefined });
    expect(formatEventDateRange(event)).toBe("21 October 2026");
  });

  it("does not shift a date-only event to the previous day under Asia/Kolkata", () => {
    // UTC midnight on a date-only string is always same-or-later in IST (+05:30),
    // so this must never render as the previous calendar day.
    const event = makeEvent({ startsAt: "2026-01-01", endsAt: undefined, timezone: undefined });
    expect(formatEventDateRange(event)).toBe("1 January 2026");
  });
});

describe("date-only events and isUpcoming", () => {
  it("treats a past date-only event as not upcoming", () => {
    const event = makeEvent({ startsAt: "2026-10-21", endsAt: undefined, timezone: undefined });
    expect(isUpcoming(event, NOW)).toBe(false);
  });
});

describe("availableTopics / availableFormats", () => {
  const events = [
    makeEvent({ id: "a", slug: "a", topics: ["cloud"], format: "in-person" }),
    makeEvent({ id: "b", slug: "b", topics: ["general"], format: "hybrid" }),
    makeEvent({ id: "c", slug: "c", topics: ["cloud", "general"], format: undefined }),
  ];

  it("returns only topics actually present, in enum order", () => {
    expect(availableTopics(events)).toEqual(["cloud", "general"]);
  });

  it("returns only formats actually present, in a stable order", () => {
    expect(availableFormats(events)).toEqual(["in-person", "hybrid"]);
  });

  it("returns an empty array when nothing is present", () => {
    expect(availableTopics([])).toEqual([]);
    expect(availableFormats([])).toEqual([]);
  });
});
