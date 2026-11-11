import { NextResponse } from "next/server";
import { createContactSubmission } from "@/lib/db";
import { checkRateLimit, clientIpFrom } from "@/lib/rate-limit";

const VALID_TYPES = ["general", "speaker", "sponsor", "partnership"] as const;

export async function POST(request: Request) {
  try {
    const ip = clientIpFrom(request);
    if (!checkRateLimit(`contact:${ip}`, 5, 10 * 60 * 1000)) {
      return NextResponse.json(
        { error: "RATE_LIMITED", message: "Too many submissions. Please try again later." },
        { status: 429 }
      );
    }

    const body = (await request.json()) as {
      type?: string;
      fullName?: string;
      email?: string;
      organization?: string;
      subject?: string;
      message?: string;
    };

    const type = VALID_TYPES.includes(body.type as (typeof VALID_TYPES)[number])
      ? (body.type as (typeof VALID_TYPES)[number])
      : "general";

    const result = createContactSubmission({
      type,
      fullName: body.fullName ?? "",
      email: body.email ?? "",
      organization: body.organization,
      subject: body.subject,
      message: body.message ?? "",
    });

    if (!result.success) {
      return NextResponse.json({ error: "INVALID_INPUT", message: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Your message has been received." }, { status: 201 });
  } catch (err) {
    console.error("Contact submission API error:", err);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Failed to submit your message. Please try again." },
      { status: 500 }
    );
  }
}
