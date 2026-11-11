import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEventBySlug, getAllEventsAdmin } from "@/lib/db";
import { EventBuilderForm } from "@/components/admin/event-builder-form";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const events = getAllEventsAdmin();
  return events.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = getEventBySlug(slug);

  return {
    title: `Edit ${event?.title || "Event"} · GDG on Campus VCET Admin`,
  };
}

export default async function EditEventPage({ params }: PageProps) {
  const { slug } = await params;
  const event = getEventBySlug(slug);

  if (!event) {
    notFound();
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col">
      <Suspense fallback={<div className="h-64 flex items-center justify-center">Loading event...</div>}>
        <EventBuilderForm initialEvent={event} isEditMode={true} />
      </Suspense>
    </div>
  );
}
