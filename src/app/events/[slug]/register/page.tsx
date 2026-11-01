import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { events } from "@/content/events";
import { getEventStats } from "@/lib/db";
import { EventSubNav } from "@/components/event-sub-nav";
import { EventRegistrationView } from "@/components/workshop/event-registration-view";

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
  if (!event || !event.workshop) return { title: "Register" };
  return {
    title: `Register · ${event.title}`,
    description: `Official registration for ${event.title} at GDG on Campus VCET.`,
  };
}

export default async function EventRegisterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = findEvent(slug);
  if (!event || !event.workshop) notFound();

  let stats;
  try {
    stats = getEventStats(slug);
  } catch {
    // fallback
  }

  return (
    <div className="w-full flex flex-col">
      <EventSubNav event={event} />
      <EventRegistrationView
        event={event}
        workshop={event.workshop}
        stats={stats}
      />
    </div>
  );
}

