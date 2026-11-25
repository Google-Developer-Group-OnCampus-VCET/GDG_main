import { cacheLife, cacheTag } from "next/cache";
import {
  getAllEventsAsync,
  getEventBySlugAsync,
  getPublicEventStatsAsync,
  getSiteSettingsAsync,
  type EventStats,
} from "./index";
import type { ChapterEvent, ChapterSettings } from "@/types";

/**
 * Shared Next.js 16 remote cache layer (`use cache: remote`) for public pages and stats API.
 * Unlike process-local `Map` caches, remote cache entries are shared across serverless instances
 * and invalidated immediately via `revalidateTag(..., { expire: 0 })` whenever registrations or events change.
 */

export async function getCachedAllEvents(): Promise<ChapterEvent[]> {
  "use cache: remote";
  cacheTag("events-list");
  cacheLife({ revalidate: 300, expire: 3600 });

  return getAllEventsAsync();
}

export async function getCachedEventBySlug(slug: string): Promise<ChapterEvent | null> {
  "use cache: remote";
  cacheTag("events-list", `event:${slug}`);
  cacheLife({ revalidate: 300, expire: 3600 });

  return getEventBySlugAsync(slug);
}

export async function getCachedPublicEventStats(slug: string): Promise<EventStats> {
  "use cache: remote";
  cacheTag("event-stats", `event-stats:${slug}`, `event:${slug}`);
  cacheLife({ revalidate: 60, expire: 900 });

  const event = await getCachedEventBySlug(slug);
  return getPublicEventStatsAsync(slug, event);
}

export async function getCachedSiteSettings(): Promise<ChapterSettings> {
  "use cache: remote";
  cacheTag("site-settings");
  cacheLife({ revalidate: 300, expire: 3600 });

  return getSiteSettingsAsync();
}
