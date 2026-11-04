"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GdgLogo } from "@/components/gdg-logo";

interface AdminHeaderProps {
  currentTab?: "overview" | "registrations" | "check-in" | "analytics";
  eventSlug?: string;
}

export function AdminHeader({ currentTab = "overview", eventSlug = "devcraft-2025" }: AdminHeaderProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

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
            <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant text-[11px] font-bold">
              VCET Workspace
            </span>
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
    </header>
  );
}
