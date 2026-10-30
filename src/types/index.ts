export type EventFormat = "in-person" | "online" | "hybrid";

export type EventTopic = "web" | "ai-ml" | "cloud" | "android" | "general";

export interface ChapterEvent {
  id: string;
  slug: string;
  title: string;
  /**
   * Either a date-only string ("YYYY-MM-DD") when only a date is known, or a
   * full ISO 8601 instant with offset when a precise time is verified.
   * Date-only values are parsed as UTC midnight, which stays the same
   * calendar day under Asia/Kolkata (a positive offset), so it never shifts
   * to the previous day the way a negative-offset timezone could.
   */
  startsAt: string;
  /** Same format rules as startsAt. Omit if unknown; chronology falls back to startsAt. */
  endsAt?: string;
  /** Only set when startsAt/endsAt carry a real time component. */
  timezone?: string;
  format?: EventFormat;
  location?: string;
  /** May be empty — do not invent a topic just to populate a filter. */
  topics: EventTopic[];
  summary?: string;
  image?: string;
  /** Official event page, if one exists. */
  url?: string;
  registrationUrl?: string;
  cancelled?: boolean;
  /**
   * Historical note transcribed as-is from a past source (e.g. "Free
   * event"). Informational only — never render this as an active CTA.
   */
  priceNote?: string;
  sourceUrl?: string;
  lastVerifiedAt?: string;
  /** Set when this record originates from a user-supplied screenshot rather than a live fetch. */
  transcribedFrom?: string;
  transcribedAt?: string;
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
  /** Set when this record originates from a user-supplied screenshot rather than a live fetch. */
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
