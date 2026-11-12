import type { ChapterEvent, WorkshopDetails } from "@/types";
import type { EventStats } from "@/lib/db";
import { formatEventDateRange } from "@/lib/events";

const DEFAULT_DEPARTMENTS = [
  "Computer Engg",
  "Information Tech",
  "AI & Data Science",
  "Electronics & Telecomm",
  "Civil / Mechanical",
  "Other Engineering",
];

const DEFAULT_YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

export function resolveWorkshopDetails(
  event: ChapterEvent,
  stats?: Pick<EventStats, "capacity" | "isOpen" | "totalRegistered">
): WorkshopDetails {
  if (event.workshop) {
    return event.workshop;
  }

  const capacity = stats?.capacity ?? 150;
  const isOpen = stats?.isOpen ?? !event.cancelled;
  const datesText = formatEventDateRange(event);
  const venueText =
    event.location || "Vidyavardhini's College of Engineering and Technology, Vasai";

  return {
    headline: event.title,
    subheading:
      event.summary ||
      "Official chapter session by GDG on Campus VCET. Reserve your seat to receive an instant QR entry pass.",
    datesText,
    venueText,
    seatsText: `Limited to ${capacity} seats`,
    badgeText: "GDG on Campus VCET",
    capacity,
    initialRegisteredCount: stats?.totalRegistered ?? 0,
    pillars: [],
    learningObjectives: [],
    personas: [],
    prepRequirements: [],
    faq: [],
    agenda: [],
    speakers: [],
    sponsors: [],
    registrationConfig: {
      isOpen,
      price: 0,
      currency: "INR",
      tracks: [
        {
          id: "general",
          name: "General Admission",
          description: `Full access pass for ${event.title}.`,
          badge: "MAIN TRACK",
          icon: "confirmation_number",
        },
      ],
      departments: DEFAULT_DEPARTMENTS,
      yearsOfStudy: DEFAULT_YEARS,
      experienceLevels: ["Beginner", "Intermediate", "Advanced"],
    },
  };
}

