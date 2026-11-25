import { Suspense } from "react";
import { connection } from "next/server";
import { DEFAULT_CHAPTER_SETTINGS } from "@/lib/site-defaults";
import { getCachedAllEvents, getCachedSiteSettings } from "@/lib/db/cached";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { TeamCard } from "@/components/team-card";
import { Faq } from "@/components/faq";
import { UpcomingEventsSection } from "@/components/upcoming-events-section";
import { RecentPastEventsSection } from "@/components/recent-past-events-section";
import { EventCardsGridSkeleton } from "@/components/skeletons/event-skeletons";

async function HomeContent() {
  await connection();
  let settings = DEFAULT_CHAPTER_SETTINGS;
  let allEvents;
  try {
    [settings, allEvents] = await Promise.all([
      getCachedSiteSettings(),
      getCachedAllEvents(),
    ]);
  } catch {
    settings = DEFAULT_CHAPTER_SETTINGS;
  }

  const { chapter, team, learningAreas, homeFaq } = settings;

  return (
    <>
      <section className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-(--container-max) flex-col gap-6 px-5 py-16 sm:px-8 sm:py-24 lg:flex-row lg:items-center lg:gap-12 lg:px-10 lg:py-32">
          <div className="flex flex-1 flex-col gap-6">
            <p className="text-sm font-medium uppercase tracking-wide text-primary">
              {chapter.name}
            </p>
            <h1 className="text-[40px] font-medium leading-[1.1] text-foreground sm:text-[56px]">
              {chapter.tagline}
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-foreground-muted">
              {chapter.description}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button href={chapter.joinUrl} size="lg">
                Join the community
              </Button>
              <Button href="/events" variant="secondary" size="lg">
                Explore events
              </Button>
            </div>
          </div>

          <div className="flex-1" aria-hidden="true">
            <div className="grid grid-cols-3 gap-4 rounded-(--radius-lg) bg-surface-muted p-10">
              <div className="col-span-2 row-span-2 rounded-(--radius-md) bg-primary-decorative/20" />
              <div className="rounded-(--radius-md) bg-status-success/20" />
              <div className="rounded-(--radius-md) bg-status-warning/20" />
              <div className="col-span-3 h-16 rounded-(--radius-md) bg-primary/15" />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-(--container-max) flex-col gap-8 px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <SectionHeading
              eyebrow="Events"
              title="Upcoming events"
              description="Sessions, workshops, and study jams run by the chapter."
            />
            <Button href="/events" variant="ghost">
              View all events →
            </Button>
          </div>

          <Suspense fallback={<EventCardsGridSkeleton count={3} />}>
            <UpcomingEventsSection events={allEvents} chapterPageUrl={chapter.chapterPageUrl} />
          </Suspense>
        </div>
      </section>

      <section className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-(--container-max) flex-col gap-8 px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <SectionHeading
              eyebrow="Recap"
              title="Recently at GDG VCET"
              description="A look back at what the chapter has run so far."
            />
            <Button href="/events?tab=past" variant="ghost">
              View event archive →
            </Button>
          </div>

          <Suspense fallback={<EventCardsGridSkeleton count={3} />}>
            <RecentPastEventsSection events={allEvents} />
          </Suspense>
        </div>
      </section>

      <section className="border-b border-border bg-surface-muted">
        <div className="mx-auto flex max-w-(--container-max) flex-col gap-8 px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
          <SectionHeading
            eyebrow="Learn together"
            title="Where we focus"
            description="Hands-on learning across the areas our members care about most."
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {learningAreas.map((area) => (
              <Card key={area.id}>
                <h3 className="text-lg font-medium text-foreground">{area.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-foreground-muted">
                  {area.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-(--container-max) flex-col gap-6 px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
          <SectionHeading
            eyebrow="Community"
            title="Learn by building, together"
            description="We run workshops and study sessions where members build real projects side by side, share what they know, and help each other grow — rather than just attending a talk."
          />
        </div>
      </section>

      <section className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-(--container-max) flex-col gap-8 px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <SectionHeading eyebrow="People" title="Meet the team" />
            <Button href="/team" variant="ghost">
              View full team →
            </Button>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {team.slice(0, 4).map((member) => (
              <TeamCard key={member.id} member={member} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-surface-muted">
        <div className="mx-auto flex max-w-(--container-max) flex-col gap-8 px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
          <SectionHeading eyebrow="FAQ" title="Good to know" />
          <Faq items={homeFaq} />
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto flex max-w-(--container-max) flex-col items-start gap-6 px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
          <SectionHeading
            title="Ready to join?"
            description="Become part of the student developer community at VCET."
          />
          <Button href={chapter.joinUrl} size="lg">
            Join the community
          </Button>
        </div>
      </section>
    </>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-(--container-max) px-5 py-16 sm:px-8 lg:px-10">
          <EventCardsGridSkeleton count={3} />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
