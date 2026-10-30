import Link from "next/link";
import { chapter } from "@/content/chapter";
import { MobileNav } from "@/components/mobile-nav";
import { GdgLogo } from "@/components/gdg-logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-(--container-max) items-center justify-between px-5 sm:px-8 lg:h-[72px] lg:px-10">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-(--radius-sm) text-foreground focus-visible:outline-2 focus-visible:outline-(--focus-ring) focus-visible:outline-offset-2"
        >
          <GdgLogo className="h-5 sm:h-6" />
          <span className="hidden text-[15px] font-medium text-foreground-muted sm:inline">
            on Campus · VCET
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {chapter.nav.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="rounded-(--radius-sm) px-3 py-2 text-[15px] font-medium text-foreground-muted hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-(--focus-ring) focus-visible:outline-offset-2"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden md:block">
          <a
            href={chapter.joinUrl}
            className="flex h-11 items-center justify-center rounded-(--radius-sm) bg-primary px-5 text-[15px] font-medium text-on-primary transition-colors duration-150 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-(--focus-ring) focus-visible:outline-offset-2"
          >
            Join the community
          </a>
        </div>

        <MobileNav nav={chapter.nav} joinUrl={chapter.joinUrl} />
      </div>
    </header>
  );
}
