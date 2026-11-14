import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { events } from "@/content/events";
import { getEventBySlugAsync } from "@/lib/db";
import { EventSubNav } from "@/components/event-sub-nav";
import { EventAgendaView } from "@/components/workshop/event-agenda-view";

export function generateStaticParams() {
  return events
    .filter((e) => Boolean(e.workshop))
    .map((event) => ({ slug: event.slug }));
}

async function findEvent(slug: string) {
  try {
    const dbEvent = await getEventBySlugAsync(slug);
    if (dbEvent?.workshop) return dbEvent;
  } catch {
    // fallback
  }
  return events.find((event) => event.slug === slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await findEvent(slug);
  if (!event || !event.workshop) return { title: "Agenda" };
  return {
    title: `Agenda · ${event.title}`,
    description: `Complete workshop schedule and timeline for ${event.title}.`,
  };
}

export default async function EventAgendaPage({
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
      <EventAgendaView event={event} workshop={event.workshop} />
    </div>
  );
}

