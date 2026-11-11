import { NextResponse } from "next/server";
import { getSponsorsAdmin, createSponsorAdmin, updateSponsorAdmin, deleteSponsorAdmin, logAuditEvent } from "@/lib/db";
import { AuthError, requirePermission, toAuthErrorResponse } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requirePermission("manage_sponsors");
    const sponsors = getSponsorsAdmin(user.chapterId);
    return NextResponse.json({ success: true, sponsors });
  } catch (error) {
    if (error instanceof AuthError) return toAuthErrorResponse(error);
    console.error("GET /api/admin/sponsors failed:", error);
    return NextResponse.json({ error: "Failed to fetch sponsors" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("manage_sponsors");
    const body = await request.json();
    const sponsor = createSponsorAdmin(body, user.chapterId);

    logAuditEvent({
      chapterId: user.chapterId,
      userId: user.id,
      userEmail: user.email,
      action: "create_sponsor",
      entityType: "sponsor",
      entityId: sponsor.id,
      details: `Created sponsor: ${sponsor.name} (${sponsor.tier})`,
    });

    return NextResponse.json({ success: true, sponsor }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return toAuthErrorResponse(error);
    console.error("POST /api/admin/sponsors failed:", error);
    return NextResponse.json({ error: "Failed to create sponsor" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requirePermission("manage_sponsors");
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Sponsor ID is required" }, { status: 400 });
    }
    const body = await request.json();
    const success = updateSponsorAdmin(id, body);
    if (!success) {
      return NextResponse.json({ error: "Sponsor not found or could not be updated" }, { status: 400 });
    }

    logAuditEvent({
      chapterId: user.chapterId,
      userId: user.id,
      userEmail: user.email,
      action: "update_sponsor",
      entityType: "sponsor",
      entityId: id,
      details: `Updated sponsor: ${id}`,
    });

    return NextResponse.json({ success: true, message: `Sponsor ${id} updated successfully` });
  } catch (error) {
    if (error instanceof AuthError) return toAuthErrorResponse(error);
    console.error("PATCH /api/admin/sponsors failed:", error);
    return NextResponse.json({ error: "Failed to update sponsor" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requirePermission("manage_sponsors");
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Sponsor ID is required" }, { status: 400 });
    }

    const success = deleteSponsorAdmin(id);
    if (!success) {
      return NextResponse.json({ error: "Sponsor not found or could not be deleted" }, { status: 400 });
    }

    logAuditEvent({
      chapterId: user.chapterId,
      userId: user.id,
      userEmail: user.email,
      action: "delete_sponsor",
      entityType: "sponsor",
      entityId: id,
      details: `Deleted sponsor: ${id}`,
    });

    return NextResponse.json({ success: true, message: `Sponsor ${id} deleted successfully` });
  } catch (error) {
    if (error instanceof AuthError) return toAuthErrorResponse(error);
    console.error("DELETE /api/admin/sponsors failed:", error);
    return NextResponse.json({ error: "Failed to delete sponsor" }, { status: 500 });
  }
}
