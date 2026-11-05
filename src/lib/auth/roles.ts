import type { AdminRole } from "@/types";

// Role-based permissions matrix (safe for both Client & Server)
export const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  "super-admin": [
    "all",
    "manage_chapters",
    "manage_events",
    "manage_registrations",
    "manage_attendance",
    "manage_speakers",
    "manage_sponsors",
    "manage_agenda",
    "manage_team",
    "manage_announcements",
    "manage_certificates",
    "manage_resources",
    "view_analytics",
    "manage_settings",
  ],
  "chapter-admin": [
    "manage_events",
    "manage_registrations",
    "manage_attendance",
    "manage_speakers",
    "manage_sponsors",
    "manage_agenda",
    "manage_team",
    "manage_announcements",
    "manage_certificates",
    "manage_resources",
    "view_analytics",
    "manage_settings",
  ],
  "core-team": [
    "manage_events",
    "manage_registrations",
    "manage_attendance",
    "manage_speakers",
    "manage_sponsors",
    "manage_agenda",
    "manage_announcements",
    "manage_resources",
    "view_analytics",
  ],
  "event-manager": [
    "manage_events",
    "manage_registrations",
    "manage_attendance",
    "manage_speakers",
    "manage_sponsors",
    "manage_agenda",
    "view_analytics",
  ],
  "registration-manager": [
    "manage_registrations",
    "manage_attendance",
    "view_analytics",
  ],
  "check-in-volunteer": [
    "manage_attendance",
  ],
  "content-manager": [
    "manage_speakers",
    "manage_sponsors",
    "manage_resources",
    "manage_announcements",
  ],
  "analytics-viewer": [
    "view_analytics",
  ],
};

export function hasPermission(role: AdminRole, permission: string): boolean {
  const allowed = ROLE_PERMISSIONS[role] || [];
  if (allowed.includes("all")) return true;
  return allowed.includes(permission);
}

