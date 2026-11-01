"use client";

import { useState } from "react";
import Link from "next/link";
import type { AgendaSession, ChapterEvent, WorkshopDetails } from "@/types";

interface EventAgendaViewProps {
  event: ChapterEvent;
  workshop: WorkshopDetails;
}

export function EventAgendaView({ event, workshop }: EventAgendaViewProps) {
  const [activeDay, setActiveDay] = useState<1 | 2>(1);
  const [activeTrack, setActiveTrack] = useState<string>("all");
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  const toggleBookmark = (id: string) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDownloadPdf = () => {
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  const handleSyncCal = () => {
    setSyncSuccess(true);
    setTimeout(() => setSyncSuccess(false), 3000);
  };

  const daySessions = workshop.agenda.filter((s) => s.day === activeDay);

  const filteredSessions = daySessions.filter((s) => {
    if (activeTrack === "all") return true;
    return s.track === activeTrack;
  });

  const trackColorMap: Record<AgendaSession["track"], { badge: string; border: string }> = {
    keynote: { badge: "bg-primary-fixed text-on-primary-fixed-variant", border: "border-l-primary" },
    tech: { badge: "bg-primary/10 text-primary", border: "border-l-primary-hover" },
    lab: { badge: "bg-secondary-fixed text-on-secondary-fixed", border: "border-l-secondary" },
    break: { badge: "bg-surface-container text-foreground-muted", border: "border-l-border" },
    all: { badge: "bg-surface-container text-foreground-muted", border: "border-l-border" },
  };

  return (
    <div className="flex flex-col w-full bg-surface">
      {/* Header */}
      <section className="relative w-full overflow-hidden border-b border-border bg-white py-12 lg:py-16">
        <div className="absolute -top-24 -left-20 w-96 h-96 rounded-full bg-primary-fixed/40 blur-3xl pointer-events-none"></div>
        <div className="absolute top-1/2 -right-20 w-80 h-80 rounded-full bg-secondary-fixed/30 blur-3xl pointer-events-none"></div>

        <div className="max-w-(--container-max) mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container text-primary text-xs font-semibold mb-3">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                <span>DevCraft 2025 · Interactive Program</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
                Workshop Schedule &amp; Timeline
              </h1>
              <p className="text-base sm:text-lg text-foreground-muted mt-2">
                Two power-packed days of keynotes, collaborative labs, live coding sprints, and project showcases.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-border text-foreground text-xs sm:text-sm font-semibold hover:bg-surface-container transition-all shadow-xs"
              >
                <span className="material-symbols-outlined text-[18px] text-primary">download</span>
                <span>{downloadSuccess ? "PDF Downloaded!" : "Download PDF Schedule"}</span>
              </button>
              <button
                type="button"
                onClick={handleSyncCal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-on-primary text-xs sm:text-sm font-semibold hover:bg-primary-hover transition-all shadow-xs"
              >
                <span className="material-symbols-outlined text-[18px]">event</span>
                <span>{syncSuccess ? "Calendar Synced!" : "Sync to Google Calendar"}</span>
              </button>
            </div>
          </div>

          {/* Controls Bar: Day Tabs & Bookmarked counter */}
          <div className="bg-surface-container-low rounded-2xl p-4 sm:p-5 border border-border flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex p-1 bg-surface-container rounded-full gap-1 border border-border/50">
              <button
                type="button"
                onClick={() => setActiveDay(1)}
                className={`px-4 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                  activeDay === 1
                    ? "bg-primary text-on-primary shadow-xs"
                    : "text-foreground-muted hover:text-foreground"
                }`}
              >
                Day 1: Saturday, Oct 18 — Foundations &amp; Fullstack
              </button>
              <button
                type="button"
                onClick={() => setActiveDay(2)}
                className={`px-4 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                  activeDay === 2
                    ? "bg-primary text-on-primary shadow-xs"
                    : "text-foreground-muted hover:text-foreground"
                }`}
              >
                Day 2: Sunday, Oct 19 — Cloud, AI &amp; Showcase
              </button>
            </div>

            <div className="flex items-center gap-2 text-foreground-muted text-xs font-semibold bg-white border border-border px-3.5 py-1.5 rounded-full self-start lg:self-auto">
              <span className="material-symbols-outlined text-[16px] text-primary">bookmark</span>
              <span>{bookmarkedIds.size} sessions bookmarked</span>
            </div>
          </div>

          {/* Track Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground-muted mr-1">
              Filter Track:
            </span>
            {[
              { id: "all", label: "All Sessions" },
              { id: "tech", label: "Technical & Architecture" },
              { id: "lab", label: "Hands-on Lab" },
              { id: "keynote", label: "Keynote & Discussion" },
              { id: "break", label: "Break & Networking" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTrack(t.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  activeTrack === t.id
                    ? "bg-primary-fixed text-on-primary-fixed-variant font-bold border border-primary/20"
                    : "bg-white border border-border text-foreground-muted hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Sessions Timeline List */}
      <section className="w-full py-12 bg-surface-container-low border-b border-border">
        <div className="max-w-(--container-max) mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4">
            {filteredSessions.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-border text-foreground-muted text-sm">
                No sessions found for the selected filter.
              </div>
            ) : (
              filteredSessions.map((session) => {
                const isBookmarked = bookmarkedIds.has(session.id);
                const styling = trackColorMap[session.track];

                return (
                  <div
                    key={session.id}
                    className={`bg-white rounded-2xl border border-border p-5 sm:p-6 shadow-xs border-l-4 ${styling.border} hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-6`}
                  >
                    {/* Time & Session Info */}
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4 flex-1">
                      {/* Time Badge */}
                      <div className="sm:w-44 shrink-0 flex flex-col gap-1">
                        <span className="font-mono text-xs font-bold text-foreground">
                          {session.time}
                        </span>
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold self-start ${styling.badge}`}
                        >
                          {session.trackLabel ?? session.track}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="flex flex-col gap-1.5 flex-1">
                        <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug">
                          {session.title}
                        </h3>
                        {session.description ? (
                          <p className="text-xs sm:text-sm text-foreground-muted leading-relaxed">
                            {session.description}
                          </p>
                        ) : null}

                        <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-foreground-muted">
                          {session.speaker ? (
                            <div className="flex items-center gap-1.5 font-semibold text-foreground">
                              <span className="material-symbols-outlined text-[16px] text-primary">
                                person
                              </span>
                              <span>{session.speaker}</span>
                              {session.speakerRole ? (
                                <span className="font-normal text-foreground-muted hidden sm:inline">
                                  ({session.speakerRole})
                                </span>
                              ) : null}
                            </div>
                          ) : null}

                          {session.location ? (
                            <div className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px] text-tertiary">
                                location_on
                              </span>
                              <span>{session.location}</span>
                            </div>
                          ) : null}
                        </div>

                        {session.tags && session.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 pt-2">
                            {session.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 rounded-md bg-surface-container text-foreground-muted text-[10px] font-medium"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Bookmark Toggle */}
                    <div className="shrink-0 flex items-center justify-end md:justify-center">
                      <button
                        type="button"
                        onClick={() => toggleBookmark(session.id)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                          isBookmarked
                            ? "bg-primary text-on-primary shadow-xs"
                            : "bg-surface-container hover:bg-surface-container-high text-foreground-muted hover:text-foreground"
                        }`}
                        title={isBookmarked ? "Remove Bookmark" : "Bookmark Session"}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {isBookmarked ? "bookmark_added" : "bookmark_add"}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="w-full py-12 bg-white">
        <div className="max-w-(--container-max) mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center gap-4">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">
            Seats are strictly capped at {workshop.capacity} developers
          </h2>
          <p className="text-sm text-foreground-muted max-w-xl">
            Register today to receive your digital attendee pass and confirmed laboratory access.
          </p>
          <Link
            href={`/events/${event.slug}/register`}
            className="inline-flex items-center gap-2 bg-primary text-on-primary px-8 py-3 rounded-full text-sm font-semibold shadow-sm hover:bg-primary-hover transition-all mt-2"
          >
            <span>Register for Free</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
        </div>
      </section>
    </div>
  );
}

