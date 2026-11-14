import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { events as staticEvents } from "@/content/events";
import { formatEventDateRange } from "@/lib/events";
import { getEventBySlugAsync, getEventStatsAsync } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { EventStatusActions, EventStatusEyebrow } from "@/components/event-status-section";
import { EventSubNav } from "@/components/event-sub-nav";
import { EventDetailsView } from "@/components/workshop/event-details-view";

export function generateStaticParams() {
  if (staticEvents.length === 0) return [{ slug: "__placeholder__" }];
  return staticEvents.map((event) => ({ slug: event.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const staticMatch = staticEvents.find((e) => e.slug === slug);
  if (staticMatch) {
    return { title: staticMatch.title, description: staticMatch.summary };
  }
  await connection();
  const event = await getEventBySlugAsync(slug);
  if (!event) return { title: "Event not found" };
  return { title: event.title, description: event.summary };
}

const formatLabels: Record<string, string> = {
  "in-person": "In person",
  online: "Online",
  hybrid: "Hybrid",
};

async function EventDetailContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await connection();
  const event = await getEventBySlugAsync(slug);
  if (!event) notFound();

  // If this event has rich workshop data, render the full Stitch-based workshop experience
  if (event.workshop) {
    let stats;
    try {
      stats = await getEventStatsAsync(slug);
    } catch {
      // Fallback to static numbers if db is initializing
    }

    return (
      <div className="w-full flex flex-col">
        <EventSubNav event={event} />
        <EventDetailsView event={event} workshop={event.workshop} stats={stats} />
      </div>
    );
  }

  // Otherwise, render the clean event detail layout with live registration CTA
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
      <EventStatusEyebrow event={event} />

      <h1 className="mt-2 text-[32px] font-medium leading-tight text-foreground sm:text-[40px]">
        {event.title}
      </h1>

      {event.image ? (
        <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-(--radius-md)">
          <Image
            src={event.image}
            alt=""
            fill
            sizes="(min-width: 768px) 768px, 100vw"
            className="object-cover"
          />
        </div>
      ) : null}

      <dl className="mt-6 flex flex-col gap-2 text-[15px] text-foreground-muted">
        <div className="flex gap-2">
          <dt className="font-medium text-foreground">When</dt>
          <dd>{formatEventDateRange(event)}</dd>
        </div>
        {event.location ? (
          <div className="flex gap-2">
            <dt className="font-medium text-foreground">Where</dt>
            <dd>{event.location}</dd>
          </div>
        ) : null}
        {event.format ? (
          <div className="flex gap-2">
            <dt className="font-medium text-foreground">Format</dt>
            <dd>{formatLabels[event.format] ?? event.format}</dd>
          </div>
        ) : null}
      </dl>

      {event.cancelled ? (
        <p className="mt-6 rounded-(--radius-sm) bg-status-error/10 px-4 py-3 text-sm font-medium text-status-error">
          This event has been cancelled.
        </p>
      ) : null}

      <p className="mt-6 text-[17px] leading-relaxed text-foreground-muted">
        {event.summary ?? "A recap has not been added yet."}
      </p>

      <div className="mt-8 flex flex-col gap-3">
        <EventStatusActions event={event} />

        {event.url ? (
          <div>
            <Button href={event.url} variant="secondary" size="lg">
              Event page
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-5 py-16 text-sm text-foreground-muted">
          Loading event details…
        </div>
      }
    >
      <EventDetailContent params={params} />
    </Suspense>
  );
}
