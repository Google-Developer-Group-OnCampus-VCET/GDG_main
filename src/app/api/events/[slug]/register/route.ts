import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { createRegistration, getEventBySlug } from "@/lib/db";
import { events as staticEvents } from "@/content/events";
import { eventSlugExists } from "@/lib/events";
import { checkRateLimit, clientIpFrom } from "@/lib/rate-limit";
import type { RegistrationInput } from "@/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const ip = clientIpFrom(request);
    if (!checkRateLimit(`register:${ip}`, 10, 10 * 60 * 1000)) {
      return NextResponse.json(
        { error: "RATE_LIMITED", message: "Too many registration attempts. Please try again later." },
        { status: 429 }
      );
    }

    const { slug } = await params;

    if (!eventSlugExists(slug, staticEvents, getEventBySlug(slug))) {
      return NextResponse.json(
        { error: "EVENT_NOT_FOUND", message: "This event could not be found." },
        { status: 404 }
      );
    }

    const body = (await request.json()) as RegistrationInput;

    const result = createRegistration(slug, body);

    if (!result.success) {
      const statusMap = {
        EVENT_NOT_FOUND: 404,
        DUPLICATE_EMAIL: 409,
        CAPACITY_FULL: 403,
        REGISTRATION_CLOSED: 403,
        INVALID_INPUT: 400,
      };

      return NextResponse.json(
        {
          error: result.error,
          message: result.message,
        },
        { status: statusMap[result.error] ?? 400 }
      );
    }

    // Generated server-side from the real reference ID so the client never needs its own
    // QR-encoding dependency — the confirmation UI just renders this data URL as-is.
    const qrDataUrl = await QRCode.toDataURL(result.registration.referenceId, { margin: 1, width: 240 });

    return NextResponse.json(
      {
        success: true,
        message: "Registration confirmed successfully!",
        registration: result.registration,
        qrDataUrl,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Registration API error:", err);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Failed to process registration. Please try again." },
      { status: 500 }
    );
  }
}

