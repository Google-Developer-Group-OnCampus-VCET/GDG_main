import { NextResponse } from "next/server";
import { getAnnouncementsAdmin, createAnnouncementAdmin, logAuditEvent } from "@/lib/db";

export async function GET() {
  try {
    const announcements = getAnnouncementsAdmin();
    return NextResponse.json({ success: true, announcements });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch announcements", message: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const announcement = createAnnouncementAdmin(body);

    logAuditEvent({
      userId: "usr-admin",
      userEmail: "lead@vcet.edu.in",
      action: "create_announcement",
      entityType: "announcement",
      entityId: announcement.id,
      details: `Dispatched announcement: "${announcement.title}" to ${announcement.targetAudience} cohort (${announcement.sentCount} recipients)`,
    });

    return NextResponse.json({ success: true, announcement }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create announcement", message: String(error) }, { status: 500 });
  }
}

