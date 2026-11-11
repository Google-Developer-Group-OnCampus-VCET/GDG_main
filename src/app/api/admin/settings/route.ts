import { NextResponse } from "next/server";
import { getChapterSettings, updateChapterSettings, logAuditEvent } from "@/lib/db";
import { AuthError, requirePermission, toAuthErrorResponse } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requirePermission("manage_settings");
    const settings = getChapterSettings(user.chapterId);
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    if (error instanceof AuthError) return toAuthErrorResponse(error);
    console.error("GET /api/admin/settings failed:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("manage_settings");
    const body = await request.json();
    // Chapter id is always the admin's own chapter — never trust a client-supplied value here.
    const chapterId = user.chapterId;

    const success = updateChapterSettings(chapterId, body);
    if (!success) {
      return NextResponse.json({ error: "Failed to update settings" }, { status: 400 });
    }

    logAuditEvent({
      chapterId,
      userId: user.id,
      userEmail: user.email,
      action: "update_chapter_settings",
      entityType: "chapter",
      entityId: chapterId,
      details: `Updated settings for chapter: ${chapterId}`,
    });

    const updated = getChapterSettings(chapterId);
    return NextResponse.json({ success: true, settings: updated });
  } catch (error) {
    if (error instanceof AuthError) return toAuthErrorResponse(error);
    console.error("POST /api/admin/settings failed:", error);
    return NextResponse.json({ error: "Failed to update chapter settings" }, { status: 500 });
  }
}
