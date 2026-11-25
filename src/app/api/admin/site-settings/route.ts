import { NextResponse } from "next/server";
import { getAdminRoleFromRequest, isAdminRequestAuthenticated } from "@/lib/auth";
import { getSiteSettingsAsync, logAuditEventAsync, updateSiteSettingsAsync } from "@/lib/db";
import { getClientIp } from "@/lib/rate-limit";
import type { ChapterSettings } from "@/types";

export async function GET(request: Request) {
  try {
    const isAuthenticated = await isAdminRequestAuthenticated(request);
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Admin authorization required." },
        { status: 401 }
      );
    }

    const settings = await getSiteSettingsAsync();
    return NextResponse.json({ success: true, settings });
  } catch (err) {
    console.error("Admin GET site-settings error:", err);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Failed to load site settings." },
      { status: 500 }
    );
  }
}

function validateSiteSettingsPayload(raw: unknown): raw is ChapterSettings {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const s = raw as Record<string, unknown>;
  if (!s.chapter || typeof s.chapter !== "object" || Array.isArray(s.chapter)) return false;
  const ch = s.chapter as Record<string, unknown>;
  if (typeof ch.name !== "string" || !ch.name.trim()) return false;
  if (!Array.isArray(s.team)) return false;
  if (!Array.isArray(s.learningAreas)) return false;
  if (!Array.isArray(s.homeFaq)) return false;
  if (!Array.isArray(s.joinFaq)) return false;
  if (!Array.isArray(s.aboutCards)) return false;
  return true;
}

export async function PATCH(request: Request) {
  try {
    const role = await getAdminRoleFromRequest(request);
    if (!role) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Admin authorization required." },
        { status: 401 }
      );
    }

    if (role !== "admin") {
      return NextResponse.json(
        {
          error: "FORBIDDEN",
          message: "Site settings modifications are restricted to Master Admin.",
        },
        { status: 403 }
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "Invalid JSON payload." },
        { status: 400 }
      );
    }

    const candidate =
      rawBody && typeof rawBody === "object" && "settings" in rawBody
        ? (rawBody as { settings: unknown }).settings
        : rawBody;

    if (!validateSiteSettingsPayload(candidate)) {
      return NextResponse.json(
        {
          error: "INVALID_INPUT",
          message: "Site settings must include chapter, team, learningAreas, homeFaq, joinFaq, and aboutCards.",
        },
        { status: 400 }
      );
    }

    const updated = await updateSiteSettingsAsync(candidate);

    await logAuditEventAsync({
      action: "SITE_SETTINGS_UPDATED",
      actorRole: role,
      actorIdentifier: "Master Admin",
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent") || undefined,
      details: {
        chapterName: updated.chapter.name,
        teamCount: updated.team.length,
        learningAreasCount: updated.learningAreas.length,
        homeFaqCount: updated.homeFaq.length,
        joinFaqCount: updated.joinFaq.length,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Chapter settings saved and public caches revalidated.",
      settings: updated,
    });
  } catch (err) {
    console.error("Admin PATCH site-settings error:", err);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Failed to save site settings." },
      { status: 500 }
    );
  }
}
