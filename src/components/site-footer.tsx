import Link from "next/link";
import { chapter } from "@/content/chapter";
import { GdgLogo } from "@/components/gdg-logo";

// Computed once at build time rather than per-render, since Cache Components
// treats `new Date()` inside a component body as an unstable prerender value.
const copyrightYear = new Date().getFullYear();

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface-muted">
      <div className="mx-auto flex max-w-(--container-max) flex-col gap-8 px-5 py-12 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-3">
            {/* White backdrop: the logo's cutouts are drawn as literal white
                shapes, so it needs a white surface even on this gray footer. */}
            <div className="inline-flex w-fit rounded-(--radius-sm) bg-white p-2">
              <GdgLogo className="h-5" />
            </div>
            <p className="text-[15px] font-medium text-foreground">{chapter.name}</p>
            <p className="max-w-sm text-sm text-foreground-muted">{chapter.institution}</p>
          </div>

          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-4">
              {chapter.nav.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm font-medium text-foreground-muted hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/join" className="text-sm font-medium text-foreground-muted hover:text-primary">
                  Join
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        {chapter.socials.length > 0 ? (
          <ul className="flex flex-wrap gap-4">
            {chapter.socials.map((social) => (
              <li key={social.href}>
                <a href={social.href} className="text-sm font-medium text-foreground-muted hover:text-primary">
                  {social.label}
                </a>
              </li>
            ))}
          </ul>
        ) : null}

        <p className="text-xs text-foreground-muted">
          © {copyrightYear} {chapter.name}. An independent, community-run student group — not an official
          Google product or representative.
        </p>
      </div>
    </footer>
  );
}
