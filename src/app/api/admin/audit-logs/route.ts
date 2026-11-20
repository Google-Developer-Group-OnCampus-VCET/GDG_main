import { NextResponse } from "next/server";
import { getAdminRoleFromRequest, isAdminRequestAuthenticated } from "@/lib/auth";
import { getAuditLogsAsync } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const isAuthenticated = await isAdminRequestAuthenticated(request);
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Admin authorization required." },
        { status: 401 }
      );
    }

    const role = await getAdminRoleFromRequest(request);
    if (role === "volunteer") {
      return NextResponse.json(
        {
          error: "FORBIDDEN",
          message: "Volunteers only have access to the Check-in Terminal.",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const eventSlug = searchParams.get("eventSlug") || undefined;
    const action = searchParams.get("action") || undefined;
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!, 10)
      : 50;

    const logs = await getAuditLogsAsync({
      eventSlug,
      action,
      limit: Number.isFinite(limit) ? limit : 50,
    });

    return NextResponse.json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (err) {
    console.error("Audit logs API error:", err);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Failed to retrieve audit logs." },
      { status: 500 }
    );
  }
}
