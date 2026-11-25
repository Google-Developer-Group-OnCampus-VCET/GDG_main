import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { events } from "@/content/events";
import { getCachedEventBySlug } from "@/lib/db/cached";
import { resolveWorkshopDetails } from "@/lib/workshop-fallback";
import { EventSubNav } from "@/components/event-sub-nav";
import { EventSponsorsView } from "@/components/workshop/event-sponsors-view";
import { EventSponsorsSkeleton } from "@/components/skeletons/event-skeletons";

export function generateStaticParams() {
  const sponsored = events.filter((e) => Boolean(e.workshop && e.workshop.showSponsors));
  if (sponsored.length === 0) return [{ slug: "__placeholder__" }];
  return sponsored.map((event) => ({ slug: event.slug }));
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
  const staticMatch = events.find((event) => event.slug === slug);
  if (staticMatch?.workshop) {
    return {
      title: `Sponsors & Partners · ${staticMatch.title}`,
      description: `Community partners and sponsors supporting ${staticMatch.title}.`,
    };
  }
  const event = await findEvent(slug);
  if (!event || !event.workshop) return { title: "Sponsors & Partners" };
  return {
    title: `Sponsors & Partners · ${event.title}`,
    description: `Community partners and sponsors supporting ${event.title}.`,
  };
}

async function EventSponsorsContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await findEvent(slug);
  if (!event || !event.workshop || !event.workshop.showSponsors) notFound();

  const workshop = resolveWorkshopDetails(event);

  return (
    <div className="w-full flex flex-col">
      <EventSubNav event={event} />
      <EventSponsorsView event={event} workshop={workshop} />
    </div>
  );
}

export default function EventSponsorsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<EventSponsorsSkeleton />}>
      <EventSponsorsContent params={params} />
    </Suspense>
  );
}
