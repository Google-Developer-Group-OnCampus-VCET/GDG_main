import { NextResponse } from "next/server";
import { getCertificateById } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
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
    return NextResponse.json(
      { error: "SERVER_ERROR", message: String(error) },
      { status: 500 }
    );
  }
}

