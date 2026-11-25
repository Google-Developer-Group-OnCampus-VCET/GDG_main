import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import { DEFAULT_CHAPTER_SETTINGS } from "@/lib/site-defaults";
import { getCachedSiteSettings } from "@/lib/db/cached";
import { SectionHeading } from "@/components/ui/section-heading";
import { TeamCard } from "@/components/team-card";

export const metadata: Metadata = {
  title: "Team",
  description: "Meet the organizers of GDG on Campus VCET.",
};

async function TeamGridContent() {
  await connection();
  let settings = DEFAULT_CHAPTER_SETTINGS;
  try {
    settings = await getCachedSiteSettings();
  } catch {
    settings = DEFAULT_CHAPTER_SETTINGS;
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {settings.team.map((member) => (
        <TeamCard key={member.id} member={member} />
      ))}
    </div>
  );
}

export default function TeamPage() {
  return (
    <div className="mx-auto max-w-(--container-max) px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
      <div className="mb-10">
        <SectionHeading
          eyebrow="People"
          title="Organizers"
          description="The organizers behind GDG on Campus VCET."
        />
      </div>

      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <div className="h-56 rounded-2xl bg-surface-muted animate-pulse" />
            <div className="h-56 rounded-2xl bg-surface-muted animate-pulse" />
            <div className="h-56 rounded-2xl bg-surface-muted animate-pulse" />
            <div className="h-56 rounded-2xl bg-surface-muted animate-pulse" />
          </div>
        }
      >
        <TeamGridContent />
      </Suspense>
    </div>
  );
}
