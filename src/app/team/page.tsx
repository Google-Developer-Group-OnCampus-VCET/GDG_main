import type { Metadata } from "next";
import { team } from "@/content/team";
import { SectionHeading } from "@/components/ui/section-heading";
import { TeamCard } from "@/components/team-card";

export const metadata: Metadata = {
  title: "Team",
  description: "Meet the organizers of GDG on Campus VCET.",
};

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

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {team.map((member) => (
          <TeamCard key={member.id} member={member} />
        ))}
      </div>
    </div>
  );
}
