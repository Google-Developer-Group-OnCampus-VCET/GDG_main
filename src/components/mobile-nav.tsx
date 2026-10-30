"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavLink } from "@/types";

export function MobileNav({ nav, joinUrl }: { nav: NavLink[]; joinUrl: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        "a, button",
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-11 items-center justify-center rounded-(--radius-sm) text-foreground focus-visible:outline-2 focus-visible:outline-(--focus-ring) focus-visible:outline-offset-2"
      >
        <span aria-hidden="true" className="relative block h-4 w-6">
          <span
            className={`absolute left-0 top-0 h-0.5 w-6 bg-foreground transition-transform duration-150 ${open ? "translate-y-[7px] rotate-45" : ""}`}
          />
          <span
            className={`absolute left-0 top-[7px] h-0.5 w-6 bg-foreground transition-opacity duration-150 ${open ? "opacity-0" : ""}`}
          />
          <span
            className={`absolute left-0 top-[14px] h-0.5 w-6 bg-foreground transition-transform duration-150 ${open ? "-translate-y-[7px] -rotate-45" : ""}`}
          />
        </span>
      </button>

      {open ? (
        <div
          id="mobile-nav-panel"
          ref={panelRef}
          className="fixed inset-x-0 top-16 z-50 border-b border-border bg-white px-5 py-4 shadow-lg"
        >
          <nav aria-label="Mobile">
            <ul className="flex flex-col gap-1">
              {nav.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="block rounded-(--radius-sm) px-3 py-3 text-base font-medium text-foreground hover:bg-surface-muted"
                    aria-current={pathname === link.href ? "page" : undefined}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <a
            href={joinUrl}
            className="mt-4 flex h-11 items-center justify-center rounded-(--radius-sm) bg-primary px-5 text-[15px] font-medium text-on-primary"
          >
            Join the community
          </a>
        </div>
      ) : null}
    </div>
  );
}
