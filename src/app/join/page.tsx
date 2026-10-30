import type { Metadata } from "next";
import { chapter } from "@/content/chapter";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { Faq } from "@/components/faq";

export const metadata: Metadata = {
  title: "Join",
  description: "Join GDG on Campus VCET through the official chapter page.",
};

const faqItems = [
  {
    question: "Is joining free?",
    answer: "Yes, joining the community itself is free. Individual events may have their own cost, noted on each event's page.",
  },
  {
    question: "What happens after I join?",
    answer:
      "You'll be connected to the chapter's official community channels, where announcements about upcoming sessions are shared.",
  },
  {
    question: "I'm new to programming — is this still for me?",
    answer: "Yes. The community welcomes members at every experience level.",
  },
];

export default function JoinPage() {
  return (
    <div className="mx-auto max-w-(--container-max) px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
      <div className="mb-10 flex flex-col gap-6">
        <SectionHeading
          eyebrow="Join"
          title="Join GDG on Campus VCET"
          description="Membership is managed through the official GDG community platform. Use the button below to join — it takes you to the verified chapter page."
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
        <Faq items={faqItems} />
      </div>
    </div>
  );
}
