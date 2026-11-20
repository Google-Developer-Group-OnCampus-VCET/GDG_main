"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ChapterEvent } from "@/types";
import type { EventStats } from "@/lib/db";
import { formatEventDateRange } from "@/lib/events";
import { EventStatusToggle } from "@/components/admin/event-status-toggle";

interface ChapterEventsDirectoryProps {
  events: ChapterEvent[];
  statsBySlug: Record<string, EventStats>;
  role: "admin" | "core" | "volunteer" | null;
}

function isEventRegistrationOpen(stats?: EventStats): boolean {
  return (
    (stats as { isRegistrationOpen?: boolean; isOpen: boolean } | undefined)
      ?.isRegistrationOpen ??
    stats?.isOpen ??
    true
  );
}

function getTopicBadgeColor(topic: string) {
  switch (topic.toLowerCase()) {
    case "cloud":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "ai-ml":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "web":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "android":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

export function ChapterEventsDirectory({
  events,
  statsBySlug,
  role,
}: ChapterEventsDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "active" | "archived">("all");

  const { activeList, archivedList } = useMemo(() => {
    const active: ChapterEvent[] = [];
    const archived: ChapterEvent[] = [];

    events.forEach((e) => {
      const stats = statsBySlug[e.slug];
      const isOpen = isEventRegistrationOpen(stats);
      // Active if has registration URL or upcoming date with open status
      const isActuallyActive =
        Boolean(e.registrationUrl) ||
        (isOpen && (!e.endsAt || new Date(e.endsAt) >= new Date("2026-11-01")));

      if (isActuallyActive) {
        active.push(e);
      } else {
        archived.push(e);
      }
    });

    return { activeList: active, archivedList: archived };
  }, [events, statsBySlug]);

  const displayedEvents = useMemo(() => {
    let baseList = events;
    if (activeTab === "active") baseList = activeList;
    if (activeTab === "archived") baseList = archivedList;

    if (!searchQuery.trim()) return baseList;

    const q = searchQuery.toLowerCase().trim();
    return baseList.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.location?.toLowerCase().includes(q) ||
        e.slug.toLowerCase().includes(q) ||
        e.topics.some((t) => t.toLowerCase().includes(q))
    );
  }, [events, activeTab, activeList, archivedList, searchQuery]);

  return (
    <div className="bg-white rounded-3xl border border-border shadow-xs overflow-hidden flex flex-col">
      {/* Header with Search and Tabs */}
      <div className="p-6 border-b border-border/60 bg-gradient-to-b from-surface-container-low/40 to-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">calendar_month</span>
            <h2 className="text-lg font-bold text-foreground">
              Chapter Events Directory &amp; Archives
            </h2>
          </div>
          <p className="text-xs text-foreground-muted mt-1">
            Browse active workshop cohort checkpoints, past overseas sessions, and community archives.
          </p>
        </div>

        {/* Search & Tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Tab Filter */}
          <div className="inline-flex items-center bg-surface-container-low p-1 rounded-xl border border-border/60 text-xs">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === "all"
                  ? "bg-white text-foreground font-bold shadow-2xs"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              All ({events.length})
            </button>
            <button
              onClick={() => setActiveTab("active")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === "active"
                  ? "bg-white text-primary font-bold shadow-2xs"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              Active ({activeList.length})
            </button>
            <button
              onClick={() => setActiveTab("archived")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === "archived"
                  ? "bg-white text-foreground font-bold shadow-2xs"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              Archives ({archivedList.length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search initiatives…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-48 md:w-56 pl-8 pr-3 py-1.5 rounded-xl border border-border text-xs bg-white text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <span className="material-symbols-outlined absolute left-2.5 top-2 text-[14px] text-foreground-muted pointer-events-none">
              search
            </span>
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-2 text-foreground-muted hover:text-foreground text-[14px]"
              >
                ✕
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Events List / Cards */}
      {displayedEvents.length === 0 ? (
        <div className="p-12 text-center text-foreground-muted text-sm flex flex-col items-center gap-2">
          <span className="material-symbols-outlined text-[36px] text-foreground-muted/50">event_busy</span>
          <p>No initiatives match your search or filter.</p>
          <button
            onClick={() => {
              setSearchQuery("");
              setActiveTab("all");
            }}
            className="text-primary text-xs font-semibold hover:underline mt-1"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {displayedEvents.map((e) => {
            const stats = statsBySlug[e.slug] ?? {
              totalRegistered: 0,
              capacity: e.capacity ?? 135,
              remaining: e.capacity ?? 135,
              percentFilled: 0,
              isOpen: true,
              checkedInCount: 0,
              trackCounts: {},
              yearCounts: {},
              departmentCounts: {},
            };
            const isOpen = isEventRegistrationOpen(stats);
            const isFlagship = e.slug === "dev-to-cloud";
            const percentFilled = Math.min(100, Math.round((stats.totalRegistered / Math.max(stats.capacity, 1)) * 100));

            return (
              <div
                key={e.id}
                className="p-5 sm:p-6 hover:bg-surface-container-low/40 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Event Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    {isFlagship ? (
                      <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant text-[10px] font-bold tracking-wide">
                        FLAGSHIP
                      </span>
                    ) : null}

                    {e.topics.map((t) => (
                      <span
                        key={t}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase ${getTopicBadgeColor(
                          t
                        )}`}
                      >
                        {t}
                      </span>
                    ))}

                    <span className="px-2 py-0.5 rounded-full bg-surface-container text-foreground-muted text-[10px] font-medium capitalize">
                      {e.format ?? "in-person"}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-foreground">
                    <Link
                      href={isFlagship ? `/admin/console/events/${e.slug}/registrations` : `/admin/console/events/${e.slug}/registrations`}
                      className="hover:text-primary transition-colors"
                    >
                      {e.title}
                    </Link>
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-foreground-muted">
                    <span className="inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">event</span>
                      <span>{formatEventDateRange(e)}</span>
                    </span>

                    {e.location ? (
                      <span className="inline-flex items-center gap-1 truncate max-w-md">
                        <span className="material-symbols-outlined text-[14px]">location_on</span>
                        <span>{e.location}</span>
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Capacity Progress Bar */}
                <div className="lg:w-48 shrink-0 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">
                      {stats.totalRegistered}{" "}
                      <span className="font-normal text-foreground-muted">/ {stats.capacity}</span>
                    </span>
                    <span className="text-[11px] font-medium text-foreground-muted">
                      {percentFilled}% filled
                    </span>
                  </div>
                  <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        percentFilled >= 90
                          ? "bg-rose-500"
                          : percentFilled >= 70
                          ? "bg-primary"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${percentFilled}%` }}
                    />
                  </div>
                </div>

                {/* Status & Actions */}
                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  {role === "admin" ? (
                    <EventStatusToggle
                      eventSlug={e.slug}
                      initialIsOpen={isOpen}
                      compact
                    />
                  ) : (
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 ${
                        isOpen
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isOpen ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                        }`}
                      />
                      <span>{isOpen ? "Open" : "Closed"}</span>
                    </span>
                  )}

                  <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl border border-border/50 text-xs">
                    <Link
                      href={`/admin/console/events/${e.slug}/registrations`}
                      className="px-2.5 py-1 rounded-lg font-semibold text-primary hover:bg-white hover:shadow-2xs transition-all"
                      title="Registrations Roster"
                    >
                      Roster ({stats.totalRegistered})
                    </Link>
                    <Link
                      href={`/admin/console/events/${e.slug}/check-in`}
                      className="px-2.5 py-1 rounded-lg font-medium text-foreground-muted hover:text-foreground hover:bg-white hover:shadow-2xs transition-all"
                      title="Gate Scanner Terminal"
                    >
                      Check-in
                    </Link>
                    <Link
                      href={`/admin/console/events/${e.slug}/analytics`}
                      className="px-2.5 py-1 rounded-lg font-medium text-foreground-muted hover:text-foreground hover:bg-white hover:shadow-2xs transition-all"
                      title="Cohort Analytics"
                    >
                      Analytics
                    </Link>
                    {role === "admin" ? (
                      <Link
                        href={`/admin/console/events/${e.slug}/edit`}
                        className="px-2.5 py-1 rounded-lg font-medium text-foreground-muted hover:text-foreground hover:bg-white hover:shadow-2xs transition-all"
                        title="Edit Workshop Metadata"
                      >
                        Edit
                      </Link>
                    ) : null}
                    <Link
                      href={e.registrationUrl ?? `/events/${e.slug}/register`}
                      className="px-2 py-1 rounded-lg text-foreground-muted hover:text-primary hover:bg-white hover:shadow-2xs transition-all inline-flex items-center"
                      title="Public Event Portal"
                      target="_blank"
                    >
                      <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
