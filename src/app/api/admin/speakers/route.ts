import { NextResponse } from "next/server";
import { getSpeakersAdmin, createSpeakerAdmin, deleteSpeakerAdmin, logAuditEvent } from "@/lib/db";

export async function GET() {
  try {
    const speakers = getSpeakersAdmin();
    return NextResponse.json({ success: true, speakers });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch speakers", message: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const speaker = createSpeakerAdmin(body);

    logAuditEvent({
      userId: "usr-admin",
      userEmail: "lead@vcet.edu.in",
      action: "create_speaker",
      entityType: "speaker",
      entityId: speaker.id,
      details: `Created speaker profile: ${speaker.name} (${speaker.role})`,
    });

    return NextResponse.json({ success: true, speaker }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create speaker", message: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Speaker ID is required" }, { status: 400 });
    }

    const success = deleteSpeakerAdmin(id);
    if (!success) {
      return NextResponse.json({ error: "Speaker not found or could not be deleted" }, { status: 400 });
    }

    logAuditEvent({
      userId: "usr-admin",
      userEmail: "lead@vcet.edu.in",
      action: "delete_speaker",
      entityType: "speaker",
      entityId: id,
      details: `Deleted speaker profile: ${id}`,
    });

    return NextResponse.json({ success: true, message: `Speaker ${id} deleted successfully` });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete speaker", message: String(error) }, { status: 500 });
  }
}

