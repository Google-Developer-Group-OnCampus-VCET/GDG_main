import { Suspense } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { events } from "@/content/events";
import { formatEventDateRange } from "@/lib/events";
import { Button } from "@/components/ui/button";
import { EventStatusActions, EventStatusEyebrow } from "@/components/event-status-section";

export function generateStaticParams() {
  // Cache Components requires at least one static param to validate against.
  // Fall back to a placeholder if the fixture is ever empty; it correctly
  // 404s via findEvent() below.
  if (events.length === 0) return [{ slug: "__placeholder__" }];
  return events.map((event) => ({ slug: event.slug }));
}

function findEvent(slug: string) {
  return events.find((event) => event.slug === slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = findEvent(slug);
  if (!event) return { title: "Event not found" };
  return { title: event.title, description: event.summary };
}

const formatLabels: Record<string, string> = {
  "in-person": "In person",
  online: "Online",
  hybrid: "Hybrid",
};

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = findEvent(slug);
  if (!event) notFound();

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
      <Suspense fallback={<p className="h-5" />}>
        <EventStatusEyebrow event={event} />
      </Suspense>

      <h1 className="mt-2 text-[32px] font-medium leading-tight text-foreground sm:text-[40px]">
        {event.title}
      </h1>

      {event.image ? (
        <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-(--radius-md)">
          <Image src={event.image} alt="" fill sizes="(min-width: 768px) 768px, 100vw" className="object-cover" />
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
        <Suspense fallback={null}>
          <EventStatusActions event={event} />
        </Suspense>

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
