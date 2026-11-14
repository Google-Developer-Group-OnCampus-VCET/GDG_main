"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { ChapterEvent, WorkshopDetails } from "@/types";

interface EventSpeakersViewProps {
  event: ChapterEvent;
  workshop: WorkshopDetails;
}

export function EventSpeakersView({ event, workshop }: EventSpeakersViewProps) {
  const isTbd = Boolean(workshop.speakersTbd || workshop.speakers.length === 0);
  const [activeTab, setActiveTab] = useState<string>("all");

  const filteredSpeakers = workshop.speakers.filter((s) => {
    if (activeTab === "all") return true;
    return s.category === activeTab;
  });

  const categoryBorderColors = [
    "border-t-primary",
    "border-t-secondary",
    "border-t-tertiary",
    "border-t-[#fbbc04]",
  ];

  return (
    <div className="flex flex-col w-full bg-surface">
      {/* Editorial Header */}
      <section className="relative w-full overflow-hidden border-b border-border bg-white py-12 lg:py-16">
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-primary-fixed/30 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute left-1/3 -bottom-24 w-80 h-80 bg-secondary-fixed/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-(--container-max) mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col gap-6">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="flex flex-col gap-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                <span>
                  {isTbd ? "Lineup Status · To Be Announced" : `Faculty & Industry Lineup · ${event.title}`}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
                Meet Our Instructors &amp; Mentors
              </h1>
              <p className="text-base sm:text-lg text-foreground-muted pt-1">
                {isTbd
                  ? `Speaker and instructor allocations for ${event.title} are currently To Be Decided (TBD). Track leads, faculty mentors, and keynote speakers will be announced prior to the event.`
                  : "Learn directly from Google Developer Experts, industry engineering leads, and experienced VCET alumni building world-class distributed systems."}
              </p>
            </div>

            {/* Micro Stats Badge */}
            <div className="flex items-center gap-4 bg-surface-container-low p-4 rounded-2xl border border-border shrink-0 self-start lg:self-auto">
              <div className="flex flex-col">
                <span className="text-xl font-bold text-primary">{isTbd ? "TBD" : "12+"}</span>
                <span className="text-xs text-foreground-muted">{isTbd ? "Lineup Status" : "Active Mentors"}</span>
              </div>
              <div className="w-px h-8 bg-border"></div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-secondary">4 : 1</span>
                <span className="text-xs text-foreground-muted">Student Ratio</span>
              </div>
              <div className="w-px h-8 bg-border"></div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-tertiary">100%</span>
                <span className="text-xs text-foreground-muted">Hands-on Labs</span>
              </div>
            </div>
          </div>

          {/* Category Tabs (only when not TBD) */}
          {!isTbd && (
            <div className="flex items-center gap-2 overflow-x-auto pt-2 no-scrollbar">
              {[
                { id: "all", label: `All Mentors (${workshop.speakers.length})` },
                { id: "keynote", label: "Keynote Speakers" },
                { id: "hands-on", label: "Hands-on Instructors" },
                { id: "mentors", label: "Technical Mentors" },
                { id: "leads", label: "Organizing Leads" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`shrink-0 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                    activeTab === tab.id
                      ? "bg-primary text-on-primary shadow-xs"
                      : "bg-surface-container hover:bg-surface-container-high text-foreground-muted hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Main Speakers Section */}
      {isTbd ? (
        <section className="w-full py-16 bg-surface-container-low border-b border-border">
          <div className="max-w-(--container-max) mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-3xl border border-border p-8 sm:p-12 shadow-xs text-center flex flex-col items-center max-w-3xl mx-auto gap-6">
              <div className="w-16 h-16 rounded-2xl bg-primary-fixed/50 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[32px]">groups</span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-foreground-muted text-xs font-semibold mx-auto">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                  <span>Announcement In Progress</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                  Speaker Lineup: To Be Decided (TBD)
                </h2>
                <p className="text-sm sm:text-base text-foreground-muted max-w-xl">
                  We are finalizing the instructor and mentor roster for each of the four workshop tracks. Session allocations, speaker profiles, and faculty guides will be announced here soon.
                </p>
              </div>

              {/* 4 Day Track Preview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full text-left pt-2">
                {[
                  {
                    day: "Day 1",
                    title: "Foundation & Fullstack Systems",
                    instructor: "Instructor: TBD",
                    badge: "Web Systems",
                  },
                  {
                    day: "Day 2",
                    title: "Grounded RAG & Autonomous Agents",
                    instructor: "Instructor: TBD",
                    badge: "GenAI & Agents",
                  },
                  {
                    day: "Day 3",
                    title: "Cloud Run & CI/CD Pipelines",
                    instructor: "Instructor: TBD",
                    badge: "Cloud DevOps",
                  },
                  {
                    day: "Day 4",
                    title: "Security Hardening & Live Demos",
                    instructor: "Instructor: TBD",
                    badge: "Audit & Demo",
                  },
                ].map((track) => (
                  <div
                    key={track.day}
                    className="p-4 rounded-2xl bg-surface-container-low border border-border/70 flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-primary">{track.day}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-container text-foreground-muted">
                        {track.badge}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">{track.title}</h4>
                      <p className="text-xs text-foreground-muted font-medium pt-1">
                        {track.instructor}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-4">
                <Link
                  href={`/events/${event.slug}/agenda`}
                  className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold shadow-xs hover:bg-primary-hover transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                  <span>View Detailed Agenda</span>
                </Link>
                <Link
                  href={`/events/${event.slug}/register`}
                  className="inline-flex items-center gap-2 bg-white border border-border text-foreground px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold hover:bg-surface-container transition-all"
                >
                  <span>Reserve a Seat</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : (
        /* Speakers Grid */
        <section className="w-full py-16 bg-surface-container-low border-b border-border">
          <div className="max-w-(--container-max) mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredSpeakers.map((speaker, index) => {
                const borderAccent = categoryBorderColors[index % categoryBorderColors.length];

                return (
                  <article
                    key={speaker.id}
                    className={`bg-white rounded-2xl border border-border p-6 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between gap-5 border-t-4 ${borderAccent}`}
                  >
                    <div className="flex flex-col gap-4">
                      {/* Header: Photo & Role */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-full overflow-hidden bg-surface-container border border-border shrink-0 relative">
                            {speaker.photo ? (
                              <Image
                                src={speaker.photo}
                                alt={speaker.name}
                                fill
                                sizes="64px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-primary bg-primary-fixed/50 text-base">
                                {speaker.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <h3 className="text-lg font-bold text-foreground">{speaker.name}</h3>
                              <span className="material-symbols-outlined text-primary text-[18px]">
                                verified
                              </span>
                            </div>
                            <span className="text-xs text-foreground-muted">{speaker.role}</span>
                            <span className="text-xs font-semibold text-primary">{speaker.organization}</span>
                          </div>
                        </div>

                        {speaker.badge ? (
                          <span className="px-2.5 py-1 rounded-full bg-surface-container text-foreground-muted text-[11px] font-bold shrink-0">
                            {speaker.badge}
                          </span>
                        ) : null}
                      </div>

                      {/* Topic Box if available */}
                      {speaker.topicTitle ? (
                        <div className="p-4 rounded-xl bg-surface-container-low border border-border/50 flex flex-col gap-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
                            Session &amp; Topic
                          </span>
                          <h4 className="text-sm font-bold text-foreground">
                            “{speaker.topicTitle}”
                          </h4>
                          {speaker.topicDescription ? (
                            <p className="text-xs text-foreground-muted leading-relaxed pt-1">
                              {speaker.topicDescription}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    {/* Tags & Socials */}
                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/40">
                      <div className="flex flex-wrap gap-1.5">
                        {speaker.tags.map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded-md bg-surface-container text-foreground-muted text-[11px] font-medium"
                          >
                            {t}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {speaker.socials?.linkedin ? (
                          <a
                            href={speaker.socials.linkedin}
                            target="_blank"
                            rel="noreferrer"
                            className="w-8 h-8 rounded-full bg-surface-container hover:bg-primary hover:text-white text-foreground-muted flex items-center justify-center transition-colors text-xs font-bold"
                            title="LinkedIn Profile"
                          >
                            in
                          </a>
                        ) : null}
                        {speaker.socials?.github ? (
                          <a
                            href={speaker.socials.github}
                            target="_blank"
                            rel="noreferrer"
                            className="w-8 h-8 rounded-full bg-surface-container hover:bg-foreground hover:text-white text-foreground-muted flex items-center justify-center transition-colors text-xs font-bold"
                            title="GitHub Profile"
                          >
                            gh
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Office Hours Banner */}
      <section className="w-full py-16 bg-white">
        <div className="max-w-(--container-max) mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-primary-fixed/50 via-white to-secondary-fixed/40 p-8 sm:p-12 rounded-3xl border border-border flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
            <div className="flex flex-col gap-2 max-w-xl text-center md:text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                1-on-1 Guidance
              </span>
              <h2 className="text-2xl font-bold text-foreground">
                Mentor Office Hours &amp; Code Reviews
              </h2>
              <p className="text-sm text-foreground-muted">
                Every workshop pass includes direct access to instructors and mentors across all four days to review your code and cloud architecture.
              </p>
            </div>
            <Link
              href={`/events/${event.slug}/register`}
              className="inline-flex items-center gap-2 bg-primary text-on-primary px-8 py-3 rounded-full text-sm font-semibold shadow-sm hover:bg-primary-hover transition-all shrink-0"
            >
              <span>Reserve Your Pass</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

