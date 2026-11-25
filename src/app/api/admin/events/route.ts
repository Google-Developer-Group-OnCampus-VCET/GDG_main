import { NextResponse } from "next/server";
import { getAdminRoleFromRequest, isAdminRequestAuthenticated } from "@/lib/auth";
import { createEventAsync, getAllEventsAsync, logAuditEventAsync } from "@/lib/db";
import { getClientIp } from "@/lib/rate-limit";
import { createStarterWorkshopDetails } from "@/lib/site-defaults";
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
    // 1. Verify master admin session token
    const role = await getAdminRoleFromRequest(request);

    if (!role) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Admin authorization required to create events." },
        { status: 401 }
      );
    }

    if (role !== "admin") {
      return NextResponse.json(
        {
          error: "FORBIDDEN",
          message: "Event creation is restricted. Only master admin can create new events.",
        },
        { status: 403 }
      );
    }

    // 2. Parse & Validate input
    const body = (await request.json()) as EventInput & { enableWorkshop?: boolean };
    if (!body?.title?.trim() || !body?.startsAt?.trim()) {
      return NextResponse.json(
        { error: "INVALID_INPUT", message: "Event title and start date/time are required." },
        { status: 400 }
      );
    }

    const eventPayload: EventInput = {
      ...body,
      image: typeof body.image === "string" && body.image.trim() ? body.image.trim() : undefined,
      url: typeof body.url === "string" && body.url.trim() ? body.url.trim() : undefined,
      cancelled: Boolean(body.cancelled),
      requireApproval: Boolean(body.requireApproval),
      workshop:
        body.workshop ||
        (body.enableWorkshop
          ? createStarterWorkshopDetails({
              title: body.title.trim(),
              summary: typeof body.summary === "string" ? body.summary.trim() : undefined,
              venueText: typeof body.location === "string" ? body.location.trim() : undefined,
              capacity: typeof body.capacity === "number" ? body.capacity : 120,
              isOpen: body.isRegistrationOpen ?? true,
            })
          : undefined),
    };

    // 3. Create event via dual-engine (Firestore primary, SQLite fallback)
    const result = await createEventAsync(eventPayload);

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

    await logAuditEventAsync({
      action: "EVENT_CREATE",
      actorRole: role || "admin",
      actorIdentifier: "Master Admin",
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent") || undefined,
      eventSlug: result.event?.slug || body.slug,
      details: {
        title: body.title,
        capacity: body.capacity,
        startsAt: body.startsAt,
      },
    });

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

