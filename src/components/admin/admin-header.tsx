"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GdgLogo } from "@/components/gdg-logo";

interface AdminHeaderProps {
  currentTab?: "overview" | "registrations" | "check-in" | "analytics" | "email" | "audit";
  eventSlug?: string;
}

export function AdminHeader({ currentTab = "overview", eventSlug = "dev-to-cloud" }: AdminHeaderProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [sessionRole, setSessionRole] = useState<"admin" | "core" | "volunteer" | null>(null);

  useEffect(() => {
    fetch("/api/admin/session")
      .then((res) => res.json())
      .then((data) => {
        if (data?.authenticated && data?.role) {
          setSessionRole(data.role);
        }
      })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/admin/console/login");
      router.refresh();
    } catch {
      router.push("/admin/console/login");
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white shadow-xs">
      <div className="mx-auto flex h-16 max-w-(--container-max) items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link href="/admin/console" className="flex items-center gap-2">
            <GdgLogo className="h-5 sm:h-6" />
            <span className="text-sm font-bold text-foreground">
              Chapter Admin
            </span>
            {sessionRole === "admin" ? (
              <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold inline-flex items-center gap-1">
                <span>👑</span> Master Admin
              </span>
            ) : sessionRole === "core" ? (
              <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold inline-flex items-center gap-1">
                <span>🛡️</span> Core Member (Read-Only)
              </span>
            ) : sessionRole === "volunteer" ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold inline-flex items-center gap-1">
                <span>📷</span> Volunteer Desk
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant text-[11px] font-bold">
                VCET Workspace
              </span>
            )}
          </Link>
        </div>

        {eventSlug ? (
          <nav className="hidden md:flex items-center gap-1 bg-surface-container-low px-2 py-1 rounded-full border border-border/50">
            <Link
              href="/admin/console"
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                currentTab === "overview"
                  ? "bg-primary text-on-primary font-bold shadow-xs"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              Dashboard
            </Link>
            <Link
              href={`/admin/console/events/${eventSlug}/registrations`}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                currentTab === "registrations"
                  ? "bg-primary text-on-primary font-bold shadow-xs"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              Registrations
            </Link>
            <Link
              href={`/admin/console/events/${eventSlug}/check-in`}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                currentTab === "check-in"
                  ? "bg-primary text-on-primary font-bold shadow-xs"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              Check-in Terminal
            </Link>
            <Link
              href={`/admin/console/events/${eventSlug}/analytics`}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                currentTab === "analytics"
                  ? "bg-primary text-on-primary font-bold shadow-xs"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              Analytics
            </Link>
            <Link
              href={`/admin/console/events/${eventSlug}/email`}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                currentTab === "email"
                  ? "bg-primary text-on-primary font-bold shadow-xs"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              Email &amp; Broadcast
            </Link>
            {sessionRole !== "volunteer" ? (
              <Link
                href={`/admin/console/events/${eventSlug}/audit`}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  currentTab === "audit"
                    ? "bg-primary text-on-primary font-bold shadow-xs"
                    : "text-foreground-muted hover:text-foreground"
                }`}
              >
                Audit Trail
              </Link>
            ) : null}
          </nav>
        ) : null}

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href={`/events/${eventSlug}`}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover"
          >
            <span>Public View</span>
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </Link>
          <Link
            href="/"
            className="hidden sm:inline-flex px-3 py-1 rounded-full border border-border text-xs font-medium text-foreground-muted hover:bg-surface-container"
          >
            Exit to Chapter
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-status-danger/10 text-status-danger hover:bg-status-danger/20 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
            title="Sign out of Admin Workspace"
          >
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>{loggingOut ? "Signing out..." : "Sign Out"}</span>
          </button>
        </div>
      </div>

      {eventSlug ? (
        <div className="md:hidden border-t border-border/60 bg-surface-container-low/60 px-3 py-2 overflow-x-auto no-scrollbar flex items-center gap-1.5">
          <Link
            href="/admin/console"
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              currentTab === "overview"
                ? "bg-primary text-on-primary font-bold shadow-xs"
                : "text-foreground-muted hover:text-foreground bg-white border border-border/50"
            }`}
          >
            Dashboard
          </Link>
          <Link
            href={`/admin/console/events/${eventSlug}/registrations`}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              currentTab === "registrations"
                ? "bg-primary text-on-primary font-bold shadow-xs"
                : "text-foreground-muted hover:text-foreground bg-white border border-border/50"
            }`}
          >
            Registrations
          </Link>
          <Link
            href={`/admin/console/events/${eventSlug}/check-in`}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              currentTab === "check-in"
                ? "bg-primary text-on-primary font-bold shadow-xs"
                : "text-foreground-muted hover:text-foreground bg-white border border-border/50"
            }`}
          >
            Check-in
          </Link>
          <Link
            href={`/admin/console/events/${eventSlug}/analytics`}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              currentTab === "analytics"
                ? "bg-primary text-on-primary font-bold shadow-xs"
                : "text-foreground-muted hover:text-foreground bg-white border border-border/50"
            }`}
          >
            Analytics
          </Link>
          <Link
            href={`/admin/console/events/${eventSlug}/email`}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              currentTab === "email"
                ? "bg-primary text-on-primary font-bold shadow-xs"
                : "text-foreground-muted hover:text-foreground bg-white border border-border/50"
            }`}
          >
            Email
          </Link>
          {sessionRole !== "volunteer" ? (
            <Link
              href={`/admin/console/events/${eventSlug}/audit`}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                currentTab === "audit"
                  ? "bg-primary text-on-primary font-bold shadow-xs"
                  : "text-foreground-muted hover:text-foreground bg-white border border-border/50"
              }`}
            >
              Audit Trail
            </Link>
          ) : null}
          <Link
            href={`/events/${eventSlug}`}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium text-primary hover:text-primary-hover bg-white border border-border/50"
          >
            Public View ↗
          </Link>
        </div>
      ) : null}
    </header>
  );
}
