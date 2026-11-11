import { Suspense } from "react";
import type { Metadata } from "next";
import { getAllEventsAdmin } from "@/lib/db";
import { AttendanceHubView } from "@/components/admin/attendance-hub-view";

export const metadata: Metadata = {
  title: "QR Attendance Terminal & Entrance Scanner · GDG VCET Admin",
};

export default function AdminAttendancePage() {
  const events = getAllEventsAdmin();

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <Suspense fallback={<div className="h-64 flex items-center justify-center">Loading scanner terminal...</div>}>
        <AttendanceHubView events={events} />
      </Suspense>
    </div>
  );
}

