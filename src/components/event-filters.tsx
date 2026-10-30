"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useId } from "react";
import { Chip } from "@/components/ui/chip";
import { TextField } from "@/components/ui/text-field";
import { Button } from "@/components/ui/button";
import type { EventFormat, EventTopic } from "@/types";

const topicLabels: Record<EventTopic, string> = {
  web: "Web",
  "ai-ml": "AI / ML",
  cloud: "Cloud",
  android: "Android",
  general: "General",
};

const formatLabels: Record<EventFormat, string> = {
  "in-person": "In person",
  online: "Online",
  hybrid: "Hybrid",
};

export function EventFiltersBar({
  topics,
  formats,
}: {
  /** Topics actually present in the dataset — never render a chip for one that isn't. */
  topics: EventTopic[];
  /** Formats actually present in the dataset — never render a chip for one that isn't. */
  formats: EventFormat[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryId = useId();

  const query = searchParams.get("q") ?? "";
  const topic = searchParams.get("topic") ?? "all";
  const format = searchParams.get("format") ?? "all";
  const hasActiveFilters = query !== "" || topic !== "all" || format !== "all";

  function updateParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === "" || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="max-w-sm">
        <TextField
          id={queryId}
          label="Search events"
          placeholder="Search by keyword"
          defaultValue={query}
          onChange={(event) => updateParams({ q: event.target.value })}
        />
      </div>

      {topics.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">Topic</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by topic">
            <Chip selected={topic === "all"} onClick={() => updateParams({ topic: "all" })}>
              All topics
            </Chip>
            {topics.map((value) => (
              <Chip key={value} selected={topic === value} onClick={() => updateParams({ topic: value })}>
                {topicLabels[value]}
              </Chip>
            ))}
          </div>
        </div>
      ) : null}

      {formats.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">Format</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by format">
            <Chip selected={format === "all"} onClick={() => updateParams({ format: "all" })}>
              All formats
            </Chip>
            {formats.map((value) => (
              <Chip key={value} selected={format === value} onClick={() => updateParams({ format: value })}>
                {formatLabels[value]}
              </Chip>
            ))}
          </div>
        </div>
      ) : null}

      {hasActiveFilters ? (
        <Button variant="ghost" onClick={() => router.replace(pathname, { scroll: false })}>
          Clear all filters
        </Button>
      ) : null}
    </div>
  );
}
