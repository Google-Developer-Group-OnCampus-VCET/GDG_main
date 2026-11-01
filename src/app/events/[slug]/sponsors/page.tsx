import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { events } from "@/content/events";
import { EventSubNav } from "@/components/event-sub-nav";
import { EventSponsorsView } from "@/components/workshop/event-sponsors-view";

export function generateStaticParams() {
  return events
    .filter((e) => Boolean(e.workshop))
    .map((event) => ({ slug: event.slug }));
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
  const event = findEvent(slug);
  if (!event || !event.workshop) notFound();

  return (
    <div className="w-full flex flex-col">
      <EventSubNav event={event} />
      <EventSponsorsView event={event} workshop={event.workshop} />
    </div>
  );
}

