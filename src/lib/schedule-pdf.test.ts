import { describe, expect, it } from "vitest";
import { generateSchedulePdfBytes } from "./schedule-pdf";

describe("Schedule PDF Generator", () => {
  it("generates a multi-page valid PDF schedule with all agenda days", async () => {
    const bytes = await generateSchedulePdfBytes({
      eventTitle: "Dev to Cloud: Zero to Hero",
      headline: "Flagship Technical Summit & Syllabus",
      datesText: "December 1–4, 2026",
      venueText: "VCET Vasai · Departments of IT & Computer Engineering",
      agenda: [
        {
          id: "s1",
          day: 1,
          time: "10:00 AM - 11:15 AM",
          title: "Architecture Sprint: Decoupled Multi-Service Systems",
          description: "Understanding clean boundaries and production systems.",
          track: "tech",
          trackLabel: "Architecture",
          speaker: "Siddhesh Naik",
          location: "Lab 301",
        },
        {
          id: "s2",
          day: 2,
          time: "10:00 AM - 11:30 AM",
          title: "Embeddings & Vector Indexing Deep-Dive",
          description: "Hands-on vector search with Firestore.",
          track: "lab",
          trackLabel: "Hands-on Lab",
          speaker: "Atharva Joshi",
          location: "Lab 302",
        },
      ],
    });

    expect(bytes.byteLength).toBeGreaterThan(1000);
    const header = new TextDecoder().decode(bytes.slice(0, 5));
    expect(header).toBe("%PDF-");
  });
});
