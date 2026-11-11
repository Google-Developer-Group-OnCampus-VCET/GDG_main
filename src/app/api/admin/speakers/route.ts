import { NextResponse } from "next/server";
import { getSpeakersAdmin, createSpeakerAdmin, updateSpeakerAdmin, deleteSpeakerAdmin, logAuditEvent } from "@/lib/db";
import { AuthError, requirePermission, toAuthErrorResponse } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requirePermission("manage_speakers");
    const speakers = getSpeakersAdmin(user.chapterId);
    return NextResponse.json({ success: true, speakers });
  } catch (error) {
    if (error instanceof AuthError) return toAuthErrorResponse(error);
    console.error("GET /api/admin/speakers failed:", error);
    return NextResponse.json({ error: "Failed to fetch speakers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("manage_speakers");
    const body = await request.json();
    const speaker = createSpeakerAdmin(body, user.chapterId);

    logAuditEvent({
      chapterId: user.chapterId,
      userId: user.id,
      userEmail: user.email,
      action: "create_speaker",
      entityType: "speaker",
      entityId: speaker.id,
      details: `Created speaker profile: ${speaker.name} (${speaker.role})`,
    });

    return NextResponse.json({ success: true, speaker }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return toAuthErrorResponse(error);
    console.error("POST /api/admin/speakers failed:", error);
    return NextResponse.json({ error: "Failed to create speaker" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requirePermission("manage_speakers");
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Speaker ID is required" }, { status: 400 });
    }
    const body = await request.json();
    const success = updateSpeakerAdmin(id, body);
    if (!success) {
      return NextResponse.json({ error: "Speaker not found or could not be updated" }, { status: 400 });
    }

    logAuditEvent({
      chapterId: user.chapterId,
      userId: user.id,
      userEmail: user.email,
      action: "update_speaker",
      entityType: "speaker",
      entityId: id,
      details: `Updated speaker profile: ${id}`,
    });

    return NextResponse.json({ success: true, message: `Speaker ${id} updated successfully` });
  } catch (error) {
    if (error instanceof AuthError) return toAuthErrorResponse(error);
    console.error("PATCH /api/admin/speakers failed:", error);
    return NextResponse.json({ error: "Failed to update speaker" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requirePermission("manage_speakers");
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
      chapterId: user.chapterId,
      userId: user.id,
      userEmail: user.email,
      action: "delete_speaker",
      entityType: "speaker",
      entityId: id,
      details: `Deleted speaker profile: ${id}`,
    });

    return NextResponse.json({ success: true, message: `Speaker ${id} deleted successfully` });
  } catch (error) {
    if (error instanceof AuthError) return toAuthErrorResponse(error);
    console.error("DELETE /api/admin/speakers failed:", error);
    return NextResponse.json({ error: "Failed to delete speaker" }, { status: 500 });
  }
}
