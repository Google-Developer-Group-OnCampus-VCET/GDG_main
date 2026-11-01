"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ChapterEvent } from "@/types";

interface EventSubNavProps {
  event: ChapterEvent;
}

function EventSubNavTabs({ basePath }: { basePath: string }) {
  const pathname = usePathname();

  const navItems = [
    { label: "Overview", href: basePath },
    { label: "Registration", href: `${basePath}/register` },
    { label: "Agenda", href: `${basePath}/agenda` },
    { label: "Speakers", href: `${basePath}/speakers` },
    { label: "Sponsors & Partners", href: `${basePath}/sponsors` },
  ];

  return (
    <>
      {/* Desktop Tab Pills */}
      <nav
        aria-label="Workshop sections"
        className="hidden lg:flex items-center gap-1 bg-surface-container-low px-2 py-1 rounded-full border border-border/50"
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

      {/* Mobile Horizontal Scroll Tab Bar */}
      <div className="flex lg:hidden overflow-x-auto px-4 py-2 border-t border-border/40 gap-1 bg-surface-container-low/40 no-scrollbar">
        {navItems.map((item) => {
          const isActive =
            item.href === basePath ? pathname === basePath : pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                isActive
                  ? "bg-primary-fixed text-on-primary-fixed-variant font-semibold"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </>
  );
}

export function EventSubNav({ event }: EventSubNavProps) {
  const basePath = `/events/${event.slug}`;

  return (
    <div className="sticky top-16 z-30 border-b border-border bg-white/95 backdrop-blur-md transition-all shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
      <div className="mx-auto flex h-16 max-w-(--container-max) items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href={basePath}
            className="flex flex-col group hover:opacity-90 transition-opacity"
          >
            <span className="text-sm font-bold text-on-surface leading-tight">
              DevCraft &apos;25
            </span>
            <span className="text-[11px] font-medium text-foreground-muted">
              Flagship Workshop
            </span>
          </Link>
        </div>

        <Suspense
          fallback={
            <div className="hidden lg:flex h-8 w-96 rounded-full bg-surface-container animate-pulse" />
          }
        >
          <EventSubNavTabs basePath={basePath} />
        </Suspense>

        {/* Right Action */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 bg-surface-container-high px-3 py-1 rounded-full text-xs text-on-surface-variant font-medium">
            <span className="w-2 h-2 rounded-full bg-secondary shrink-0"></span>
            <span>VCET Campus · Offline</span>
          </div>

          <Link
            href={`${basePath}/register`}
            className="inline-flex items-center gap-1.5 bg-primary text-on-primary px-4 py-1.5 rounded-full text-xs sm:text-[13px] font-semibold shadow-sm hover:bg-primary-hover transition-all"
          >
            <span>Register Now</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>
      </div>
    </div>
  );
}


