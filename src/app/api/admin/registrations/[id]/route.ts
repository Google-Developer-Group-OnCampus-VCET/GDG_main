import { NextResponse } from "next/server";
import { updateRegistrationStatus, updatePaymentStatus, logAuditEvent } from "@/lib/db";
import { AuthError, requirePermission, toAuthErrorResponse } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const user = await requirePermission("manage_registrations");
    const { id } = await params;
    const body = await request.json();
    const { status, internalNotes, paymentStatus, paymentReference } = body;

    let updated = false;

    if (status) {
      updated = updateRegistrationStatus(id, status, internalNotes) || updated;
      logAuditEvent({
        chapterId: user.chapterId,
        userId: user.id,
        userEmail: user.email,
        action: "update_registration_status",
        entityType: "registration",
        entityId: id,
        details: `Updated status to: ${status}${internalNotes ? ` (Notes: ${internalNotes})` : ""}`,
      });
    }

    if (paymentStatus) {
      updated = updatePaymentStatus(id, paymentStatus, paymentReference) || updated;
      logAuditEvent({
        chapterId: user.chapterId,
        userId: user.id,
        userEmail: user.email,
        action: "update_payment_status",
        entityType: "registration",
        entityId: id,
        details: `Updated payment status to: ${paymentStatus}`,
      });
    }

    if (!updated) {
      return NextResponse.json({ error: "No changes applied or registration not found" }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: `Registration ${id} updated successfully` });
  } catch (error) {
    if (error instanceof AuthError) return toAuthErrorResponse(error);
    console.error("PATCH /api/admin/registrations/[id] failed:", error);
    return NextResponse.json({ error: "Failed to update registration" }, { status: 500 });
  }
}
