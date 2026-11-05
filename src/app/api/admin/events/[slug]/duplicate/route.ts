import { NextResponse } from "next/server";
import { duplicateEventAdmin, logAuditEvent } from "@/lib/db";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const result = duplicateEventAdmin(slug);

    if (!result.success) {
      return NextResponse.json({ error: "Failed to duplicate event" }, { status: 400 });
    }

    logAuditEvent({
      userId: "usr-admin",
      userEmail: "lead@vcet.edu.in",
      action: "duplicate_event",
      entityType: "event",
      entityId: result.newSlug || slug,
      details: `Duplicated event from: ${slug} -> ${result.newSlug}`,
    });

    return NextResponse.json({ success: true, newSlug: result.newSlug });
  } catch (error) {
    return NextResponse.json({ error: "Failed to duplicate event", message: String(error) }, { status: 500 });
  }
}

