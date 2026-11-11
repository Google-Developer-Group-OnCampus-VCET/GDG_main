import { NextResponse } from "next/server";
import { bulkIssueCertificates, logAuditEvent } from "@/lib/db";
import { AuthError, requirePermission, toAuthErrorResponse } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await requirePermission("manage_certificates");
    const body = await request.json();
    const { eventSlug, onlyCheckedIn } = body;

    if (!eventSlug) {
      return NextResponse.json({ error: "eventSlug is required" }, { status: 400 });
    }

    const result = bulkIssueCertificates(eventSlug, onlyCheckedIn !== false);

    logAuditEvent({
      chapterId: user.chapterId,
      userId: user.id,
      userEmail: user.email,
      action: "bulk_issue_certificates",
      entityType: "certificate",
      entityId: eventSlug,
      details: `Bulk-issued ${result.count} certificates for event: ${result.eventTitle} (Checked-in only: ${onlyCheckedIn !== false})`,
    });

    return NextResponse.json({
      success: true,
      count: result.count,
      eventTitle: result.eventTitle,
      message: `Successfully issued ${result.count} certificates for ${result.eventTitle}`,
    });
  } catch (error) {
    if (error instanceof AuthError) return toAuthErrorResponse(error);
    console.error("POST /api/admin/certificates/bulk-issue failed:", error);
    return NextResponse.json({ error: "Failed to bulk issue certificates" }, { status: 500 });
  }
}
