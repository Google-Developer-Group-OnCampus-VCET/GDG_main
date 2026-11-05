import { NextResponse } from "next/server";
import { getPlatformAnalytics } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const chapterId = searchParams.get("chapterId") || "gdg-vcet";
    const analytics = getPlatformAnalytics(chapterId);
    return NextResponse.json({ success: true, analytics });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch analytics", message: String(error) }, { status: 500 });
  }
}

