import { NextResponse } from "next/server";
import { getCertificates, issueCertificate, logAuditEvent } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const eventSlug = searchParams.get("eventSlug") || undefined;

    const certificates = getCertificates({ search, eventSlug });
    return NextResponse.json({ success: true, certificates });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch certificates", message: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const certificate = issueCertificate(body);

    logAuditEvent({
      userId: "usr-admin",
      userEmail: "lead@vcet.edu.in",
      action: "issue_certificate",
      entityType: "certificate",
      entityId: certificate.certificateId,
      details: `Issued certificate #${certificate.certificateId} to ${certificate.recipientName} for ${certificate.eventTitle}`,
    });

    return NextResponse.json({ success: true, certificate }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to issue certificate", message: String(error) }, { status: 500 });
  }
}

