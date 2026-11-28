import { NextResponse } from "next/server";
import {
  isAdminRequestAuthenticated,
  isCheckinPortalAuthenticated,
} from "@/lib/auth";
import {
  computeConfirmedAttendeeStats,
  getConfirmedAttendeesAsync,
  getFirestoreConfirmedAttendeesMeta,
  syncFirestoreConfirmedAttendeesMeta,
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

  // 1-doc read first (cached in-memory for 30s) — avoids scanning all 126 attendee docs on every poll
  let meta = await getFirestoreConfirmedAttendeesMeta(slug);
  if (!meta) {
    // Self-heal: persist meta so subsequent polls only do a 1-doc read (or 0-read memory cache hit)
    const attendees = await getConfirmedAttendeesAsync(slug);
    await syncFirestoreConfirmedAttendeesMeta(slug, attendees);
    meta = await getFirestoreConfirmedAttendeesMeta(slug);
  }

  if (meta) {
    return NextResponse.json(
      {
        success: true,
        stats: {
          checkedInCount: meta.checkedInCount,
          dailyCheckedInCounts: meta.dailyCheckedInCounts,
        },
      },
      {
        headers: {
          "Cache-Control": "private, max-age=5, stale-while-revalidate=15",
        },
      }
    );
  }

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
        "Cache-Control": "private, max-age=5, stale-while-revalidate=15",
      },
    }
  );
}
