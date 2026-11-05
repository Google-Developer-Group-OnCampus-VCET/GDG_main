import { NextResponse } from "next/server";
import { getEventBySlug, updateEventAdmin, deleteEventAdmin, logAuditEvent } from "@/lib/db";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const event = getEventBySlug(slug);

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, event });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch event", message: String(error) }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const body = await request.json();

    const success = updateEventAdmin(slug, body);
    if (!success) {
      return NextResponse.json({ error: "Failed to update event" }, { status: 400 });
    }

    logAuditEvent({
      userId: "usr-admin",
      userEmail: "lead@vcet.edu.in",
      action: "update_event",
      entityType: "event",
      entityId: slug,
      details: `Updated event parameters for: ${slug}`,
    });

    return NextResponse.json({ success: true, message: `Event ${slug} updated successfully` });
  } catch (error) {
    return NextResponse.json({ error: "Failed to process update", message: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const success = deleteEventAdmin(slug);

    if (!success) {
      return NextResponse.json({ error: "Failed to delete event" }, { status: 400 });
    }

    logAuditEvent({
      userId: "usr-admin",
      userEmail: "lead@vcet.edu.in",
      action: "delete_event",
      entityType: "event",
      entityId: slug,
      details: `Deleted event: ${slug}`,
    });

    return NextResponse.json({ success: true, message: `Event ${slug} deleted successfully` });
  } catch (error) {
    return NextResponse.json({ error: "Failed to process deletion", message: String(error) }, { status: 500 });
  }
}

