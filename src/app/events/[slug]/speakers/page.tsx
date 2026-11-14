import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { events } from "@/content/events";
import { getEventBySlugAsync } from "@/lib/db";
import { EventSubNav } from "@/components/event-sub-nav";
import { EventSpeakersView } from "@/components/workshop/event-speakers-view";

export function generateStaticParams() {
  return events
    .filter((e) => Boolean(e.workshop))
    .map((event) => ({ slug: event.slug }));
}

async function findEvent(slug: string) {
  const staticMatch = events.find((event) => event.slug === slug);
  if (staticMatch?.workshop) return staticMatch;

  await connection();
  try {
    const dbEvent = await getEventBySlugAsync(slug);
    if (dbEvent?.workshop) return dbEvent;
  } catch {
    // fallback
  }
  return staticMatch;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await findEvent(slug);
  if (!event || !event.workshop) return { title: "Speakers" };
  return {
    title: `Speakers & Mentors · ${event.title}`,
    description: `Meet the instructors, mentors, and leads for ${event.title}.`,
  };
}

async function EventSpeakersContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await findEvent(slug);
  if (!event || !event.workshop) notFound();

  return (
    <div className="w-full flex flex-col">
      <EventSubNav event={event} />
      <EventSpeakersView event={event} workshop={event.workshop} />
    </div>
  );
}

export default function EventSpeakersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-5 py-16 text-sm text-foreground-muted">
          Loading speakers…
        </div>
      }
    >
      <EventSpeakersContent params={params} />
    </Suspense>
  );
}
