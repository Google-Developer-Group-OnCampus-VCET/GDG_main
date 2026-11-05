"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { GdgLogo } from "@/components/gdg-logo";

interface AdminLayoutShellProps {
  children: React.ReactNode;
}

const NAV_GROUPS = [
  {
    title: "Core Operations",
    items: [
      { label: "Overview", href: "/admin", icon: "dashboard" },
      { label: "Events", href: "/admin/events", icon: "calendar_month" },
      { label: "Registrations", href: "/admin/registrations", icon: "group" },
      { label: "Attendance & QR", href: "/admin/attendance", icon: "qr_code_scanner" },
    ],
  },
  {
    title: "Event Content",
    items: [
      { label: "Speakers", href: "/admin/speakers", icon: "record_voice_over" },
      { label: "Sponsors", href: "/admin/sponsors", icon: "handshake" },
      { label: "Agenda Sessions", href: "/admin/agenda", icon: "view_timeline" },
      { label: "Announcements", href: "/admin/announcements", icon: "campaign" },
    ],
  },
  {
    title: "Community & Platform",
    items: [
      { label: "Team & RBAC", href: "/admin/team", icon: "badge" },
      { label: "Certificates", href: "/admin/certificates", icon: "workspace_premium" },
      { label: "Resources", href: "/admin/resources", icon: "folder_open" },
      { label: "Analytics", href: "/admin/analytics", icon: "insights" },
      { label: "Chapter Settings", href: "/admin/settings", icon: "settings" },
    ],
  },
];

export function AdminLayoutShell({ children }: AdminLayoutShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // If on /admin/login, don't show the sidebar shell
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } catch {
      router.push("/admin/login");
    }
  };

  return (
    <div className="min-h-screen bg-surface-container-low flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden sticky top-0 z-50 bg-white border-b border-border px-4 py-3 flex items-center justify-between shadow-xs">
        <Link href="/admin" className="flex items-center gap-2">
          <GdgLogo className="h-5" />
          <span className="text-xs font-bold text-foreground">Admin Workspace</span>
        </Link>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-lg border border-border text-foreground hover:bg-surface-container"
        >
          <span className="material-symbols-outlined text-[20px]">
            {mobileMenuOpen ? "close" : "menu"}
          </span>
        </button>
      </div>

      {/* Persistent Left Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-64 bg-white border-r border-border flex flex-col justify-between shrink-0 transition-transform duration-200 md:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Workspace Brand & Tenant */}
        <div className="p-4 border-b border-border/80 flex flex-col gap-2">
          <Link href="/" className="flex items-center gap-2">
            <GdgLogo className="h-6" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-foreground">GDG on Campus</span>
              <span className="text-[10px] text-foreground-muted">VCET · Control Center</span>
            </div>
          </Link>

          {/* Chapter Tenant Badge */}
          <div className="mt-1 px-2.5 py-1.5 rounded-xl bg-surface-container-low border border-border flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-google-blue"></span>
              <span className="text-[11px] font-bold text-foreground">GDG VCET</span>
            </div>
            <span className="text-[9px] font-mono uppercase bg-primary-fixed text-on-primary-fixed-variant px-1.5 py-0.2 rounded font-bold">
              TENANT
            </span>
          </div>
        </div>

        {/* Navigation Groups */}
        <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-6 scrollbar-none">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="flex flex-col gap-1">
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-foreground-muted/70">
                {group.title}
              </span>
              {group.items.map((item) => {
                const isActive =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-primary text-on-primary shadow-xs font-bold"
                        : "text-foreground-muted hover:text-foreground hover:bg-surface-container-low"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Admin User Profile & Sign Out Footer */}
        <div className="p-3 border-t border-border/80 bg-surface-container-lowest flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold text-xs">
                JH
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground">Jatush Hingu</span>
                <span className="text-[10px] text-foreground-muted">Chapter Admin</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              title="Sign Out"
              className="p-1.5 rounded-lg text-foreground-muted hover:text-status-error hover:bg-red-50 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] text-foreground-muted pt-1">
            <Link href="/" className="hover:underline flex items-center gap-0.5">
              <span>View Public Portal</span>
              <span className="material-symbols-outlined text-[12px]">open_in_new</span>
            </Link>
            <span className="font-mono">v2.5.0</span>
          </div>
        </div>
      </aside>

      {/* Main Workspace Canvas */}
      <main className="flex-1 min-w-0 flex flex-col overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

