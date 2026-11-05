import { NextResponse } from "next/server";
import { getAllEventsAdmin, createEventAdmin, logAuditEvent } from "@/lib/db";

export async function GET() {
  try {
    const events = getAllEventsAdmin();
    return NextResponse.json({ success: true, events });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch events", message: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = createEventAdmin(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to create event" }, { status: 400 });
    }

    logAuditEvent({
      userId: "usr-admin",
      userEmail: "lead@vcet.edu.in",
      action: "create_event",
      entityType: "event",
      entityId: result.event?.slug || "unknown",
      details: `Created new event: ${result.event?.title}`,
    });

    return NextResponse.json({ success: true, event: result.event }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to process request", message: String(error) }, { status: 500 });
  }
}

