import { NextResponse } from "next/server";
import { bulkIssueCertificates, logAuditEvent } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { eventSlug, onlyCheckedIn } = body;

    if (!eventSlug) {
      return NextResponse.json({ error: "eventSlug is required" }, { status: 400 });
    }

    const result = bulkIssueCertificates(eventSlug, onlyCheckedIn !== false);

    logAuditEvent({
      userId: "usr-admin",
      userEmail: "lead@vcet.edu.in",
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
    return NextResponse.json({ error: "Failed to bulk issue certificates", message: String(error) }, { status: 500 });
  }
}

