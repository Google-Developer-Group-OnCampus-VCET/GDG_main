import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { AgendaSession } from "@/types";

export interface SchedulePdfInput {
  eventTitle: string;
  headline?: string;
  datesText: string;
  venueText: string;
  agenda: AgendaSession[];
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

export async function generateSchedulePdfBytes(input: SchedulePdfInput): Promise<Uint8Array> {
  const { eventTitle, headline, datesText, venueText, agenda } = input;

  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const PAGE_WIDTH = 595.28; // A4
  const PAGE_HEIGHT = 841.89;
  const MARGIN_X = 40;
  const MARGIN_BOTTOM = 45;

  let currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let cursorY = PAGE_HEIGHT - 35;

  function drawPageHeader() {
    // Google 4-color stripe across top
    const stripeW = (PAGE_WIDTH - MARGIN_X * 2) / 4;
    const stripeColors = [
      rgb(0.259, 0.522, 0.957), // Blue #4285F4
      rgb(0.918, 0.263, 0.208), // Red #EA4335
      rgb(0.984, 0.737, 0.016), // Yellow #FBBC04
      rgb(0.204, 0.659, 0.325), // Green #34A853
    ];
    stripeColors.forEach((color, idx) => {
      currentPage.drawRectangle({
        x: MARGIN_X + idx * stripeW,
        y: PAGE_HEIGHT - 20,
        width: stripeW,
        height: 5,
        color,
      });
    });

    // Brand header
    currentPage.drawText("GOOGLE DEVELOPER GROUPS ON CAMPUS · VCET", {
      x: MARGIN_X,
      y: PAGE_HEIGHT - 38,
      size: 8.5,
      font: fontBold,
      color: rgb(0.102, 0.451, 0.91),
    });

    const displayTitle = headline || eventTitle;
    currentPage.drawText(toWinAnsiSafe(`${displayTitle} — Workshop Schedule`), {
      x: MARGIN_X,
      y: PAGE_HEIGHT - 58,
      size: 16,
      font: fontBold,
      color: rgb(0.08, 0.1, 0.15),
    });

    currentPage.drawText(toWinAnsiSafe(`${datesText}  |  ${venueText}`), {
      x: MARGIN_X,
      y: PAGE_HEIGHT - 74,
      size: 9.5,
      font: fontRegular,
      color: rgb(0.35, 0.4, 0.48),
    });

    currentPage.drawLine({
      start: { x: MARGIN_X, y: PAGE_HEIGHT - 84 },
      end: { x: PAGE_WIDTH - MARGIN_X, y: PAGE_HEIGHT - 84 },
      thickness: 1,
      color: rgb(0.88, 0.9, 0.93),
    });

    cursorY = PAGE_HEIGHT - 104;
  }

  drawPageHeader();

  // Group sessions by day
  const days = Array.from(new Set(agenda.map((s) => s.day))).sort((a, b) => a - b);

  const dayTitles: Record<number, string> = {
    1: "Day 1: Build the Foundation",
    2: "Day 2: Make It Smart",
    3: "Day 3: Ship It to the Cloud",
    4: "Day 4: Harden and Prove It",
  };

  for (const day of days) {
    const daySessions = agenda.filter((s) => s.day === day);
    const dayHeading = dayTitles[day] || `Day ${day}`;

    // Ensure space for day header + at least 1 session
    if (cursorY < MARGIN_BOTTOM + 80) {
      currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      drawPageHeader();
    }

    // Day banner
    currentPage.drawRectangle({
      x: MARGIN_X,
      y: cursorY - 18,
      width: PAGE_WIDTH - MARGIN_X * 2,
      height: 22,
      color: rgb(0.94, 0.96, 0.99),
      borderColor: rgb(0.82, 0.88, 0.98),
      borderWidth: 1,
    });

    currentPage.drawText(toWinAnsiSafe(dayHeading), {
      x: MARGIN_X + 10,
      y: cursorY - 12,
      size: 11,
      font: fontBold,
      color: rgb(0.1, 0.35, 0.85),
    });

    cursorY -= 32;

    for (const session of daySessions) {
      const titleLines = wrapText(session.title, 55);
      const descLines = session.description ? wrapText(session.description, 68).slice(0, 2) : [];
      const sessionHeight = 22 + titleLines.length * 13 + descLines.length * 11 + 6;

      if (cursorY - sessionHeight < MARGIN_BOTTOM) {
        currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        drawPageHeader();
      }

      // Time pill / text
      currentPage.drawText(toWinAnsiSafe(session.time), {
        x: MARGIN_X + 8,
        y: cursorY,
        size: 8.5,
        font: fontBold,
        color: rgb(0.2, 0.25, 0.35),
      });

      // Track badge
      const trackBadge = session.trackLabel || session.track.toUpperCase();
      currentPage.drawText(toWinAnsiSafe(`[ ${trackBadge} ]`), {
        x: MARGIN_X + 140,
        y: cursorY,
        size: 8,
        font: fontOblique,
        color: rgb(0.35, 0.45, 0.65),
      });

      cursorY -= 13;

      // Title
      for (const tLine of titleLines) {
        currentPage.drawText(tLine, {
          x: MARGIN_X + 8,
          y: cursorY,
          size: 10,
          font: fontBold,
          color: rgb(0.08, 0.1, 0.15),
        });
        cursorY -= 12;
      }

      // Description
      for (const dLine of descLines) {
        currentPage.drawText(dLine, {
          x: MARGIN_X + 8,
          y: cursorY,
          size: 8.5,
          font: fontRegular,
          color: rgb(0.4, 0.45, 0.52),
        });
        cursorY -= 11;
      }

      // Speaker & Location line if present
      const meta = [
        session.speaker ? `Speaker: ${session.speaker}` : null,
        session.location ? `Venue: ${session.location}` : null,
      ]
        .filter(Boolean)
        .join("  |  ");

      if (meta) {
        currentPage.drawText(toWinAnsiSafe(meta), {
          x: MARGIN_X + 8,
          y: cursorY,
          size: 8,
          font: fontOblique,
          color: rgb(0.48, 0.52, 0.58),
        });
        cursorY -= 10;
      }

      // Light separator between sessions
      currentPage.drawLine({
        start: { x: MARGIN_X + 8, y: cursorY - 2 },
        end: { x: PAGE_WIDTH - MARGIN_X - 8, y: cursorY - 2 },
        thickness: 0.5,
        color: rgb(0.92, 0.93, 0.95),
      });

      cursorY -= 8;
    }

    cursorY -= 10;
  }

  // Draw footer on all pages
  const totalPages = pdfDoc.getPageCount();
  for (let i = 0; i < totalPages; i++) {
    const page = pdfDoc.getPage(i);
    page.drawLine({
      start: { x: MARGIN_X, y: 30 },
      end: { x: PAGE_WIDTH - MARGIN_X, y: 30 },
      thickness: 0.75,
      color: rgb(0.88, 0.9, 0.93),
    });

    page.drawText(
      `GDG on Campus VCET · Official Program Schedule  |  Page ${i + 1} of ${totalPages}`,
      {
        x: MARGIN_X,
        y: 18,
        size: 8,
        font: fontRegular,
        color: rgb(0.5, 0.55, 0.62),
      }
    );
  }

  return pdfDoc.save();
}
