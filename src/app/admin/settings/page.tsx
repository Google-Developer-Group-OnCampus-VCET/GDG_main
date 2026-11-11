import { Suspense } from "react";
import type { Metadata } from "next";
import { getChapterSettings } from "@/lib/db";
import { ChapterSettingsView } from "@/components/admin/chapter-settings-view";

export const metadata: Metadata = {
  title: "Chapter Settings & Multi-Chapter Architecture · GDG VCET Admin",
};

export default function AdminSettingsPage() {
  const initialSettings = getChapterSettings("gdg-vcet");

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <Suspense fallback={<div className="h-64 flex items-center justify-center">Loading chapter settings...</div>}>
        <ChapterSettingsView initialSettings={initialSettings} />
      </Suspense>
    </div>
  );
}

