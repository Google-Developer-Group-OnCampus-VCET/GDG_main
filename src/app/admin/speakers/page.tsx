import { Suspense } from "react";
import type { Metadata } from "next";
import { getSpeakersAdmin } from "@/lib/db";
import { SpeakersManagerView } from "@/components/admin/speakers-manager-view";

export const metadata: Metadata = {
  title: "Speakers & Mentors Management · GDG VCET Admin",
};

export default function AdminSpeakersPage() {
  const initialSpeakers = getSpeakersAdmin();

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <Suspense fallback={<div className="h-64 flex items-center justify-center">Loading speakers...</div>}>
        <SpeakersManagerView initialSpeakers={initialSpeakers} />
      </Suspense>
    </div>
  );
}

