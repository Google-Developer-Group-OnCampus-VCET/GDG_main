import { Suspense } from "react";
import type { Metadata } from "next";
import { getPlatformAnalytics, getAllEventsAdmin } from "@/lib/db";
import { PlatformAnalyticsView } from "@/components/admin/platform-analytics-view";

export const metadata: Metadata = {
  title: "Cross-Event Platform Analytics · GDG VCET Admin",
};

export default function AdminAnalyticsPage() {
  const analytics = getPlatformAnalytics("gdg-vcet");
  const events = getAllEventsAdmin();

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <Suspense fallback={<div className="h-64 flex items-center justify-center">Loading platform analytics...</div>}>
        <PlatformAnalyticsView analytics={analytics} events={events} />
      </Suspense>
    </div>
  );
}

