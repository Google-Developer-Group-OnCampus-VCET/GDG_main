export type EventFormat = "in-person" | "online" | "hybrid";

export type EventTopic = "web" | "ai-ml" | "cloud" | "android" | "general";

export type EventCategory =
  | "workshop"
  | "meetup"
  | "conference"
  | "hackathon"
  | "bootcamp"
  | "webinar"
  | "community-session"
  | "competition"
  | "other";

export type EventVisibility = "public" | "unlisted" | "draft" | "archived";

export type RegistrationStatus =
  | "submitted"
  | "pending"
  | "confirmed"
  | "waitlisted"
  | "rejected"
  | "cancelled";

export type PaymentStatus =
  | "not-required"
  | "pending"
  | "submitted"
  | "verified"
  | "rejected"
  | "refunded";

export type AdminRole =
  | "super-admin"
  | "chapter-admin"
  | "core-team"
  | "event-manager"
  | "registration-manager"
  | "check-in-volunteer"
  | "content-manager"
  | "analytics-viewer";

export interface AdminUser {
  id: string;
  chapterId: string;
  name: string;
  email: string;
  role: AdminRole;
  avatar?: string;
  status: "active" | "invited" | "suspended";
  createdAt: string;
}

export interface ChapterTenant {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  institution: string;
  logoUrl?: string;
  primaryColor?: string;
  contactEmail?: string;
  createdAt: string;
}

export interface AgendaSession {
  id: string;
  eventSlug?: string;
  title: string;
  description?: string;
  time: string; // e.g. "10:00 AM – 11:30 AM"
  track: "all" | "tech" | "lab" | "keynote" | "break" | "track-a" | "track-b" | string;
  trackLabel?: string;
  speaker?: string;
  speakerRole?: string;
  location?: string;
  tags?: string[];
  day: number;
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
  expertise?: string[];
  photo?: string;
  socials?: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    website?: string;
  };
  github?: string;
  linkedin?: string;
  website?: string;
  email?: string;
  bio?: string;
}

export interface WorkshopSponsor {
  id: string;
  name: string;
  tier: "title" | "gold" | "silver" | "platform" | "ecosystem" | "media";
  logo?: string;
  description?: string;
  url?: string;
  website?: string;
  perks?: string[];
  badge?: string;
  contribution?: string;
  contactEmail?: string;
  status?: "approved" | "pending";
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
  chapterId?: string;
  category?: EventCategory;
  visibility?: EventVisibility;
  startsAt: string;
  endsAt?: string;
  timezone?: string;
  format?: EventFormat;
  location?: string;
  capacity?: number;
  isRegistrationOpen?: boolean;
  registrationDeadline?: string;
  topics: EventTopic[];
  summary?: string;
  image?: string;
  url?: string;
  registrationUrl?: string;
  cancelled?: boolean;
  priceNote?: string;
  price?: number;
  currency?: string;
  sourceUrl?: string;
  lastVerifiedAt?: string;
  transcribedFrom?: string;
  transcribedAt?: string;
  tags?: string[];
  workshop?: WorkshopDetails;
  createdAt?: string;
}

export interface RegistrationRecord {
  id: string;
  chapterId?: string;
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
  internalNotes?: string;
  status: RegistrationStatus;
  paymentStatus?: PaymentStatus;
  paymentReference?: string;
  checkedIn: boolean;
  checkedInAt?: string;
  checkInOperator?: string;
  createdAt: string;
}

export interface RegistrationInput {
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
  agreedToCoc: boolean;
}

export interface Announcement {
  id: string;
  chapterId: string;
  eventSlug?: string;
  title: string;
  message: string;
  targetAudience: "all" | "registered" | "checked-in" | "waitlisted";
  channel: "email" | "web" | "banner";
  status: "draft" | "scheduled" | "published";
  sentCount: number;
  scheduledAt?: string;
  createdAt: string;
}

export interface CertificateRecord {
  id: string;
  chapterId: string;
  certificateId: string; // e.g. "CERT-VCET-2025-0842"
  eventSlug: string;
  eventTitle: string;
  recipientName: string;
  recipientEmail: string;
  referenceId: string;
  issueDate: string;
  status: "issued" | "revoked";
  track?: string;
  issuerName?: string;
  issuerRole?: string;
  createdAt: string;
}

export interface CommunityResource {
  id: string;
  chapterId: string;
  eventSlug?: string;
  title: string;
  description: string;
  category: "slides" | "code" | "video" | "notes" | "document" | "docs" | "tools";
  url: string;
  fileSize?: string;
  tags: string[];
  isPublic: boolean;
  author?: string;
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  chapterId: string;
  userId: string;
  userEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: string;
  createdAt: string;
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
