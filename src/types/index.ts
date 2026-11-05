export type EventFormat = "in-person" | "online" | "hybrid";

export type EventTopic = "web" | "ai-ml" | "cloud" | "android" | "general";

export interface AgendaSession {
  id: string;
  title: string;
  description?: string;
  time: string; // e.g. "10:00 AM – 11:30 AM"
  track: "all" | "tech" | "lab" | "keynote" | "break";
  trackLabel?: string;
  speaker?: string;
  speakerRole?: string;
  location?: string;
  tags?: string[];
  day: 1 | 2;
}

export interface WorkshopSpeaker {
  id: string;
  name: string;
  role: string;
  organization: string;
  badge?: string;
  category: "keynote" | "hands-on" | "mentors" | "leads";
  topicTitle?: string;
  topicDescription?: string;
  tags: string[];
  photo?: string;
  socials?: {
    github?: string;
    linkedin?: string;
    twitter?: string;
  };
}

export interface WorkshopSponsor {
  id: string;
  name: string;
  tier: "title" | "gold" | "platform" | "ecosystem";
  logo?: string;
  description?: string;
  url?: string;
  perks?: string[];
  badge?: string;
  contribution?: string;
}

export interface WorkshopPillar {
  title: string;
  description: string;
  icon: string;
  tags: string[];
  color: "blue" | "green" | "red" | "yellow";
}

export interface WorkshopLearningObjective {
  title: string;
  description: string;
  color: "blue" | "green" | "yellow" | "red";
}

export interface WorkshopPersona {
  role: string;
  description: string;
  gain: string;
  badge: string;
}

export interface WorkshopPrepRequirement {
  category: string;
  icon: string;
  items: string[];
}

export interface WorkshopFaq {
  question: string;
  answer: string;
  category?: string;
}

export interface WorkshopTrack {
  id: string;
  name: string;
  description: string;
  badge: string;
  icon: string;
}

export interface WorkshopRegistrationConfig {
  isOpen: boolean;
  deadline?: string;
  price: number; // 0 for free
  currency: string;
  tracks: WorkshopTrack[];
  departments: string[];
  yearsOfStudy: string[];
  experienceLevels: string[];
}

export interface WorkshopDetails {
  headline: string;
  subheading: string;
  datesText: string;
  venueText: string;
  seatsText: string;
  badgeText: string;
  capacity: number;
  initialRegisteredCount: number;
  heroGraphic?: {
    terminalLabel: string;
    versionBadge: string;
  };
  pillars: WorkshopPillar[];
  learningObjectives: WorkshopLearningObjective[];
  personas: WorkshopPersona[];
  prepRequirements: WorkshopPrepRequirement[];
  faq: WorkshopFaq[];
  agenda: AgendaSession[];
  speakers: WorkshopSpeaker[];
  sponsors: WorkshopSponsor[];
  registrationConfig: WorkshopRegistrationConfig;
}

export interface ChapterEvent {
  id: string;
  slug: string;
  title: string;
  /**
   * Either a date-only string ("YYYY-MM-DD") when only a date is known, or a
   * full ISO 8601 instant with offset when a precise time is verified.
   */
  startsAt: string;
  endsAt?: string;
  timezone?: string;
  format?: EventFormat;
  location?: string;
  topics: EventTopic[];
  summary?: string;
  image?: string;
  url?: string;
  registrationUrl?: string;
  cancelled?: boolean;
  priceNote?: string;
  sourceUrl?: string;
  lastVerifiedAt?: string;
  transcribedFrom?: string;
  transcribedAt?: string;
  /** When present, enables the rich multi-page workshop experience */
  workshop?: WorkshopDetails;
}

export interface RegistrationRecord {
  id: string;
  eventSlug: string;
  referenceId: string; // e.g. "GDG-VCET-2025-0842"
  fullName: string;
  email: string;
  phone: string;
  college: string;
  department: string;
  yearOfStudy: string;
  track: string;
  experienceLevel: string;
  portfolioUrl?: string;
  notes?: string;
  status: "confirmed" | "waitlisted" | "cancelled";
  checkedIn: boolean;
  checkedInAt?: string;
  createdAt: string;
}

export interface RegistrationInput {
  fullName: string;
  email: string;
  phone: string;
  college: string;
  department?: string;
  yearOfStudy?: string;
  track: string;
  experienceLevel?: string;
  portfolioUrl?: string;
  notes?: string;
  agreedToCoc: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  academicYear?: string;
  photo?: string;
  profileUrl?: string;
  sourceUrl?: string;
  lastVerifiedAt?: string;
  transcribedFrom?: string;
  transcribedAt?: string;
}

export interface NavLink {
  label: string;
  href: string;
}

export interface SocialLink {
  label: string;
  href: string;
}

export interface ChapterConfig {
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  institution: string;
  joinUrl: string;
  chapterPageUrl: string;
  contactEmail?: string;
  socials: SocialLink[];
  nav: NavLink[];
  sourceUrl: string;
  lastVerifiedAt: string;
}
