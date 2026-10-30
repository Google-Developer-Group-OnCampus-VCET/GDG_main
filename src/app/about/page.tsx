import type { Metadata } from "next";
import { chapter } from "@/content/chapter";
import { SectionHeading } from "@/components/ui/section-heading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About",
  description: "What GDG on Campus VCET does and who can take part.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-(--container-max) px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
      <div className="mb-10">
        <SectionHeading eyebrow="About" title="About GDG on Campus VCET" />
      </div>

      <div className="flex flex-col gap-10">
        <div className="max-w-2xl">
          <p className="text-[17px] leading-relaxed text-foreground-muted">{chapter.description}</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Card>
            <h2 className="text-lg font-medium text-foreground">What we do</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-foreground-muted">
              We run workshops, study sessions, and hands-on project work focused on web, AI/ML,
              cloud, and Android development — organized by and for VCET students.
            </p>
          </Card>
          <Card>
            <h2 className="text-lg font-medium text-foreground">Who can take part</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-foreground-muted">
              Any student at {chapter.institution} is welcome, regardless of branch, year, or
              prior experience.
            </p>
          </Card>
          <Card>
            <h2 className="text-lg font-medium text-foreground">Relationship to GDG</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-foreground-muted">
              GDG on Campus VCET is a community-run student chapter, independent of Google, that
              participates in the broader Google Developer Groups on Campus program.
            </p>
          </Card>
          <Card>
            <h2 className="text-lg font-medium text-foreground">At VCET</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-foreground-muted">
              The chapter operates at {chapter.institution}, bringing a developer community
              directly into campus life.
            </p>
          </Card>
        </div>

        <div>
          <Button href={chapter.joinUrl} size="lg">
            Join the community
          </Button>
        </div>
      </div>
    </div>
  );
}
