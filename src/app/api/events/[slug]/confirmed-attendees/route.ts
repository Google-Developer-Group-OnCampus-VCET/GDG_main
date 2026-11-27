import { NextResponse } from "next/server";
import { getAdminRoleFromRequest } from "@/lib/auth";
import {
  computeConfirmedAttendeeStats,
  getConfirmedAttendeesAsync,
  getFirestoreConfirmedAttendeesMeta,
} from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const role = await getAdminRoleFromRequest(request);
  if (!role) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Admin authorization required." },
      { status: 401 }
    );
  }

  const { slug } = await params;
  const url = new URL(request.url);
  const clientVersion = Number(url.searchParams.get("version") || 0);

  // 1-doc version check: avoids reading all 126 docs on idle polls
  const meta = await getFirestoreConfirmedAttendeesMeta(slug);
  if (meta && clientVersion > 0 && meta.version === clientVersion) {
    return NextResponse.json(
      {
        success: true,
        unchanged: true,
        version: meta.version,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }

  const attendees = await getConfirmedAttendeesAsync(slug);
  const stats = computeConfirmedAttendeeStats(attendees);

  return NextResponse.json(
    {
      success: true,
      version: meta?.version ?? Date.now(),
      attendees,
      stats,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
