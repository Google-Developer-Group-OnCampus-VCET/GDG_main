import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { events } from "@/content/events";
import { EventSubNav } from "@/components/event-sub-nav";
import { EventSpeakersView } from "@/components/workshop/event-speakers-view";

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
  if (!event || !event.workshop) return { title: "Speakers" };
  return {
    title: `Speakers & Mentors · ${event.title}`,
    description: `Meet the instructors, mentors, and leads for ${event.title}.`,
  };
}

export default async function EventSpeakersPage({
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
      <EventSpeakersView event={event} workshop={event.workshop} />
    </div>
  );
}

