import { connection } from "next/server";
import { getCachedSiteSettings } from "@/lib/db/cached";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export async function DynamicSiteHeader() {
  await connection();
  let chapterConfig;
  try {
    const settings = await getCachedSiteSettings();
    chapterConfig = settings.chapter;
  } catch {
    // Fallback to static chapter defaults
  }
  return <SiteHeader chapterConfig={chapterConfig} />;
}

export async function DynamicSiteFooter() {
  await connection();
  let chapterConfig;
  try {
    const settings = await getCachedSiteSettings();
    chapterConfig = settings.chapter;
  } catch {
    // Fallback to static chapter defaults
  }
  return <SiteFooter chapterConfig={chapterConfig} />;
}
