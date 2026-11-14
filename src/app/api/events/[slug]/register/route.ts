import { NextResponse } from "next/server";
import { createRegistrationAsync } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import type { RegistrationInput } from "@/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const ip = getClientIp(request);
    const rate = checkRateLimit(`register:${ip}`, {
      limit: 15,
      windowMs: 10 * 60 * 1000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: "RATE_LIMITED",
          message: "Too many registration attempts. Please try again in a few minutes.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSeconds) },
        }
      );
    }

    const { slug } = await params;
    let body: RegistrationInput;
    try {
      body = (await request.json()) as RegistrationInput;
    } catch {
      return NextResponse.json(
        { error: "INVALID_INPUT", message: "Invalid request data. Please try again." },
        { status: 400 }
      );
    }

    const result = await createRegistrationAsync(slug, body);

    if (!result.success) {
      const statusMap = {
        DUPLICATE_EMAIL: 409,
        CAPACITY_FULL: 403,
        REGISTRATION_CLOSED: 403,
        INVALID_INPUT: 400,
        EVENT_NOT_FOUND: 404,
      };

      return NextResponse.json(
        {
          error: result.error,
          message: result.message,
        },
        { status: statusMap[result.error] ?? 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Registration confirmed successfully!",
        registration: result.registration,
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

