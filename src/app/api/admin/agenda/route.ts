import { NextResponse } from "next/server";
import { getAgendaSessions, createAgendaSession, updateAgendaSession, deleteAgendaSession, logAuditEvent } from "@/lib/db";
import { AuthError, requirePermission, toAuthErrorResponse } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await requirePermission("manage_agenda");
    const { searchParams } = new URL(request.url);
    const eventSlug = searchParams.get("eventSlug") || undefined;
    const sessions = getAgendaSessions(eventSlug);
    return NextResponse.json({ success: true, sessions });
  } catch (error) {
    if (error instanceof AuthError) return toAuthErrorResponse(error);
    console.error("GET /api/admin/agenda failed:", error);
    return NextResponse.json({ error: "Failed to fetch agenda sessions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("manage_agenda");
    const body = await request.json();
    const session = createAgendaSession(body);

    logAuditEvent({
      userId: user.id,
      userEmail: user.email,
      action: "create_agenda_session",
      entityType: "agenda",
      entityId: session.id,
      details: `Created agenda slot: ${session.time} - ${session.title}`,
    });

    return NextResponse.json({ success: true, session }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return toAuthErrorResponse(error);
    console.error("POST /api/admin/agenda failed:", error);
    return NextResponse.json({ error: "Failed to create agenda session" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requirePermission("manage_agenda");
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }
    const body = await request.json();
    const success = updateAgendaSession(id, body);
    if (!success) {
      return NextResponse.json({ error: "Session not found or could not be updated" }, { status: 400 });
    }

    logAuditEvent({
      userId: user.id,
      userEmail: user.email,
      action: "update_agenda_session",
      entityType: "agenda",
      entityId: id,
      details: `Updated agenda session: ${id}`,
    });

    return NextResponse.json({ success: true, message: `Session ${id} updated successfully` });
  } catch (error) {
    if (error instanceof AuthError) return toAuthErrorResponse(error);
    console.error("PATCH /api/admin/agenda failed:", error);
    return NextResponse.json({ error: "Failed to update agenda session" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requirePermission("manage_agenda");
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    const success = deleteAgendaSession(id);
    if (!success) {
      return NextResponse.json({ error: "Session not found or could not be deleted" }, { status: 400 });
    }

    logAuditEvent({
      userId: user.id,
      userEmail: user.email,
      action: "delete_agenda_session",
      entityType: "agenda",
      entityId: id,
      details: `Deleted agenda session: ${id}`,
    });

    return NextResponse.json({ success: true, message: `Session ${id} deleted successfully` });
  } catch (error) {
    if (error instanceof AuthError) return toAuthErrorResponse(error);
    console.error("DELETE /api/admin/agenda failed:", error);
    return NextResponse.json({ error: "Failed to delete agenda session" }, { status: 500 });
  }
}
