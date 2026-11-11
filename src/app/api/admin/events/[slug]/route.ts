import { NextResponse } from "next/server";
import { getEventBySlug, updateEventAdmin, deleteEventAdmin, logAuditEvent } from "@/lib/db";
import { AuthError, requirePermission, toAuthErrorResponse } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const user = await requirePermission("manage_events");
    const { slug } = await params;
    const event = getEventBySlug(slug, user.chapterId);

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, event });
  } catch (error) {
    if (error instanceof AuthError) return toAuthErrorResponse(error);
    console.error("GET /api/admin/events/[slug] failed:", error);
    return NextResponse.json({ error: "Failed to fetch event" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const user = await requirePermission("manage_events");
    const { slug } = await params;
    const body = await request.json();

    const success = updateEventAdmin(slug, body);
    if (!success) {
      return NextResponse.json({ error: "Failed to update event" }, { status: 400 });
    }

    logAuditEvent({
      chapterId: user.chapterId,
      userId: user.id,
      userEmail: user.email,
      action: "update_event",
      entityType: "event",
      entityId: slug,
      details: `Updated event parameters for: ${slug}`,
    });

    return NextResponse.json({ success: true, message: `Event ${slug} updated successfully` });
  } catch (error) {
    if (error instanceof AuthError) return toAuthErrorResponse(error);
    console.error("PUT /api/admin/events/[slug] failed:", error);
    return NextResponse.json({ error: "Failed to process update" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const user = await requirePermission("manage_events");
    const { slug } = await params;
    const success = deleteEventAdmin(slug);

    if (!success) {
      return NextResponse.json({ error: "Failed to delete event" }, { status: 400 });
    }

    logAuditEvent({
      chapterId: user.chapterId,
      userId: user.id,
      userEmail: user.email,
      action: "delete_event",
      entityType: "event",
      entityId: slug,
      details: `Deleted event: ${slug}`,
    });

    return NextResponse.json({ success: true, message: `Event ${slug} deleted successfully` });
  } catch (error) {
    if (error instanceof AuthError) return toAuthErrorResponse(error);
    console.error("DELETE /api/admin/events/[slug] failed:", error);
    return NextResponse.json({ error: "Failed to process deletion" }, { status: 500 });
  }
}
