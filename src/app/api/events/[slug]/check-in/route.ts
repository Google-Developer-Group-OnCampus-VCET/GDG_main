import { NextResponse } from "next/server";
import { checkInAttendeeAsync } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = (await request.json()) as { referenceId?: string };

    if (!body?.referenceId?.trim()) {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "Pass reference ID is required." },
        { status: 400 }
      );
    }

    const result = await checkInAttendeeAsync(slug, body.referenceId.trim());

    if (!result.success) {
      const isAlreadyCheckedIn = result.message.includes("ALREADY checked in");
      return NextResponse.json(
        {
          error: isAlreadyCheckedIn ? "ALREADY_CHECKED_IN" : "CHECK_IN_FAILED",
          message: result.message,
          registration: result.registration,
        },
        { status: isAlreadyCheckedIn ? 409 : 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      registration: result.registration,
    });
  } catch (err) {
    console.error("Check-in API error:", err);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Failed to process check-in." },
      { status: 500 }
    );
  }
}

