import { NextResponse } from "next/server";
import { duplicateEventAdmin, logAuditEvent } from "@/lib/db";
import { AuthError, requirePermission, toAuthErrorResponse } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const user = await requirePermission("manage_events");
    const { slug } = await params;
    const result = duplicateEventAdmin(slug);

    if (!result.success) {
      return NextResponse.json({ error: "Failed to duplicate event" }, { status: 400 });
    }

    logAuditEvent({
      chapterId: user.chapterId,
      userId: user.id,
      userEmail: user.email,
      action: "duplicate_event",
      entityType: "event",
      entityId: result.newSlug || slug,
      details: `Duplicated event from: ${slug} -> ${result.newSlug}`,
    });

    return NextResponse.json({ success: true, newSlug: result.newSlug });
  } catch (error) {
    if (error instanceof AuthError) return toAuthErrorResponse(error);
    console.error("POST /api/admin/events/[slug]/duplicate failed:", error);
    return NextResponse.json({ error: "Failed to duplicate event" }, { status: 500 });
  }
}
