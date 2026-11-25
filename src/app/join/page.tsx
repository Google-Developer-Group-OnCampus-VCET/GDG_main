import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import { DEFAULT_CHAPTER_SETTINGS } from "@/lib/site-defaults";
import { getCachedSiteSettings } from "@/lib/db/cached";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { Faq } from "@/components/faq";

export const metadata: Metadata = {
  title: "Join",
  description: "Join GDG on Campus VCET through the official chapter page.",
};

async function JoinContent() {
  await connection();
  let settings = DEFAULT_CHAPTER_SETTINGS;
  try {
    settings = await getCachedSiteSettings();
  } catch {
    settings = DEFAULT_CHAPTER_SETTINGS;
  }

  const { chapter, joinDescription, joinFaq } = settings;

  return (
    <>
      <div className="mb-10 flex flex-col gap-6">
        <SectionHeading
          eyebrow="Join"
          title={`Join ${chapter.name}`}
          description={joinDescription}
        />
        <div>
          <Button href={chapter.joinUrl} size="lg">
            Join on the official chapter page
          </Button>
        </div>
      </div>

      {chapter.socials.length > 0 ? (
        <div className="mb-10 flex flex-col gap-3">
          <h2 className="text-lg font-medium text-foreground">Follow along</h2>
          <ul className="flex flex-wrap gap-4">
            {chapter.socials.map((social) => (
              <li key={social.href}>
                <a href={social.href} className="text-sm font-medium text-primary hover:underline">
                  {social.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="max-w-2xl">
        <h2 className="mb-4 text-lg font-medium text-foreground">FAQ</h2>
        <Faq items={joinFaq} />
      </div>
    </>
  );
}

export default function JoinPage() {
  return (
    <div className="mx-auto max-w-(--container-max) px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
      <Suspense fallback={<div className="h-48 rounded-2xl bg-surface-muted animate-pulse" />}>
        <JoinContent />
      </Suspense>
    </div>
  );
}
