import type { TeamMember } from "@/types";

/**
 * Names and roles were transcribed from a screenshot the user supplied
 * in-session. Avatars and profile links were then resolved by fetching the
 * official chapter page live and are recorded with their own
 * sourceUrl/lastVerifiedAt. Shreya Agnihotri's profile link 404s on the
 * official site, so it is intentionally omitted rather than guessed — see
 * docs/content-needed.md. No academic year, department, email, or social
 * link is included for anyone; none was supplied or verified.
 */

const CHAPTER_PAGE_URL =
  "https://gdg.community.dev/gdg-on-campus-vidyavardhinis-college-of-engineering-and-technology-vasai-india/";
const TRANSCRIBED_FROM = "User-supplied screenshot of the chapter's organizer list";
const TRANSCRIBED_AT = "2026-10-29";
const VERIFIED_AT = "2026-10-29";

export const team: TeamMember[] = [
  {
    id: "jatush-hingu",
    name: "Jatush Hingu",
    role: "GDGoC Organizer",
    photo: "/images/team/jatush-hingu.jpg",
    profileUrl: "https://gdg.community.dev/u/m8fsjk/",
    sourceUrl: CHAPTER_PAGE_URL,
    lastVerifiedAt: VERIFIED_AT,
    transcribedFrom: TRANSCRIBED_FROM,
    transcribedAt: TRANSCRIBED_AT,
  },
  {
    id: "dhruv-jain",
    name: "Dhruv Jain",
    role: "GDGoC Organizer",
    photo: "/images/team/dhruv-jain.jpg",
    profileUrl: "https://gdg.community.dev/u/mm4ubw/",
    sourceUrl: CHAPTER_PAGE_URL,
    lastVerifiedAt: VERIFIED_AT,
    transcribedFrom: TRANSCRIBED_FROM,
    transcribedAt: TRANSCRIBED_AT,
  },
  {
    id: "sahil-dhavale",
    name: "Sahil Dhavale",
    role: "GDGoC Organizer",
    // Verified original avatar on the official platform — not a photo of
    // his face, but his actual chosen avatar there. Preserved as-is rather
    // than replaced with a generated likeness.
    photo: "/images/team/sahil-dhavale.jpg",
    profileUrl: "https://gdg.community.dev/u/m4fwks/",
    sourceUrl: CHAPTER_PAGE_URL,
    lastVerifiedAt: VERIFIED_AT,
    transcribedFrom: TRANSCRIBED_FROM,
    transcribedAt: TRANSCRIBED_AT,
  },
  {
    id: "shreya-agnihotri",
    name: "Shreya Agnihotri",
    role: "GDGoC Organizer",
    // The official platform's own auto-generated initials avatar — kept as
    // her verified original rather than a locally-drawn initials fallback.
    photo: "/images/team/shreya-agnihotri.jpg",
    // Profile URL from the chapter page 404s on the official site as of
    // lastVerifiedAt; omitted rather than guessed. See content-needed.md.
    sourceUrl: CHAPTER_PAGE_URL,
    lastVerifiedAt: VERIFIED_AT,
    transcribedFrom: TRANSCRIBED_FROM,
    transcribedAt: TRANSCRIBED_AT,
  },
  {
    id: "ritesh-gharat",
    name: "Ritesh Gharat",
    role: "Secretary",
    photo: "/images/team/ritesh-gharat.jpg",
    profileUrl: "https://gdg.community.dev/u/mrafat/",
    sourceUrl: CHAPTER_PAGE_URL,
    lastVerifiedAt: VERIFIED_AT,
    transcribedFrom: TRANSCRIBED_FROM,
    transcribedAt: TRANSCRIBED_AT,
  },
  {
    id: "suraj-phirke",
    name: "Suraj Phirke",
    role: "Web Lead",
    photo: "/images/team/suraj-phirke.jpg",
    profileUrl: "https://gdg.community.dev/u/mmb5u2/",
    sourceUrl: CHAPTER_PAGE_URL,
    lastVerifiedAt: VERIFIED_AT,
    transcribedFrom: TRANSCRIBED_FROM,
    transcribedAt: TRANSCRIBED_AT,
  },
];
