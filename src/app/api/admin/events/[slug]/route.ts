import { NextResponse } from "next/server";
import { getAdminRoleFromRequest, isAdminRequestAuthenticated } from "@/lib/auth";
import {
  deleteEventAsync,
  getEventBySlugAsync,
  getPublicEventStatsAsync,
  logAuditEventAsync,
  updateEventAsync,
} from "@/lib/db";
import { getClientIp } from "@/lib/rate-limit";
import type { EventFormat, EventTopic, EventUpdateInput, WorkshopDetails } from "@/types";

const VALID_FORMATS = new Set<EventFormat>(["in-person", "online", "hybrid"]);
const VALID_TOPICS = new Set<EventTopic>(["web", "ai-ml", "cloud", "android", "general"]);

function validateUpdatePayload(
  raw: unknown
): { valid: true; data: EventUpdateInput } | { valid: false; message: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { valid: false, message: "Request body must be a JSON object." };
  }

  const body = raw as Record<string, unknown>;
  const data: EventUpdateInput = {};

  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      return { valid: false, message: "Event title must be a non-empty string." };
    }
    data.title = body.title;
  }

  if (body.startsAt !== undefined) {
    if (typeof body.startsAt !== "string" || !body.startsAt.trim()) {
      return { valid: false, message: "Start date/time must be a non-empty string." };
    }
    data.startsAt = body.startsAt;
  }

  if (body.endsAt !== undefined) {
    if (typeof body.endsAt !== "string") {
      return { valid: false, message: "End date/time must be a string." };
    }
    data.endsAt = body.endsAt;
  }

  if (body.timezone !== undefined) {
    if (typeof body.timezone !== "string") {
      return { valid: false, message: "Timezone must be a string." };
    }
    data.timezone = body.timezone;
  }

  if (body.format !== undefined) {
    if (typeof body.format !== "string" || !VALID_FORMATS.has(body.format as EventFormat)) {
      return { valid: false, message: "Format must be in-person, online, or hybrid." };
    }
    data.format = body.format as EventFormat;
  }

  if (body.location !== undefined) {
    if (typeof body.location !== "string") {
      return { valid: false, message: "Location must be a string." };
    }
    data.location = body.location;
  }

  if (body.topics !== undefined) {
    if (
      !Array.isArray(body.topics) ||
      body.topics.some((t) => typeof t !== "string" || !VALID_TOPICS.has(t as EventTopic))
    ) {
      return { valid: false, message: "Topics must be an array of valid event topics." };
    }
    data.topics = body.topics as EventTopic[];
  }

  if (body.summary !== undefined) {
    if (typeof body.summary !== "string") {
      return { valid: false, message: "Summary must be a string." };
    }
    data.summary = body.summary;
  }

  if (body.image !== undefined) {
    if (typeof body.image !== "string") {
      return { valid: false, message: "Cover image path/URL must be a string." };
    }
    data.image = body.image.trim();
  }

  if (body.url !== undefined) {
    if (typeof body.url !== "string") {
      return { valid: false, message: "External URL must be a string." };
    }
    data.url = body.url.trim();
  }

  if (body.cancelled !== undefined) {
    if (typeof body.cancelled !== "boolean") {
      return { valid: false, message: "cancelled must be a boolean." };
    }
    data.cancelled = body.cancelled;
  }

  if (body.requireApproval !== undefined) {
    if (typeof body.requireApproval !== "boolean") {
      return { valid: false, message: "requireApproval must be a boolean." };
    }
    data.requireApproval = body.requireApproval;
  }

  if (body.workshop !== undefined) {
    if (!body.workshop || typeof body.workshop !== "object" || Array.isArray(body.workshop)) {
      return { valid: false, message: "workshop payload must be an object." };
    }
    data.workshop = body.workshop as WorkshopDetails;
  }

  if (body.priceNote !== undefined) {
    if (typeof body.priceNote !== "string") {
      return { valid: false, message: "priceNote must be a string." };
    }
    data.priceNote = body.priceNote;
  }

  if (body.capacity !== undefined) {
    if (typeof body.capacity !== "number" || !Number.isFinite(body.capacity) || body.capacity < 1) {
      return { valid: false, message: "Capacity must be a number greater than or equal to 1." };
    }
    data.capacity = body.capacity;
  }

  if (body.isRegistrationOpen !== undefined) {
    if (typeof body.isRegistrationOpen !== "boolean") {
      return { valid: false, message: "isRegistrationOpen must be a boolean." };
    }
    data.isRegistrationOpen = body.isRegistrationOpen;
  }

  if (Object.keys(data).length === 0) {
    return { valid: false, message: "At least one updatable field must be provided." };
  }

  return { valid: true, data };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    if (!(await isAdminRequestAuthenticated(request))) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Admin authorization required." },
        { status: 401 }
      );
    }

    const { slug } = await params;
    const event = await getEventBySlugAsync(slug);
    if (!event) {
      return NextResponse.json(
        { error: "EVENT_NOT_FOUND", message: "Event not found." },
        { status: 404 }
      );
    }

    const stats = await getPublicEventStatsAsync(slug, event);
    return NextResponse.json({ success: true, event, stats });
  } catch (err) {
    console.error("Admin GET event error:", err);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Failed to fetch event details." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const role = await getAdminRoleFromRequest(request);
    if (!role) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Admin authorization required to update events." },
        { status: 401 }
      );
    }

    if (role !== "admin") {
      return NextResponse.json(
        {
          error: "FORBIDDEN",
          message: "Event details are ineditable with this login. Only master admin can modify event settings.",
        },
        { status: 403 }
      );
    }

    const { slug } = await params;

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { error: "INVALID_INPUT", message: "Invalid JSON request payload." },
        { status: 400 }
      );
    }

    const validation = validateUpdatePayload(rawBody);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "INVALID_INPUT", message: validation.message },
        { status: 400 }
      );
    }

    const result = await updateEventAsync(slug, validation.data);
    if (!result.success) {
      if (result.error === "EVENT_NOT_FOUND") {
        return NextResponse.json(
          { error: "EVENT_NOT_FOUND", message: "Event not found." },
          { status: 404 }
        );
      }
      console.error("Admin PATCH event failed:", result.error);
      return NextResponse.json(
        { error: "INVALID_INPUT", message: "Failed to update event. Please check inputs." },
        { status: 400 }
      );
    }

    const stats = await getPublicEventStatsAsync(slug, result.event);

    await logAuditEventAsync({
      action: "EVENT_UPDATE",
      actorRole: role || "admin",
      actorIdentifier: "Master Admin",
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent") || undefined,
      eventSlug: slug,
      details: {
        updatedFields: Object.keys(validation.data),
        changes: validation.data,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Event updated successfully.",
      event: result.event,
      stats,
    });
  } catch (err) {
    console.error("Admin PATCH event error:", err);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Failed to update event." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const role = await getAdminRoleFromRequest(request);
    if (!role) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Admin authorization required." },
        { status: 401 }
      );
    }

    if (role !== "admin") {
      return NextResponse.json(
        {
          error: "FORBIDDEN",
          message: "Event deletion is restricted. Only master admin can delete events.",
        },
        { status: 403 }
      );
    }

    const { slug } = await params;
    const result = await deleteEventAsync(slug);

    if (!result.success) {
      if (result.error === "EVENT_NOT_FOUND") {
        return NextResponse.json(
          { error: "EVENT_NOT_FOUND", message: "Event not found." },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "DELETE_FAILED", message: result.error || "Failed to delete event." },
        { status: 400 }
      );
    }

    await logAuditEventAsync({
      action: "EVENT_DELETED",
      actorRole: role,
      actorIdentifier: "Master Admin",
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent") || undefined,
      eventSlug: slug,
      details: { slug },
    });

    return NextResponse.json({
      success: true,
      message: `Event "${slug}" deleted successfully.`,
    });
  } catch (err) {
    console.error("Admin DELETE event error:", err);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Failed to delete event." },
      { status: 500 }
    );
  }
}
