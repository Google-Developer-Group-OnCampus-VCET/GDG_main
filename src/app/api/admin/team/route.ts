import { NextResponse } from "next/server";
import { getAdminUsers, createAdminUser, getAuditLogs, logAuditEvent } from "@/lib/db";

export async function GET() {
  try {
    const users = getAdminUsers();
    const logs = getAuditLogs("gdg-vcet", 30);
    return NextResponse.json({ success: true, users, logs });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch team", message: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = createAdminUser(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to create user" }, { status: 400 });
    }

    logAuditEvent({
      userId: "usr-admin",
      userEmail: "lead@vcet.edu.in",
      action: "create_team_member",
      entityType: "user",
      entityId: result.user?.id || "unknown",
      details: `Added new admin user: ${result.user?.name} (${result.user?.role})`,
    });

    return NextResponse.json({ success: true, user: result.user }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to process team request", message: String(error) }, { status: 500 });
  }
}

