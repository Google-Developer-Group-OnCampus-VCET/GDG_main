import { NextResponse } from "next/server";
import { getEventStats } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const stats = getEventStats(slug);
    return NextResponse.json(stats);
  } catch (err) {
    console.error("Stats API error:", err);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Failed to fetch event stats." },
      { status: 500 }
    );
  }
}

