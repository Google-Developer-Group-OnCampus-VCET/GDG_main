import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { events as staticEvents } from "@/content/events";
import { getEventBySlugAsync, getEventStatsAsync } from "@/lib/db";
import { resolveWorkshopDetails } from "@/lib/workshop-fallback";
import { EventSubNav } from "@/components/event-sub-nav";
import { EventRegistrationView } from "@/components/workshop/event-registration-view";

export function generateStaticParams() {
  return staticEvents
    .filter((e) => Boolean(e.workshop))
    .map((event) => ({ slug: event.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const staticMatch = staticEvents.find((e) => e.slug === slug);
  if (staticMatch) {
    return {
      title: `Register · ${staticMatch.title}`,
      description: `Official registration for ${staticMatch.title} at GDG on Campus VCET.`,
    };
  }
  await connection();
  const event = await getEventBySlugAsync(slug);
  if (!event) return { title: "Register" };
  return {
    title: `Register · ${event.title}`,
    description: `Official registration for ${event.title} at GDG on Campus VCET.`,
  };
}

async function EventRegisterContent({ slug }: { slug: string }) {
  await connection();
  const event = await getEventBySlugAsync(slug);
  if (!event) notFound();

  let stats;
  try {
    stats = await getEventStatsAsync(slug);
  } catch {
    // fallback to defaults
  }

  const workshop = resolveWorkshopDetails(event, stats);

  return (
    <div className="w-full flex flex-col">
      {event.workshop ? (
        <EventSubNav event={event} />
      ) : (
        <div className="border-b border-border bg-white/95 px-4 py-3 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-(--container-max) items-center justify-between text-xs">
            <Link
              href={`/events/${event.slug}`}
              className="font-semibold text-primary hover:text-primary-hover"
            >
              ← Back to {event.title}
            </Link>
            <span className="text-foreground-muted">Official Registration</span>
          </div>
        </div>
      )}
      <EventRegistrationView
        event={event}
        workshop={workshop}
        stats={stats}
      />
    </div>
  );
}

export default async function EventRegisterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-(--container-max) px-4 py-16 text-sm text-foreground-muted">
          Loading registration form…
        </div>
      }
    >
      <EventRegisterContent slug={slug} />
    </Suspense>
  );
}
