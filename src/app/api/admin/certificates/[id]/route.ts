import { NextResponse } from "next/server";
import { updateCertificateStatus, logAuditEvent } from "@/lib/db";
import { AuthError, requirePermission, toAuthErrorResponse } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const user = await requirePermission("manage_certificates");
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || (status !== "issued" && status !== "revoked")) {
      return NextResponse.json({ error: "Valid status ('issued' | 'revoked') is required" }, { status: 400 });
    }

    const success = updateCertificateStatus(id, status);
    if (!success) {
      return NextResponse.json({ error: "Certificate not found or status could not be changed" }, { status: 400 });
    }

    logAuditEvent({
      chapterId: user.chapterId,
      userId: user.id,
      userEmail: user.email,
      action: "update_certificate_status",
      entityType: "certificate",
      entityId: id,
      details: `Updated certificate ${id} status to: ${status}`,
    });

    return NextResponse.json({ success: true, message: `Certificate ${id} status updated to ${status}` });
  } catch (error) {
    if (error instanceof AuthError) return toAuthErrorResponse(error);
    console.error("PATCH /api/admin/certificates/[id] failed:", error);
    return NextResponse.json({ error: "Failed to update certificate" }, { status: 500 });
  }
}
