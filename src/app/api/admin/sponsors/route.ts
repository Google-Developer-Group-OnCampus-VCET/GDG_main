import { NextResponse } from "next/server";
import { getSponsorsAdmin, createSponsorAdmin, deleteSponsorAdmin, logAuditEvent } from "@/lib/db";

export async function GET() {
  try {
    const sponsors = getSponsorsAdmin();
    return NextResponse.json({ success: true, sponsors });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch sponsors", message: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sponsor = createSponsorAdmin(body);

    logAuditEvent({
      userId: "usr-admin",
      userEmail: "lead@vcet.edu.in",
      action: "create_sponsor",
      entityType: "sponsor",
      entityId: sponsor.id,
      details: `Created sponsor: ${sponsor.name} (${sponsor.tier})`,
    });

    return NextResponse.json({ success: true, sponsor }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create sponsor", message: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
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
      userId: "usr-admin",
      userEmail: "lead@vcet.edu.in",
      action: "delete_sponsor",
      entityType: "sponsor",
      entityId: id,
      details: `Deleted sponsor: ${id}`,
    });

    return NextResponse.json({ success: true, message: `Sponsor ${id} deleted successfully` });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete sponsor", message: String(error) }, { status: 500 });
  }
}

