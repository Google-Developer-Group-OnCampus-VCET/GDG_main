import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { events } from "@/content/events";
import { getEventBySlugAsync } from "@/lib/db";
import { EventSubNav } from "@/components/event-sub-nav";
import { EventSponsorsView } from "@/components/workshop/event-sponsors-view";

export function generateStaticParams() {
  const sponsored = events.filter((e) => Boolean(e.workshop && e.workshop.showSponsors));
  if (sponsored.length === 0) return [{ slug: "__placeholder__" }];
  return sponsored.map((event) => ({ slug: event.slug }));
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
  if (!event || !event.workshop) return { title: "Sponsors & Partners" };
  return {
    title: `Sponsors & Partners · ${event.title}`,
    description: `Community partners and sponsors supporting ${event.title}.`,
  };
}

export default async function EventSponsorsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await findEvent(slug);
  if (!event || !event.workshop || !event.workshop.showSponsors) notFound();

  return (
    <div className="w-full flex flex-col">
      <EventSubNav event={event} />
      <EventSponsorsView event={event} workshop={event.workshop} />
    </div>
  );
}

