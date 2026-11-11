import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { getEventBySlug, getRegistrationByReference } from "@/lib/db";
import { events as staticEvents } from "@/content/events";
import { checkRateLimit, clientIpFrom } from "@/lib/rate-limit";

/** Public GET keyed on a sequential, guessable reference ID — rate-limited to make
 * enumeration impractical, and deliberately vague on why a lookup failed. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const ip = clientIpFrom(request);
    if (!checkRateLimit(`pass:${ip}`, 20, 10 * 60 * 1000)) {
      return NextResponse.json(
        { error: "RATE_LIMITED", message: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const { slug } = await params;
    const referenceId = new URL(request.url).searchParams.get("referenceId")?.trim();

    if (!referenceId) {
      return NextResponse.json({ error: "INVALID_REQUEST", message: "A reference ID is required." }, { status: 400 });
    }

    const registration = getRegistrationByReference(referenceId.toUpperCase());
    if (!registration || registration.eventSlug !== slug) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Pass not found." }, { status: 404 });
    }

    const eventTitle = staticEvents.find((e) => e.slug === slug)?.title ?? getEventBySlug(slug)?.title ?? slug;

    const qrPngBytes = await QRCode.toBuffer(registration.referenceId, { type: "png", margin: 1, width: 240 });

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([400, 560]);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const regular = await pdf.embedFont(StandardFonts.Helvetica);

    page.drawRectangle({ x: 0, y: 520, width: 400, height: 40, color: rgb(0.102, 0.451, 0.910) });
    page.drawText("GDG on Campus VCET", { x: 20, y: 535, size: 16, font: bold, color: rgb(1, 1, 1) });
    page.drawText("Attendee Pass", { x: 20, y: 492, size: 12, font: regular, color: rgb(0.4, 0.4, 0.4) });

    let y = 460;
    const field = (label: string, value: string, size = 13) => {
      page.drawText(label.toUpperCase(), { x: 20, y, size: 8, font: regular, color: rgb(0.45, 0.45, 0.45) });
      page.drawText(value, { x: 20, y: y - 16, size, font: bold, color: rgb(0.1, 0.1, 0.1), maxWidth: 360 });
      y -= 48;
    };

    field("Event", eventTitle);
    field("Attendee", registration.fullName);
    field("College", registration.college);
    field("Department / Year", `${registration.department} · ${registration.yearOfStudy}`);
    field("Pass Reference", registration.referenceId, 15);

    const qrImage = await pdf.embedPng(qrPngBytes);
    const qrDim = 160;
    page.drawImage(qrImage, { x: (400 - qrDim) / 2, y: 60, width: qrDim, height: qrDim });
    page.drawText("Present this QR code at check-in", {
      x: (400 - regular.widthOfTextAtSize("Present this QR code at check-in", 9)) / 2,
      y: 40,
      size: 9,
      font: regular,
      color: rgb(0.4, 0.4, 0.4),
    });

    const pdfBytes = await pdf.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="gdg-vcet-pass-${registration.referenceId}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Pass PDF generation failed:", err);
    return NextResponse.json({ error: "SERVER_ERROR", message: "Failed to generate pass." }, { status: 500 });
  }
}
