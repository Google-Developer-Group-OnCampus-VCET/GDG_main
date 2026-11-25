import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import { DEFAULT_CHAPTER_SETTINGS } from "@/lib/site-defaults";
import { getCachedSiteSettings } from "@/lib/db/cached";
import { SectionHeading } from "@/components/ui/section-heading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About",
  description: "What GDG on Campus VCET does and who can take part.",
};

async function AboutContent() {
  await connection();
  let settings = DEFAULT_CHAPTER_SETTINGS;
  try {
    settings = await getCachedSiteSettings();
  } catch {
    settings = DEFAULT_CHAPTER_SETTINGS;
  }

  const { chapter, aboutDescription, aboutCards } = settings;

  return (
    <div className="flex flex-col gap-10">
      <div className="max-w-2xl">
        <p className="text-[17px] leading-relaxed text-foreground-muted">
          {aboutDescription || chapter.description}
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {aboutCards.map((card, idx) => (
          <Card key={`${card.title}-${idx}`}>
            <h2 className="text-lg font-medium text-foreground">{card.title}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-foreground-muted">
              {card.description}
            </p>
          </Card>
        ))}
      </div>

      <div>
        <Button href={chapter.joinUrl} size="lg">
          Join the community
        </Button>
      </div>
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-(--container-max) px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
      <div className="mb-10">
        <SectionHeading eyebrow="About" title="About GDG on Campus VCET" />
      </div>

      <Suspense
        fallback={
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="h-36 rounded-2xl bg-surface-muted animate-pulse" />
            <div className="h-36 rounded-2xl bg-surface-muted animate-pulse" />
          </div>
        }
      >
        <AboutContent />
      </Suspense>
    </div>
  );
}
