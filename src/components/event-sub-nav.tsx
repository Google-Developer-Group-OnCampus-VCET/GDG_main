"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ChapterEvent } from "@/types";

interface EventSubNavProps {
  event: ChapterEvent;
}

function EventSubNavDesktopTabs({
  basePath,
  showSponsors = false,
}: {
  basePath: string;
  showSponsors?: boolean;
}) {
  const pathname = usePathname();

  const navItems = [
    { label: "Overview", href: basePath },
    { label: "Registration", href: `${basePath}/register` },
    { label: "Agenda", href: `${basePath}/agenda` },
    { label: "Speakers", href: `${basePath}/speakers` },
    ...(showSponsors ? [{ label: "Sponsors & Partners", href: `${basePath}/sponsors` }] : []),
  ];

  return (
    <nav
      aria-label="Workshop sections"
      className="flex items-center gap-1 bg-surface-container-low px-2 py-1 rounded-full border border-border/50"
    >
      {navItems.map((item) => {
        const isActive =
          item.href === basePath ? pathname === basePath : pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all ${
              isActive
                ? "bg-primary-fixed text-on-primary-fixed-variant font-semibold shadow-xs"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function EventSubNavMobileTabs({
  basePath,
  showSponsors = false,
}: {
  basePath: string;
  showSponsors?: boolean;
}) {
  const pathname = usePathname();

  const navItems = [
    { label: "Overview", href: basePath },
    { label: "Registration", href: `${basePath}/register` },
    { label: "Agenda", href: `${basePath}/agenda` },
    { label: "Speakers", href: `${basePath}/speakers` },
    ...(showSponsors ? [{ label: "Sponsors & Partners", href: `${basePath}/sponsors` }] : []),
  ];

  return (
    <div className="flex overflow-x-auto px-4 py-2 gap-1.5 no-scrollbar">
      {navItems.map((item) => {
        const isActive =
          item.href === basePath ? pathname === basePath : pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              isActive
                ? "bg-primary text-white font-semibold shadow-xs"
                : "text-on-surface-variant hover:text-on-surface bg-white/70 border border-border/40"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export function EventSubNav({ event }: EventSubNavProps) {
  const basePath = `/events/${event.slug}`;

  return (
    <div className="sticky top-16 z-30 border-b border-border bg-white/95 backdrop-blur-md transition-all shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
      <div className="mx-auto flex h-14 sm:h-16 max-w-(--container-max) items-center justify-between px-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0 pr-2">
          <Link
            href={basePath}
            className="flex flex-col group hover:opacity-90 transition-opacity min-w-0"
          >
            <span className="text-xs sm:text-sm font-bold text-on-surface leading-tight truncate max-w-[170px] sm:max-w-xs md:max-w-md">
              {event.workshop?.headline || event.title}
            </span>
            <span className="text-[10px] sm:text-[11px] font-medium text-foreground-muted">
              {event.workshop ? "Workshop Series" : "Event"}
            </span>
          </Link>
        </div>

        {/* Desktop Tab Pills */}
        <div className="hidden lg:flex items-center">
          <Suspense
            fallback={
              <div className="h-8 w-96 rounded-full bg-surface-container animate-pulse" />
            }
          >
            <EventSubNavDesktopTabs
              basePath={basePath}
              showSponsors={Boolean(event.workshop?.showSponsors)}
            />
          </Suspense>
        </div>

        {/* Right Action */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 bg-surface-container-high px-3 py-1 rounded-full text-xs text-on-surface-variant font-medium">
            <span className="w-2 h-2 rounded-full bg-secondary shrink-0"></span>
            <span className="truncate max-w-[200px]">
              {event.location ? event.location.split(",")[0] : "VCET Campus"} · {event.format === "online" ? "Online" : "In-Person"}
            </span>
          </div>

          <Link
            href={`${basePath}/register`}
            className="inline-flex items-center gap-1 bg-primary text-on-primary px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-[13px] font-semibold shadow-sm hover:bg-primary-hover transition-all shrink-0"
          >
            <span>Register</span>
            <span className="material-symbols-outlined text-[15px] sm:text-[16px]">arrow_forward</span>
          </Link>
        </div>
      </div>

      {/* Mobile Horizontal Scroll Tab Bar in Dedicated Row */}
      <div className="lg:hidden border-t border-border/40 bg-surface-container-low/40">
        <Suspense fallback={null}>
          <EventSubNavMobileTabs
            basePath={basePath}
            showSponsors={Boolean(event.workshop?.showSponsors)}
          />
        </Suspense>
      </div>
    </div>
  );
}


