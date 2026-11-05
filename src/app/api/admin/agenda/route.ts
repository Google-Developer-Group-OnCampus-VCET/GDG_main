import { NextResponse } from "next/server";
import { getAgendaSessions, createAgendaSession, deleteAgendaSession, logAuditEvent } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventSlug = searchParams.get("eventSlug") || undefined;
    const sessions = getAgendaSessions(eventSlug);
    return NextResponse.json({ success: true, sessions });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch agenda sessions", message: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const session = createAgendaSession(body);

    logAuditEvent({
      userId: "usr-admin",
      userEmail: "lead@vcet.edu.in",
      action: "create_agenda_session",
      entityType: "agenda",
      entityId: session.id,
      details: `Created agenda slot: ${session.time} - ${session.title}`,
    });

    return NextResponse.json({ success: true, session }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create agenda session", message: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
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
      userId: "usr-admin",
      userEmail: "lead@vcet.edu.in",
      action: "delete_agenda_session",
      entityType: "agenda",
      entityId: id,
      details: `Deleted agenda session: ${id}`,
    });

    return NextResponse.json({ success: true, message: `Session ${id} deleted successfully` });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete agenda session", message: String(error) }, { status: 500 });
  }
}

