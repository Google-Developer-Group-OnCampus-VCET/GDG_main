import { NextResponse } from "next/server";
import {
  isAdminRequestAuthenticated,
  isCheckinPortalAuthenticated,
} from "@/lib/auth";
import {
  computeConfirmedAttendeeStats,
  getConfirmedAttendeesAsync,
} from "@/lib/db";

export async function GET(request: Request) {
  const isPortal = await isCheckinPortalAuthenticated(request);
  const isAdmin = await isAdminRequestAuthenticated(request);

  if (!isPortal && !isAdmin) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Check-in passcode required." },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const slug = url.searchParams.get("slug")?.trim() || "dev-to-cloud";

  const attendees = await getConfirmedAttendeesAsync(slug);
  const stats = computeConfirmedAttendeeStats(attendees);

  return NextResponse.json(
    {
      success: true,
      stats: {
        checkedInCount: stats.checkedInCount,
        dailyCheckedInCounts: stats.dailyCheckedInCounts,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
