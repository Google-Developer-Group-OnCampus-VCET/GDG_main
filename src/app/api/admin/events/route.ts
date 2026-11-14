import { NextResponse } from "next/server";
import { isAdminRequestAuthenticated } from "@/lib/auth";
import { createEventAsync, getAllEventsAsync } from "@/lib/db";
import type { EventInput } from "@/types";

export async function GET(request: Request) {
  try {
    const isAuthenticated = await isAdminRequestAuthenticated(request);
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Admin authorization required." },
        { status: 401 }
      );
    }

    const events = await getAllEventsAsync();
    return NextResponse.json({ success: true, events });
  } catch (err) {
    console.error("Admin GET events error:", err);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Failed to fetch events." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // 1. Verify admin session token
    const isAuthenticated = await isAdminRequestAuthenticated(request);

    if (!isAuthenticated) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Admin authorization required to create events." },
        { status: 401 }
      );
    }

    // 2. Parse & Validate input
    const body = (await request.json()) as EventInput;
    if (!body?.title?.trim() || !body?.startsAt?.trim()) {
      return NextResponse.json(
        { error: "INVALID_INPUT", message: "Event title and start date/time are required." },
        { status: 400 }
      );
    }

    // 3. Create event via dual-engine (Firestore primary, SQLite fallback)
    const result = await createEventAsync(body);

    if (!result.success) {
      const isDuplicate = result.error?.toLowerCase().includes("already exists");
      console.error("Admin create event failed:", result.error);
      return NextResponse.json(
        {
          error: isDuplicate ? "DUPLICATE_EVENT" : "CREATE_FAILED",
          message: isDuplicate ? "An event with this name already exists." : "Failed to create event. Please check inputs.",
        },
        { status: isDuplicate ? 409 : 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Event created successfully in Firestore collection.",
        event: result.event,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Admin POST event error:", err);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Failed to create event." },
      { status: 500 }
    );
  }
}

