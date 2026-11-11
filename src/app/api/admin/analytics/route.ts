import { NextResponse } from "next/server";
import { getPlatformAnalytics } from "@/lib/db";
import { AuthError, hasPermission, requirePermission, toAuthErrorResponse } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await requirePermission("view_analytics");
    const { searchParams } = new URL(request.url);
    const requestedChapterId = searchParams.get("chapterId");
    // Never trust a client-supplied chapter id for anyone below "all" permission.
    const chapterId = hasPermission(user.role, "all") && requestedChapterId ? requestedChapterId : user.chapterId;
    const analytics = getPlatformAnalytics(chapterId);
    return NextResponse.json({ success: true, analytics });
  } catch (error) {
    if (error instanceof AuthError) return toAuthErrorResponse(error);
    console.error("GET /api/admin/analytics failed:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
