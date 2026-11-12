import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import type { RegistrationRecord } from "@/types";

export interface PassPdfInput {
  eventTitle: string;
  datesText: string;
  venueText: string;
  registration: RegistrationRecord;
}

function toWinAnsiSafe(value: string): string {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2013/g, "-")
    .replace(/\u2014/g, "--")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wrapText(text: string, maxChars: number): string[] {
  const clean = toWinAnsiSafe(text);
  if (clean.length <= maxChars) return [clean];
  const words = clean.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if (!current) {
      current = w;
    } else if (current.length + 1 + w.length <= maxChars) {
      current += ` ${w}`;
    } else {
      lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function generatePassPdfBytes(input: PassPdfInput): Promise<Uint8Array> {
  const { eventTitle, datesText, venueText, registration } = input;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([560, 380]);
  const { width, height } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await pdfDoc.embedFont(StandardFonts.CourierBold);

  // Card background & border
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: rgb(1, 1, 1),
  });
  page.drawRectangle({
    x: 16,
    y: 16,
    width: width - 32,
    height: height - 32,
    borderColor: rgb(0.86, 0.88, 0.91),
    borderWidth: 1,
    color: rgb(0.99, 0.99, 1),
  });

  // Top Google 4-color stripe
  const stripeW = (width - 32) / 4;
  const stripeY = height - 22;
  const stripeColors = [
    rgb(0.259, 0.522, 0.957), // #4285F4
    rgb(0.918, 0.263, 0.208), // #EA4335
    rgb(0.984, 0.737, 0.016), // #FBBC04
    rgb(0.204, 0.659, 0.325), // #34A853
  ];
  stripeColors.forEach((color, idx) => {
    page.drawRectangle({
      x: 16 + idx * stripeW,
      y: stripeY,
      width: stripeW,
      height: 6,
      color,
    });
  });

  // Header
  page.drawText("GDG ON CAMPUS VCET  |  OFFICIAL ENTRY PASS", {
    x: 34,
    y: height - 48,
    size: 9,
    font: fontBold,
    color: rgb(0.102, 0.451, 0.91),
  });

  const titleLines = wrapText(eventTitle, 42).slice(0, 2);
  let cursorY = height - 72;
  for (const line of titleLines) {
    page.drawText(line, {
      x: 34,
      y: cursorY,
      size: 18,
      font: fontBold,
      color: rgb(0.06, 0.09, 0.16),
    });
    cursorY -= 22;
  }

  page.drawText(toWinAnsiSafe(`${datesText}  |  ${venueText}`).slice(0, 74), {
    x: 34,
    y: cursorY - 2,
    size: 9.5,
    font: fontRegular,
    color: rgb(0.35, 0.4, 0.48),
  });

  // Divider
  const dividerY = cursorY - 18;
  page.drawLine({
    start: { x: 34, y: dividerY },
    end: { x: width - 34, y: dividerY },
    thickness: 1,
    color: rgb(0.89, 0.91, 0.94),
  });

  // QR Code on the right
  const qrDataUrl = await QRCode.toDataURL(registration.referenceId, {
    width: 240,
    margin: 1,
    color: { dark: "#1A1B1E", light: "#FFFFFF" },
  });
  const base64 = qrDataUrl.split(",")[1];
  const qrBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const qrImage = await pdfDoc.embedPng(qrBytes);

  const qrSize = 118;
  const qrX = width - 36 - qrSize;
  const qrY = 56;
  page.drawRectangle({
    x: qrX - 8,
    y: qrY - 20,
    width: qrSize + 16,
    height: qrSize + 28,
    borderColor: rgb(0.86, 0.88, 0.91),
    borderWidth: 1,
    color: rgb(1, 1, 1),
  });
  page.drawImage(qrImage, {
    x: qrX,
    y: qrY,
    width: qrSize,
    height: qrSize,
  });
  page.drawText("SCAN AT ENTRANCE", {
    x: qrX + 12,
    y: qrY - 12,
    size: 8,
    font: fontMono,
    color: rgb(0.42, 0.47, 0.54),
  });

  // Attendee details on the left
  let infoY = dividerY - 24;
  const drawField = (label: string, value: string, mono = false) => {
    page.drawText(label.toUpperCase(), {
      x: 34,
      y: infoY,
      size: 7.5,
      font: fontBold,
      color: rgb(0.45, 0.5, 0.58),
    });
    infoY -= 14;
    page.drawText(toWinAnsiSafe(value).slice(0, 48), {
      x: 34,
      y: infoY,
      size: mono ? 12 : 11,
      font: mono ? fontMono : fontBold,
      color: rgb(0.08, 0.11, 0.18),
    });
    infoY -= 20;
  };

  drawField("Pass Reference ID", `#${registration.referenceId}`, true);
  drawField("Attendee", registration.fullName);
  page.drawText(
    toWinAnsiSafe(`${registration.email}  |  ${registration.department} (${registration.yearOfStudy})`).slice(0, 56),
    {
      x: 34,
      y: infoY + 8,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.35, 0.4, 0.48),
    }
  );
  infoY -= 12;
  drawField("College / Institute", registration.college);
  drawField("Assigned Track", registration.track);

  return pdfDoc.save();
}

