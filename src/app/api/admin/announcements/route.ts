import { NextResponse } from "next/server";
import { getAnnouncementsAdmin, createAnnouncementAdmin, deleteAnnouncementAdmin, logAuditEvent } from "@/lib/db";
import { AuthError, requirePermission, toAuthErrorResponse } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requirePermission("manage_announcements");
    const announcements = getAnnouncementsAdmin(user.chapterId);
    return NextResponse.json({ success: true, announcements });
  } catch (error) {
    if (error instanceof AuthError) return toAuthErrorResponse(error);
    console.error("GET /api/admin/announcements failed:", error);
    return NextResponse.json({ error: "Failed to fetch announcements" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("manage_announcements");
    const body = await request.json();
    const announcement = createAnnouncementAdmin(body, user.chapterId);

    logAuditEvent({
      chapterId: user.chapterId,
      userId: user.id,
      userEmail: user.email,
      action: "create_announcement",
      entityType: "announcement",
      entityId: announcement.id,
      details: `Created announcement: "${announcement.title}" for ${announcement.targetAudience} cohort (status: ${announcement.status})`,
    });

    return NextResponse.json({ success: true, announcement }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return toAuthErrorResponse(error);
    console.error("POST /api/admin/announcements failed:", error);
    return NextResponse.json({ error: "Failed to create announcement" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requirePermission("manage_announcements");
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Announcement ID is required" }, { status: 400 });
    }

    const success = deleteAnnouncementAdmin(id);
    if (!success) {
      return NextResponse.json({ error: "Announcement not found or could not be deleted" }, { status: 400 });
    }

    logAuditEvent({
      chapterId: user.chapterId,
      userId: user.id,
      userEmail: user.email,
      action: "delete_announcement",
      entityType: "announcement",
      entityId: id,
      details: `Deleted announcement: ${id}`,
    });

    return NextResponse.json({ success: true, message: `Announcement ${id} deleted successfully` });
  } catch (error) {
    if (error instanceof AuthError) return toAuthErrorResponse(error);
    console.error("DELETE /api/admin/announcements failed:", error);
    return NextResponse.json({ error: "Failed to delete announcement" }, { status: 500 });
  }
}
