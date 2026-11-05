import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/auth";
import { createEventAsync, getAllEventsAsync } from "@/lib/db";
import type { EventInput } from "@/types";

export async function GET() {
  try {
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
    const cookieHeader = request.headers.get("cookie") || "";
    const cookies = Object.fromEntries(
      cookieHeader.split(";").map((c) => {
        const [k, ...v] = c.trim().split("=");
        return [k, decodeURIComponent(v.join("="))];
      })
    );
    const token = cookies[ADMIN_COOKIE_NAME];
    const isAuthenticated = await verifyAdminSessionToken(token);

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
      return NextResponse.json(
        { error: isDuplicate ? "DUPLICATE_EVENT" : "CREATE_FAILED", message: result.error },
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

