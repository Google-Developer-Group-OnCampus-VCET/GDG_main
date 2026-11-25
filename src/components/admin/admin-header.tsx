"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { GdgLogo } from "@/components/gdg-logo";

interface AdminHeaderProps {
  currentTab?: "overview" | "registrations" | "check-in" | "analytics" | "email" | "audit" | "settings";
  eventSlug?: string;
  initialRole?: "admin" | "core" | "volunteer" | null;
}

export function AdminHeader({
  currentTab = "overview",
  eventSlug = "dev-to-cloud",
  initialRole = null,
}: AdminHeaderProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [sessionRole, setSessionRole] = useState<"admin" | "core" | "volunteer" | null>(
    initialRole
  );

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

  // Close hamburger dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    setMenuOpen(false);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/admin/console/login");
      router.refresh();
    } catch {
      router.push("/admin/console/login");
    }
  }

  const isVolunteer = sessionRole === "volunteer";
  const isMaster = sessionRole === "admin";
  const homeHref = isVolunteer
    ? `/admin/console/events/${eventSlug}/check-in`
    : "/admin/console";

  // Centralised nav link definitions — avoids duplication between desktop/mobile
  const navLinks = [
    { tab: "overview",       label: "Dashboard",      href: "/admin/console",                                          show: !isVolunteer },
    { tab: "registrations",  label: "Registrations",  href: `/admin/console/events/${eventSlug}/registrations`,        show: true },
    { tab: "check-in",       label: "Check-in",       href: `/admin/console/events/${eventSlug}/check-in`,             show: true },
    { tab: "analytics",      label: "Analytics",      href: `/admin/console/events/${eventSlug}/analytics`,            show: true },
    { tab: "email",          label: "Email",          href: `/admin/console/events/${eventSlug}/email`,                show: isMaster },
    { tab: "audit",          label: "Audit",          href: `/admin/console/events/${eventSlug}/audit`,                show: isMaster },
    { tab: "settings",       label: "CMS",            href: "/admin/console/settings",                                 show: isMaster },
  ] as const;

  const pillActive   = "bg-primary text-on-primary font-bold shadow-xs";
  const pillInactive = "text-foreground-muted hover:text-foreground";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white shadow-xs">
      {/* ── Top bar ── */}
      <div className="mx-auto flex h-14 max-w-(--container-max) items-center gap-2 px-3 sm:px-6">

        {/* Logo + role badge */}
        <Link href={homeHref} prefetch={false} className="flex items-center gap-2 shrink-0 min-w-0">
          <GdgLogo className="h-5 shrink-0" />
          <span className="hidden sm:block text-sm font-bold text-foreground whitespace-nowrap">
            Chapter Admin
          </span>
          {sessionRole === "admin" && (
            <span className="hidden lg:inline-flex px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold items-center gap-1 whitespace-nowrap">
              👑 Master Admin
            </span>
          )}
          {sessionRole === "core" && (
            <span className="hidden lg:inline-flex px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold items-center gap-1 whitespace-nowrap">
              🛡️ Core
            </span>
          )}
          {sessionRole === "volunteer" && (
            <span className="hidden lg:inline-flex px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold items-center gap-1 whitespace-nowrap">
              📷 Volunteer
            </span>
          )}
        </Link>

        {/* Desktop nav pill row — md+ — scrollable so it never wraps */}
        {eventSlug && (
          <nav className="hidden md:flex flex-1 items-center gap-0.5 overflow-x-auto no-scrollbar bg-surface-container-low px-1.5 py-1 rounded-full border border-border/50 mx-2 max-w-max">
            {navLinks
              .filter((l) => l.show)
              .map(({ tab, label, href }) => (
                <Link
                  key={tab}
                  href={href}
                  prefetch={false}
                  className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                    currentTab === tab ? pillActive : pillInactive
                  }`}
                >
                  {label}
                </Link>
              ))}
          </nav>
        )}

        {/* Spacer pushes right actions to the edge */}
        <div className="flex-1 md:hidden" />

        {/* Right actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Public View */}
          {eventSlug && (
            <Link
              href={`/events/${eventSlug}`}
              prefetch={false}
              title="Public View"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold text-primary hover:bg-primary/5 transition-all"
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              <span className="hidden lg:block whitespace-nowrap">Public View</span>
            </Link>
          )}

          {/* Exit to Chapter — desktop only */}
          <Link
            href="/"
            className="hidden md:inline-flex px-3 py-1.5 rounded-full border border-border text-xs font-medium text-foreground-muted hover:bg-surface-container transition-all whitespace-nowrap"
          >
            ← Chapter
          </Link>

          {/* Sign Out — desktop */}
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-status-danger/10 text-status-danger hover:bg-status-danger/20 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {loggingOut ? "Signing out…" : "Sign Out"}
          </button>

          {/* Hamburger menu — mobile only */}
          <div className="relative md:hidden" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="p-2 rounded-full hover:bg-surface-container transition-all"
              aria-label="Open menu"
            >
              {menuOpen ? (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-border rounded-2xl shadow-lg py-1.5 z-50">
                <Link
                  href="/"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-foreground-muted hover:bg-surface-container"
                >
                  ← Exit to Chapter
                </Link>
                <hr className="my-1 border-border/50" />
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-status-danger hover:bg-status-danger/5 disabled:opacity-50"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  {loggingOut ? "Signing out…" : "Sign Out"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile nav scroll strip (below md) ── */}
      {eventSlug && (
        <div className="md:hidden border-t border-border/60 bg-surface-container-low/60 px-3 py-2 overflow-x-auto no-scrollbar flex items-center gap-1.5">
          {navLinks
            .filter((l) => l.show)
            .map(({ tab, label, href }) => (
              <Link
                key={tab}
                href={href}
                prefetch={false}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                  currentTab === tab
                    ? pillActive
                    : "text-foreground-muted bg-white border border-border/50"
                }`}
              >
                {label}
              </Link>
            ))}
          <Link
            href="/"
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium text-foreground-muted bg-white border border-border/50 whitespace-nowrap"
          >
            ← Chapter
          </Link>
        </div>
      )}
    </header>
  );
}
