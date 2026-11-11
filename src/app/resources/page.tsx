import { Suspense } from "react";
import type { Metadata } from "next";
import { getPublicResources } from "@/lib/db";
import { ResourcesView } from "@/components/public/resources-view";

export const metadata: Metadata = {
  title: "Community Learning Resources · GDG on Campus VCET",
  description:
    "Open-source slide decks, code repositories, starter kits, and documentation from Google Developer Groups on Campus VCET workshops and meetups.",
};

export default function ResourcesPage() {
  const initialResources = getPublicResources();

  return (
    <div className="min-h-screen bg-surface-container-lowest flex flex-col">
      {/* Hero Section */}
      <section className="border-b border-border bg-white py-12 md:py-16">
        <div className="mx-auto max-w-(--container-max) px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed text-xs font-semibold mb-4">
              <span className="w-2 h-2 rounded-full bg-secondary"></span>
              <span>Open Knowledge Base</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
              Community Resources &amp; Artifacts
            </h1>
            <p className="mt-4 text-base sm:text-lg text-foreground-muted leading-relaxed">
              Access curated session slides, code repositories, architecture guides, and cloud templates built by GDG VCET speakers and technical mentors. All resources are free for students.
            </p>
          </div>
        </div>
      </section>

      {/* Resource Catalog with Client Filters */}
      <main className="flex-1 mx-auto max-w-(--container-max) w-full px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <Suspense fallback={<div className="h-64 flex items-center justify-center text-foreground-muted">Loading resources...</div>}>
          <ResourcesView initialResources={initialResources} />
        </Suspense>
      </main>
    </div>
  );
}
