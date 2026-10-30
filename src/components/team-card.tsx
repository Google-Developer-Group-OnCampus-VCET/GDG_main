import Image from "next/image";
import type { TeamMember } from "@/types";
import { Card } from "@/components/ui/card";

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function TeamCard({ member }: { member: TeamMember }) {
  return (
    <Card className="flex flex-col items-center gap-3 text-center">
      {member.photo ? (
        <Image
          src={member.photo}
          alt={member.name}
          width={96}
          height={96}
          className="h-24 w-24 rounded-full object-cover"
        />
      ) : (
        <div
          aria-hidden="true"
          className="flex h-24 w-24 items-center justify-center rounded-full bg-surface-muted text-xl font-medium text-foreground-muted"
        >
          {initials(member.name)}
        </div>
      )}
      <div>
        <p className="font-medium text-foreground">{member.name}</p>
        <p className="text-sm text-foreground-muted">{member.role}</p>
        {member.academicYear ? (
          <p className="text-xs text-foreground-muted">{member.academicYear}</p>
        ) : null}
      </div>
      {member.profileUrl ? (
        <a href={member.profileUrl} className="text-sm font-medium text-primary hover:underline">
          Profile
        </a>
      ) : null}
    </Card>
  );
}
