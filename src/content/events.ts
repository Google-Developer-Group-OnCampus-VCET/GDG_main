import type { ChapterEvent } from "@/types";

/**
 * Event titles and dates were transcribed from a screenshot the user
 * supplied in-session (not fetched live). Location, format, summary,
 * poster image, and the official event-page URL for each record were then
 * resolved by fetching that event's own page on the official chapter site
 * and are marked with their own sourceUrl/lastVerifiedAt. Where no unique
 * poster could be confirmed (several events share GDG's generic default
 * thumbnail), `image` is left unset rather than presenting that generic
 * graphic as a real poster — see docs/content-needed.md.
 *
 * All six displayed "Free registration" in the screenshot. Since every one
 * of these events is in the past, that is rendered as historical
 * information (`priceNote`), never as an active registration CTA, and no
 * `registrationUrl` is set for any of them.
 */

const TRANSCRIBED_FROM = "User-supplied screenshot of the chapter's events listing";
const TRANSCRIBED_AT = "2026-10-29";
const VERIFIED_AT = "2026-10-29";

export const events: ChapterEvent[] = [
  {
    id: "pathway-to-global-opportunities-studying-abroad-seminar",
    slug: "pathway-to-global-opportunities-studying-abroad-seminar",
    title: "Pathway to Global Opportunities: Seminar on Studying Abroad",
    startsAt: "2026-10-21",
    format: "in-person",
    location: "Vidyavardhini's College of Engineering and Technology, Vasai",
    topics: ["general"],
    summary:
      "A seminar on studying abroad, covering application processes, scholarship opportunities, and firsthand experience from people who have studied overseas.",
    priceNote: "Free event",
    url: "https://gdg.community.dev/events/details/google-gdg-on-campus-vidyavardhinis-college-of-engineering-and-technology-vasai-india-presents-pathway-to-global-opportunities-seminar-on-studying-abroad/",
    sourceUrl:
      "https://gdg.community.dev/events/details/google-gdg-on-campus-vidyavardhinis-college-of-engineering-and-technology-vasai-india-presents-pathway-to-global-opportunities-seminar-on-studying-abroad/",
    lastVerifiedAt: VERIFIED_AT,
    transcribedFrom: TRANSCRIBED_FROM,
    transcribedAt: TRANSCRIBED_AT,
  },
  {
    id: "unlocking-global-opportunities-overseas-study-session",
    slug: "unlocking-global-opportunities-overseas-study-session",
    title: "Unlocking Global Opportunities: A Session on Overseas Study",
    startsAt: "2026-03-10",
    format: "in-person",
    location: "Vidyavardhini's College of Engineering and Technology, Vasai",
    topics: ["general"],
    summary:
      "A session guiding students through studying abroad — choosing a country and university, the application process, and scholarships — with insights from alumni of international universities.",
    image: "/images/events/unlocking-global-opportunities-poster.jpg",
    priceNote: "Free event",
    url: "https://gdg.community.dev/events/details/google-gdg-on-campus-vidyavardhinis-college-of-engineering-and-technology-vasai-india-presents-unlocking-global-opportunities-a-session-on-overseas-study/",
    sourceUrl:
      "https://gdg.community.dev/events/details/google-gdg-on-campus-vidyavardhinis-college-of-engineering-and-technology-vasai-india-presents-unlocking-global-opportunities-a-session-on-overseas-study/",
    lastVerifiedAt: VERIFIED_AT,
    transcribedFrom: TRANSCRIBED_FROM,
    transcribedAt: TRANSCRIBED_AT,
  },
  {
    id: "horizon-1-0",
    slug: "horizon-1-0",
    title: "Horizon 1.0",
    startsAt: "2026-03-07",
    format: "hybrid",
    location: "Vidyavardhini's College of Engineering and Technology, Vasai (online rounds + in-person finale)",
    topics: ["general"],
    summary:
      "A multi-round hybrid hackathon with online qualifying rounds followed by an in-person grand finale at the VCET campus.",
    image: "/images/events/horizon-1-0-poster.png",
    priceNote: "Free event",
    url: "https://gdg.community.dev/events/details/google-gdg-on-campus-vidyavardhinis-college-of-engineering-and-technology-vasai-india-presents-horizon-10/",
    sourceUrl:
      "https://gdg.community.dev/events/details/google-gdg-on-campus-vidyavardhinis-college-of-engineering-and-technology-vasai-india-presents-horizon-10/",
    lastVerifiedAt: VERIFIED_AT,
    transcribedFrom: TRANSCRIBED_FROM,
    transcribedAt: TRANSCRIBED_AT,
  },
  {
    id: "introduction-to-google-cloud-study-jams",
    slug: "introduction-to-google-cloud-study-jams",
    title: "Introduction to Google Cloud Study Jams",
    startsAt: "2025-09-30",
    format: "in-person",
    location: "Vidyavardhini's College of Engineering and Technology, Vasai",
    topics: ["cloud"],
    summary:
      "An introductory session on Google Cloud Study Jams, covering what Study Jams are and the fundamentals of cloud computing.",
    priceNote: "Free event",
    url: "https://gdg.community.dev/events/details/google-gdg-on-campus-vidyavardhinis-college-of-engineering-and-technology-vasai-india-presents-introduction-to-google-cloud-study-jams/",
    sourceUrl:
      "https://gdg.community.dev/events/details/google-gdg-on-campus-vidyavardhinis-college-of-engineering-and-technology-vasai-india-presents-introduction-to-google-cloud-study-jams/",
    lastVerifiedAt: VERIFIED_AT,
    transcribedFrom: TRANSCRIBED_FROM,
    transcribedAt: TRANSCRIBED_AT,
  },
  {
    id: "inauguration-of-gdg-on-campus-at-vcet",
    slug: "inauguration-of-gdg-on-campus-at-vcet",
    title: "Inauguration of GDG on Campus at VCET",
    startsAt: "2025-09-24",
    format: "in-person",
    location: "Vidyavardhini's College of Engineering and Technology, Vasai",
    topics: ["general"],
    summary:
      "The chapter's official launch event, introducing Google Developer Groups, the community's mission, and how students could get involved.",
    priceNote: "Free event",
    url: "https://gdg.community.dev/events/details/google-gdg-on-campus-vidyavardhinis-college-of-engineering-and-technology-vasai-india-presents-inauguration-of-gdg-on-campus-at-vcet/",
    sourceUrl:
      "https://gdg.community.dev/events/details/google-gdg-on-campus-vidyavardhinis-college-of-engineering-and-technology-vasai-india-presents-inauguration-of-gdg-on-campus-at-vcet/",
    lastVerifiedAt: VERIFIED_AT,
    transcribedFrom: TRANSCRIBED_FROM,
    transcribedAt: TRANSCRIBED_AT,
  },
  {
    id: "intro-to-google-cloud-study-jams",
    slug: "intro-to-google-cloud-study-jams",
    title: "Intro to Google Cloud Study Jams",
    startsAt: "2025-09-23",
    format: "in-person",
    location: "Vidyavardhini's College of Engineering and Technology, Vasai",
    topics: ["cloud"],
    summary:
      "An introductory session offering a first look at Google Cloud — cloud computing basics and the timeline for upcoming study jam sessions.",
    priceNote: "Free event",
    url: "https://gdg.community.dev/events/details/google-gdg-on-campus-vidyavardhinis-college-of-engineering-and-technology-vasai-india-presents-intro-to-google-cloud-study-jams/",
    sourceUrl:
      "https://gdg.community.dev/events/details/google-gdg-on-campus-vidyavardhinis-college-of-engineering-and-technology-vasai-india-presents-intro-to-google-cloud-study-jams/",
    lastVerifiedAt: VERIFIED_AT,
    transcribedFrom: TRANSCRIBED_FROM,
    transcribedAt: TRANSCRIBED_AT,
  },
];
