import { NextResponse } from "next/server";
import { getChapterSettings, updateChapterSettings, logAuditEvent } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const chapterId = searchParams.get("chapterId") || "gdg-vcet";
    const settings = getChapterSettings(chapterId);
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch settings", message: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const chapterId = body.chapterId || "gdg-vcet";

    const success = updateChapterSettings(chapterId, body);
    if (!success) {
      return NextResponse.json({ error: "Failed to update settings" }, { status: 400 });
    }

    logAuditEvent({
      userId: "usr-admin",
      userEmail: "lead@vcet.edu.in",
      action: "update_chapter_settings",
      entityType: "chapter",
      entityId: chapterId,
      details: `Updated settings for chapter: ${chapterId}`,
    });

    const updated = getChapterSettings(chapterId);
    return NextResponse.json({ success: true, settings: updated });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update chapter settings", message: String(error) }, { status: 500 });
  }
}

