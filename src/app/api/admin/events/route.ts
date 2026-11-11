import { NextResponse } from "next/server";
import { getAllEventsAdmin, createEventAdmin, logAuditEvent } from "@/lib/db";
import { AuthError, requirePermission, toAuthErrorResponse } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requirePermission("manage_events");
    const events = getAllEventsAdmin(user.chapterId);
    return NextResponse.json({ success: true, events });
  } catch (error) {
    if (error instanceof AuthError) return toAuthErrorResponse(error);
    console.error("GET /api/admin/events failed:", error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("manage_events");
    const body = await request.json();
    const result = createEventAdmin({ ...body, chapterId: user.chapterId });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to create event" }, { status: 400 });
    }

    logAuditEvent({
      chapterId: user.chapterId,
      userId: user.id,
      userEmail: user.email,
      action: "create_event",
      entityType: "event",
      entityId: result.event?.slug || "unknown",
      details: `Created new event: ${result.event?.title}`,
    });

    return NextResponse.json({ success: true, event: result.event }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return toAuthErrorResponse(error);
    console.error("POST /api/admin/events failed:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
