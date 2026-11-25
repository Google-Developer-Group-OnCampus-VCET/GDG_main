import { NextResponse } from "next/server";
import { getCachedPublicEventStats } from "@/lib/db/cached";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const stats = await getCachedPublicEventStats(slug);
    return NextResponse.json(stats, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    console.error("Stats API error:", err);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Failed to fetch event stats." },
      { status: 500 }
    );
  }
}

