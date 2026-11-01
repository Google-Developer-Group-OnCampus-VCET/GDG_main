import Link from "next/link";
import { GdgLogo } from "@/components/gdg-logo";

interface AdminHeaderProps {
  currentTab?: "overview" | "registrations" | "check-in" | "analytics";
  eventSlug?: string;
}

export function AdminHeader({ currentTab = "overview", eventSlug = "devcraft-2025" }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white shadow-xs">
      <div className="mx-auto flex h-16 max-w-(--container-max) items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-2">
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
              href="/admin"
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                currentTab === "overview"
                  ? "bg-primary text-on-primary font-bold shadow-xs"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              Dashboard
            </Link>
            <Link
              href={`/admin/events/${eventSlug}/registrations`}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                currentTab === "registrations"
                  ? "bg-primary text-on-primary font-bold shadow-xs"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              Registrations
            </Link>
            <Link
              href={`/admin/events/${eventSlug}/check-in`}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                currentTab === "check-in"
                  ? "bg-primary text-on-primary font-bold shadow-xs"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              Check-in Terminal
            </Link>
            <Link
              href={`/admin/events/${eventSlug}/analytics`}
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

        <div className="flex items-center gap-3">
          <Link
            href={`/events/${eventSlug}`}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover"
          >
            <span>View Public Event</span>
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
          </Link>
          <Link
            href="/"
            className="px-3 py-1 rounded-full border border-border text-xs font-medium text-foreground-muted hover:bg-surface-container"
          >
            Exit Admin
          </Link>
        </div>
      </div>
    </header>
  );
}

