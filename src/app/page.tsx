import { Suspense } from "react";
import { chapter } from "@/content/chapter";
import { events } from "@/content/events";
import { team } from "@/content/team";
import { learningAreas } from "@/content/learning-areas";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { TeamCard } from "@/components/team-card";
import { Faq } from "@/components/faq";
import { UpcomingEventsSection } from "@/components/upcoming-events-section";
import { RecentPastEventsSection } from "@/components/recent-past-events-section";

const faqItems = [
  {
    question: "Who can join GDG on Campus VCET?",
    answer:
      "Any student at Vidyavardhini's College of Engineering and Technology interested in learning and building with technology is welcome, regardless of branch or year.",
  },
  {
    question: "Do I need prior experience?",
    answer:
      "No. Sessions are designed to be approachable for beginners, with more advanced tracks for members who want to go deeper.",
  },
  {
    question: "How do I join?",
    answer:
      "Use the official chapter page to join the community — see the Join the community button above or visit the Join page for details.",
  },
  {
    question: "How will I know about upcoming events?",
    answer:
      "Announcements are shared through the community's official channels and listed on the Events page as they're confirmed.",
  },
  {
    question: "Are events always free?",
    answer:
      "Most community sessions are free, but cost depends on the specific event — check each event's details page before registering.",
  },
];

export default function Home() {
  return (
    <>
      <section className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-(--container-max) flex-col gap-6 px-5 py-16 sm:px-8 sm:py-24 lg:flex-row lg:items-center lg:gap-12 lg:px-10 lg:py-32">
          <div className="flex flex-1 flex-col gap-6">
            <p className="text-sm font-medium uppercase tracking-wide text-primary">
              GDG on Campus · VCET
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

          <Suspense fallback={<p className="text-sm text-foreground-muted">Loading events…</p>}>
            <UpcomingEventsSection events={events} />
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

          <Suspense fallback={<p className="text-sm text-foreground-muted">Loading events…</p>}>
            <RecentPastEventsSection events={events} />
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
          <Faq items={faqItems} />
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
