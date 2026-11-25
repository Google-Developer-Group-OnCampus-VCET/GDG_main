import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { events } from "@/content/events";
import { getCachedEventBySlug, getCachedPublicEventStats } from "@/lib/db/cached";
import { resolveWorkshopDetails } from "@/lib/workshop-fallback";
import { EventSubNav } from "@/components/event-sub-nav";
import { EventAgendaView } from "@/components/workshop/event-agenda-view";
import { EventAgendaSkeleton } from "@/components/skeletons/event-skeletons";

export function generateStaticParams() {
  return events
    .filter((e) => Boolean(e.workshop))
    .map((event) => ({ slug: event.slug }));
}

async function findEvent(slug: string) {
  await connection();
  try {
    const dbEvent = await getCachedEventBySlug(slug);
    if (dbEvent?.workshop) return dbEvent;
  } catch {
    // fallback
  }

  const staticMatch = events.find((event) => event.slug === slug);
  return staticMatch ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await findEvent(slug);
  if (event?.workshop) {
    return {
      title: `Agenda · ${event.title}`,
      description: `Complete workshop schedule and timeline for ${event.title}.`,
    };
  }
  return { title: "Agenda" };
}

async function EventAgendaContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await findEvent(slug);
  if (!event || !event.workshop) notFound();

  let stats;
  try {
    stats = await getCachedPublicEventStats(slug);
  } catch {
    // fallback
  }

  const workshop = resolveWorkshopDetails(event, stats);

  return (
    <div className="w-full flex flex-col">
      <EventSubNav event={event} />
      <EventAgendaView event={event} workshop={workshop} stats={stats} />
    </div>
  );
}

export default function EventAgendaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<EventAgendaSkeleton />}>
      <EventAgendaContent params={params} />
    </Suspense>
  );
}
