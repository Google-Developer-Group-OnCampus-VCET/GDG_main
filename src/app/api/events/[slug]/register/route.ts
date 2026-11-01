import { NextResponse } from "next/server";
import { createRegistration } from "@/lib/db";
import type { RegistrationInput } from "@/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = (await request.json()) as RegistrationInput;

    const result = createRegistration(slug, body);

    if (!result.success) {
      const statusMap = {
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

