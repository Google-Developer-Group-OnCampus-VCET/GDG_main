import { NextResponse } from "next/server";
import { getCertificates, issueCertificate, logAuditEvent } from "@/lib/db";
import { AuthError, requirePermission, toAuthErrorResponse } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await requirePermission("manage_certificates");
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const eventSlug = searchParams.get("eventSlug") || undefined;

    const certificates = getCertificates({ chapterId: user.chapterId, search, eventSlug });
    return NextResponse.json({ success: true, certificates });
  } catch (error) {
    if (error instanceof AuthError) return toAuthErrorResponse(error);
    console.error("GET /api/admin/certificates failed:", error);
    return NextResponse.json({ error: "Failed to fetch certificates" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("manage_certificates");
    const body = await request.json();
    const certificate = issueCertificate({ ...body, chapterId: user.chapterId });

    logAuditEvent({
      chapterId: user.chapterId,
      userId: user.id,
      userEmail: user.email,
      action: "issue_certificate",
      entityType: "certificate",
      entityId: certificate.certificateId,
      details: `Issued certificate #${certificate.certificateId} to ${certificate.recipientName} for ${certificate.eventTitle}`,
    });

    return NextResponse.json({ success: true, certificate }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return toAuthErrorResponse(error);
    console.error("POST /api/admin/certificates failed:", error);
    return NextResponse.json({ error: "Failed to issue certificate" }, { status: 500 });
  }
}
