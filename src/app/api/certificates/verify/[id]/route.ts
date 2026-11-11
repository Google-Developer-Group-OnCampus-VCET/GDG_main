import { NextResponse } from "next/server";
import { getCertificateById } from "@/lib/db";
import { checkRateLimit, clientIpFrom } from "@/lib/rate-limit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const ip = clientIpFrom(request);
    if (!checkRateLimit(`verify:${ip}`, 30, 10 * 60 * 1000)) {
      return NextResponse.json(
        { error: "RATE_LIMITED", message: "Too many verification attempts. Please try again later." },
        { status: 429 }
      );
    }

    const { id } = await params;
    const cert = getCertificateById(id);

    if (!cert) {
      return NextResponse.json(
        {
          verified: false,
          error: "CERTIFICATE_NOT_FOUND",
          message: `No certificate found for identifier: ${id}`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      verified: cert.status === "issued",
      certificate: {
        certificateId: cert.certificateId,
        recipientName: cert.recipientName,
        eventTitle: cert.eventTitle,
        eventSlug: cert.eventSlug,
        track: cert.track,
        issueDate: cert.issueDate,
        status: cert.status,
        issuerName: cert.issuerName,
        issuerRole: cert.issuerRole,
      },
    });
  } catch (error) {
    console.error("Certificate verification error:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Failed to verify certificate." },
      { status: 500 }
    );
  }
}

