import { chapter } from "@/content/chapter";
import { learningAreas } from "@/content/learning-areas";
import { team } from "@/content/team";
import type { ChapterSettings, WorkshopDetails } from "@/types";

export const DEFAULT_CHAPTER_SETTINGS: ChapterSettings = {
  chapter,
  team,
  learningAreas,
  homeFaq: [
    {
      question: "Who can join GDG on Campus VCET?",
      answer:
        "Any student at Vidyavardhini's College of Engineering and Technology interested in learning and building with technology is welcome, regardless of branch or year.",
    },
    {
      question: "Do I need prior experience?",
      answer:
        "No. Sessions are designed to be approachable for beginners, with more advanced tracks for members who want to go deeper.",
    },
    {
      question: "How do I join?",
      answer:
        "Use the official chapter page to join the community — see the Join the community button above or visit the Join page for details.",
    },
    {
      question: "How will I know about upcoming events?",
      answer:
        "Announcements are shared through the community's official channels and listed on the Events page as they're confirmed.",
    },
    {
      question: "Are events always free?",
      answer:
        "Most community sessions are free, but cost depends on the specific event — check each event's details page before registering.",
    },
  ],
  joinFaq: [
    {
      question: "Is joining free?",
      answer:
        "Yes, joining the community itself is free. Individual events may have their own cost, noted on each event's page.",
    },
    {
      question: "What happens after I join?",
      answer:
        "You'll be connected to the chapter's official community channels, where announcements about upcoming sessions are shared.",
    },
    {
      question: "I'm new to programming — is this still for me?",
      answer: "Yes. The community welcomes members at every experience level.",
    },
  ],
  joinDescription:
    "Membership is managed through the official GDG community platform. Use the button below to join — it takes you to the verified chapter page.",
  aboutDescription: chapter.description,
  aboutCards: [
    {
      title: "What we do",
      description:
        "We run workshops, study sessions, and hands-on project work focused on web, AI/ML, cloud, and Android development — organized by and for VCET students.",
    },
    {
      title: "Who can take part",
      description: `Any student at ${chapter.institution} is welcome, regardless of branch, year, or prior experience.`,
    },
    {
      title: "Relationship to GDG",
      description:
        "GDG on Campus VCET is a community-run student chapter, independent of Google, that participates in the broader Google Developer Groups on Campus program.",
    },
    {
      title: "At VCET",
      description: `The chapter operates at ${chapter.institution}, bringing a developer community directly into campus life.`,
    },
  ],
};

export function createStarterWorkshopDetails(options: {
  title: string;
  summary?: string;
  venueText?: string;
  capacity?: number;
  isOpen?: boolean;
}): WorkshopDetails {
  const cap = options.capacity ?? 120;
  return {
    headline: options.title,
    subheading:
      options.summary ||
      "Hands-on technical workshop organized by GDG on Campus VCET. Build real projects and earn your completion pass.",
    datesText: "Schedule TBD",
    venueText:
      options.venueText || "Vidyavardhini's College of Engineering and Technology, Vasai",
    seatsText: `Limited to ${cap} Seats`,
    badgeText: "GDG on Campus VCET",
    capacity: cap,
    initialRegisteredCount: 0,
    pillars: [],
    learningObjectives: [],
    personas: [],
    prepRequirements: [],
    faq: [],
    agenda: [],
    speakers: [],
    sponsors: [],
    speakersTbd: true,
    showSponsors: false,
    registrationConfig: {
      isOpen: options.isOpen ?? true,
      price: 0,
      currency: "INR",
      tracks: [
        {
          id: "general",
          name: "General Admission",
          description: `Full access pass for ${options.title}.`,
          badge: "MAIN TRACK",
          icon: "confirmation_number",
        },
      ],
      departments: [
        "Computer Engg",
        "Information Tech",
        "AI & Data Science",
        "Electronics & Telecomm",
        "Civil / Mechanical",
        "Other Engineering",
      ],
      yearsOfStudy: ["1st Year", "2nd Year", "3rd Year", "4th Year"],
      experienceLevels: ["Beginner", "Intermediate", "Advanced"],
    },
  };
}
