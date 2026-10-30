"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { ChapterEvent } from "@/types";
import { availableFormats, availableTopics, filterEvents, pastEvents, upcomingEvents } from "@/lib/events";
import { EventCard } from "@/components/event-card";
import { EmptyState } from "@/components/ui/empty-state";
import { EventFiltersBar } from "@/components/event-filters";

export function EventsExplorer({ events }: { events: ChapterEvent[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tab = searchParams.get("tab") === "past" ? "past" : "upcoming";
  const now = useMemo(() => new Date(), []);

  const bucketed = tab === "upcoming" ? upcomingEvents(events, now) : pastEvents(events, now);
  const filtered = filterEvents(bucketed, {
    query: searchParams.get("q") ?? "",
    topic: (searchParams.get("topic") as never) ?? "all",
    format: (searchParams.get("format") as never) ?? "all",
  });

  const topicOptions = useMemo(() => availableTopics(events), [events]);
  const formatOptions = useMemo(() => availableFormats(events), [events]);

  function setTab(next: "upcoming" | "past") {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "upcoming") {
      params.delete("tab");
    } else {
      params.set("tab", next);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
      <aside className="flex flex-col gap-6 lg:w-72 lg:shrink-0">
        <div role="tablist" aria-label="Event timing" className="flex rounded-(--radius-sm) border border-border p-1">
          {(["upcoming", "past"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={`flex-1 rounded-(--radius-sm) px-3 py-2 text-sm font-medium capitalize transition-colors duration-150 ${
                tab === value ? "bg-primary text-on-primary" : "text-foreground-muted hover:bg-surface-muted"
              }`}
            >
              {value}
            </button>
          ))}
        </div>

        <EventFiltersBar topics={topicOptions} formats={formatOptions} />
      </aside>

      <div className="flex-1">
        <p className="mb-4 text-sm text-foreground-muted" role="status">
          {filtered.length} {filtered.length === 1 ? "event" : "events"} found
        </p>

        {filtered.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2">
            {filtered.map((event) => (
              <EventCard key={event.id} event={event} status={tab} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={tab === "upcoming" ? "No upcoming events match these filters" : "No past events match these filters"}
            description="Try clearing the filters, or check back later for new announcements."
          />
        )}
      </div>
    </div>
  );
}
