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
  const capacity =
    stats?.capacity ??
    event.capacity ??
    event.workshop?.capacity ??
    150;
  const seatsText = `Limited to ${capacity} Seats`;
  const isOpen = stats?.isOpen ?? !event.cancelled;
  const datesText = formatEventDateRange(event);
  const venueText =
    event.location || "Vidyavardhini's College of Engineering and Technology, Vasai";

  if (event.workshop) {
    return {
      ...event.workshop,
      capacity,
      seatsText,
      initialRegisteredCount:
        stats?.totalRegistered ??
        event.registeredCount ??
        event.workshop.initialRegisteredCount,
      venueText: event.location || event.workshop.venueText || venueText,
      datesText: event.startsAt ? formatEventDateRange(event) : event.workshop.datesText || datesText,
      registrationConfig: {
        ...event.workshop.registrationConfig,
        isOpen:
          stats?.isOpen ??
          (typeof event.isRegistrationOpen === "boolean"
            ? event.isRegistrationOpen
            : event.workshop.registrationConfig.isOpen),
      },
    };
  }

  return {
    headline: event.title,
    subheading:
      event.summary ||
      "Official chapter session by GDG on Campus VCET. Reserve your seat to receive an instant QR entry pass.",
    datesText,
    venueText,
    seatsText,
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

