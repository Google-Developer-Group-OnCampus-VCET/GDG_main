import { NextResponse } from "next/server";
import { updateCertificateStatus, logAuditEvent } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
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
      userId: "usr-admin",
      userEmail: "lead@vcet.edu.in",
      action: "update_certificate_status",
      entityType: "certificate",
      entityId: id,
      details: `Updated certificate ${id} status to: ${status}`,
    });

    return NextResponse.json({ success: true, message: `Certificate ${id} status updated to ${status}` });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update certificate", message: String(error) }, { status: 500 });
  }
}

