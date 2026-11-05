import { Suspense } from "react";
import type { Metadata } from "next";
import { EventBuilderForm } from "@/components/admin/event-builder-form";

export const metadata: Metadata = {
  title: "Create Community Event · GDG on Campus VCET Admin",
};

export default function CreateEventPage() {
  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col">
      <Suspense fallback={<div className="h-64 flex items-center justify-center">Loading event builder...</div>}>
        <EventBuilderForm isEditMode={false} />
      </Suspense>
    </div>
  );
}

