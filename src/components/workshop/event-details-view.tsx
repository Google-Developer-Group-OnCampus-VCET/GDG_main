"use client";

import { useState } from "react";
import Link from "next/link";
import type { ChapterEvent, WorkshopDetails } from "@/types";

interface EventDetailsViewProps {
  event: ChapterEvent;
  workshop: WorkshopDetails;
  stats?: {
    totalRegistered: number;
    capacity: number;
    remaining: number;
    percentFilled: number;
  };
}

export function EventDetailsView({ event, workshop, stats }: EventDetailsViewProps) {
  const [faqSearch, setFaqSearch] = useState("");
  const [selectedFaqCategory, setSelectedFaqCategory] = useState("All");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const totalRegistered = stats?.totalRegistered ?? workshop.initialRegisteredCount;
  const capacity = stats?.capacity ?? workshop.capacity;
  const remaining = stats?.remaining ?? Math.max(0, capacity - totalRegistered);
  const percentFilled = stats?.percentFilled ?? Math.round((totalRegistered / capacity) * 100);

  const faqCategories = ["All", ...Array.from(new Set(workshop.faq.map((f) => f.category ?? "General")))];

  const filteredFaq = workshop.faq.filter((item) => {
    const matchesCategory =
      selectedFaqCategory === "All" || item.category === selectedFaqCategory;
    const matchesSearch =
      faqSearch === "" ||
      item.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
      item.answer.toLowerCase().includes(faqSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const pillarColorMap = {
    blue: "border-primary bg-primary/5 text-primary",
    green: "border-secondary bg-secondary/5 text-secondary",
    yellow: "border-[#fbbc04] bg-[#fbbc04]/10 text-on-surface",
    red: "border-tertiary bg-tertiary/5 text-tertiary",
  };

  const objectiveStripeMap = {
    blue: "bg-primary",
    green: "bg-secondary",
    yellow: "bg-[#fbbc04]",
    red: "bg-tertiary",
  };

  return (
    <div className="flex flex-col w-full bg-surface">
      {/* SECTION 1: HEADER & LIVE REGISTRATION STRIP */}
      <section className="relative w-full overflow-hidden border-b border-border bg-white py-12 lg:py-16">
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[840px] h-[360px] bg-gradient-to-r from-primary/10 via-secondary/10 to-tertiary/10 blur-3xl opacity-70"></div>
        <div className="max-w-(--container-max) mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex flex-col gap-6">
            {/* Breadcrumb & Badge */}
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
              <div className="inline-flex items-center gap-1.5 bg-primary-fixed text-on-primary-fixed-variant px-3 py-1 rounded-full font-semibold shadow-xs">
                <span className="material-symbols-outlined text-[16px]">menu_book</span>
                <span>Flagship Technical Summit &amp; Syllabus</span>
              </div>
              <span className="text-foreground-muted font-bold">•</span>
              <span className="text-foreground-muted font-medium">
                VCET Vasai · Departments of IT &amp; Computer Engineering
              </span>
            </div>

            {/* Title & Deck */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
              <div className="lg:col-span-8 flex flex-col gap-3">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.15]">
                  {workshop.headline}
                </h1>
                <p className="text-base sm:text-lg text-foreground-muted max-w-3xl leading-relaxed">
                  {workshop.subheading}
                </p>
              </div>

              {/* Live Capacity Card */}
              <div className="lg:col-span-4 flex flex-col gap-3 bg-surface-container-low p-5 rounded-2xl border border-border shadow-xs">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-semibold text-foreground-muted uppercase tracking-wider">
                    Cohort Capacity
                  </span>
                  <span className="font-bold text-tertiary">{percentFilled}% Filled</span>
                </div>
                <div className="w-full bg-surface-container-high rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-primary h-2.5 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${percentFilled}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-xs text-foreground-muted pt-1">
                  <span className="flex items-center gap-1 font-medium">
                    <span className="w-2 h-2 rounded-full bg-secondary inline-block animate-pulse"></span>{" "}
                    {totalRegistered} Confirmed
                  </span>
                  <span className="font-semibold text-foreground">{remaining} Seats Remaining</span>
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
              <div className="bg-surface-container-lowest p-4 rounded-xl border border-border flex items-center gap-3 shadow-xs">
                <div className="w-11 h-11 rounded-xl bg-primary-fixed flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-[24px]">calendar_month</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-foreground">
                    {workshop.agenda && workshop.agenda.length > 0
                      ? `${new Set(workshop.agenda.map((a) => a.day)).size} Days`
                      : "4 Days"}
                  </span>
                  <span className="text-xs text-foreground-muted">Hands-on Workshop</span>
                </div>
              </div>
              <div className="bg-surface-container-lowest p-4 rounded-xl border border-border flex items-center gap-3 shadow-xs">
                <div className="w-11 h-11 rounded-xl bg-secondary-fixed flex items-center justify-center text-secondary shrink-0">
                  <span className="material-symbols-outlined text-[24px]">terminal</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-foreground">100% Code</span>
                  <span className="text-xs text-foreground-muted">Live Deployments</span>
                </div>
              </div>
              <div className="bg-surface-container-lowest p-4 rounded-xl border border-border flex items-center gap-3 shadow-xs">
                <div className="w-11 h-11 rounded-xl bg-tertiary-fixed flex items-center justify-center text-tertiary shrink-0">
                  <span className="material-symbols-outlined text-[24px]">groups</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-foreground">4 : 1 Ratio</span>
                  <span className="text-xs text-foreground-muted">Mentor Guidance</span>
                </div>
              </div>
              <div className="bg-surface-container-lowest p-4 rounded-xl border border-border flex items-center gap-3 shadow-xs">
                <div className="w-11 h-11 rounded-xl bg-[#fbbc04]/20 flex items-center justify-center text-on-surface shrink-0">
                  <span className="material-symbols-outlined text-[24px]">verified</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-foreground">Verified</span>
                  <span className="text-xs text-foreground-muted">GDG VCET Certificate</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: 4 CORE PILLARS & ARCHITECTURE BENTO */}
      <section className="w-full py-16 bg-surface-container-low border-b border-border">
        <div className="max-w-(--container-max) mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="max-w-2xl">
                <span className="text-xs font-bold uppercase tracking-widest text-primary">
                  Technical Architecture Matrix
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mt-1">
                  The Four Pillars of Production Software
                </h2>
                <p className="text-sm sm:text-base text-foreground-muted mt-2">
                  Each session in {event.title} is engineered around practical industry challenges, moving from client runtimes into distributed cloud scalability.
                </p>
              </div>
              <Link
                href={`/events/${event.slug}/agenda`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover"
              >
                <span>View Complete Timetable</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {workshop.pillars.map((pillar) => (
                <div
                  key={pillar.title}
                  className="bg-white p-6 rounded-2xl border border-border shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${pillarColorMap[pillar.color]}`}
                    >
                      <span className="material-symbols-outlined text-[26px]">
                        {pillar.icon}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <h3 className="text-lg font-bold text-foreground">{pillar.title}</h3>
                      <p className="text-sm text-foreground-muted mt-1 leading-relaxed">
                        {pillar.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
                    {pillar.tags.map((t) => (
                      <span
                        key={t}
                        className="px-2.5 py-0.5 rounded-full bg-surface-container text-foreground-muted text-xs font-medium"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: LEARNING OBJECTIVES & OUTCOMES */}
      <section className="w-full py-16 bg-white border-b border-border">
        <div className="max-w-(--container-max) mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-10">
            <div className="text-center max-w-2xl mx-auto flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-primary">
                Practical Competencies
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                What You Will Walk Away With
              </h2>
              <p className="text-sm sm:text-base text-foreground-muted">
                Six concrete capabilities every participant will demonstrate by building and deploying code throughout the workshop.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workshop.learningObjectives.map((obj, index) => (
                <div
                  key={obj.title}
                  className="relative bg-surface-container-low/60 p-6 rounded-2xl border border-border overflow-hidden flex flex-col gap-3 group hover:bg-white hover:shadow-md transition-all"
                >
                  <div
                    className={`absolute top-0 left-0 right-0 h-1.5 ${objectiveStripeMap[obj.color]}`}
                  ></div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-foreground-muted">
                      OBJECTIVE {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="material-symbols-outlined text-secondary text-[20px]">
                      check_circle
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                    {obj.title}
                  </h3>
                  <p className="text-sm text-foreground-muted leading-relaxed">
                    {obj.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: WHO SHOULD ATTEND */}
      <section className="w-full py-16 bg-surface-container-low border-b border-border">
        <div className="max-w-(--container-max) mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-10">
            <div className="max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-widest text-primary">
                Cohort Profile
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mt-1">
                Who Should Attend?
              </h2>
              <p className="text-sm sm:text-base text-foreground-muted mt-2">
                Designed for ambitious student engineers who want to accelerate their development journey with industry mentors.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {workshop.personas.map((p) => (
                <div
                  key={p.role}
                  className="bg-white p-6 rounded-2xl border border-border shadow-xs flex flex-col justify-between gap-4"
                >
                  <div className="flex flex-col gap-2">
                    <span className="px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed-variant text-xs font-bold self-start">
                      {p.badge}
                    </span>
                    <h3 className="text-lg font-bold text-foreground mt-2">{p.role}</h3>
                    <p className="text-sm text-foreground-muted leading-relaxed">
                      {p.description}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-container-low border border-border/50 text-xs text-foreground-muted">
                    <strong className="text-foreground block font-semibold mb-0.5">
                      Key Takeaway:
                    </strong>
                    {p.gain}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: PREREQUISITES & PREPARATION */}
      <section className="w-full py-16 bg-white border-b border-border">
        <div className="max-w-(--container-max) mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-10">
            <div className="text-center max-w-2xl mx-auto flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-primary">
                Preparation Checklist
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                Prerequisites &amp; What to Prepare
              </h2>
              <p className="text-sm sm:text-base text-foreground-muted">
                Make sure your hardware, tools, and accounts are configured prior to Saturday morning check-in.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {workshop.prepRequirements.map((req) => (
                <div
                  key={req.category}
                  className="bg-surface-container-low/50 p-5 rounded-2xl border border-border flex flex-col gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[22px]">{req.icon}</span>
                  </div>
                  <h3 className="text-sm font-bold text-foreground">{req.category}</h3>
                  <ul className="flex flex-col gap-2 text-xs text-foreground-muted pt-1">
                    {req.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-1.5 leading-snug">
                        <span className="text-primary font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: FAQ ACCORDION WITH FILTER */}
      <section className="w-full py-16 bg-surface-container-low border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8">
            <div className="text-center flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-primary">
                Got Questions?
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                Frequently Asked Questions
              </h2>
              <p className="text-sm sm:text-base text-foreground-muted">
                Find answers about venue location, eligibility, laptop setup, and digital attendance badges.
              </p>
            </div>

            {/* Filter Tabs & Search */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto p-1 bg-surface-container rounded-full border border-border/50">
                {faqCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedFaqCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      selectedFaqCategory === cat
                        ? "bg-primary text-on-primary font-semibold shadow-xs"
                        : "text-foreground-muted hover:text-foreground"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="w-full sm:flex-1 relative">
                <input
                  type="text"
                  value={faqSearch}
                  onChange={(e) => setFaqSearch(e.target.value)}
                  placeholder="Search FAQ..."
                  className="w-full h-10 pl-9 pr-4 rounded-full border border-border bg-white text-xs sm:text-sm text-foreground focus:outline-hidden focus:border-primary"
                />
                <span className="material-symbols-outlined text-[18px] text-foreground-muted absolute left-3 top-2.5">
                  search
                </span>
              </div>
            </div>

            {/* Accordion List */}
            <div className="flex flex-col gap-3">
              {filteredFaq.length === 0 ? (
                <div className="text-center py-8 text-foreground-muted text-sm">
                  No questions found matching your search.
                </div>
              ) : (
                filteredFaq.map((item, index) => {
                  const isOpen = openFaqIndex === index;
                  return (
                    <div
                      key={item.question}
                      className="bg-white rounded-xl border border-border overflow-hidden transition-all shadow-xs"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                        className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left font-semibold text-sm sm:text-base text-foreground hover:bg-surface-container-low transition-colors"
                      >
                        <span>{item.question}</span>
                        <span
                          className={`material-symbols-outlined text-foreground-muted transition-transform duration-200 ${
                            isOpen ? "rotate-180 text-primary" : ""
                          }`}
                        >
                          expand_more
                        </span>
                      </button>
                      {isOpen ? (
                        <div className="px-5 pb-4 pt-1 text-xs sm:text-sm text-foreground-muted leading-relaxed border-t border-border/40">
                          {item.answer}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FINAL REGISTRATION BANNER */}
      <section className="w-full py-16 bg-white">
        <div className="max-w-(--container-max) mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-primary-fixed/40 via-surface-container to-secondary-fixed/30 rounded-3xl p-8 sm:p-12 border border-border flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm">
            <div className="flex flex-col gap-2 max-w-xl text-center md:text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Limited Seating Available
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                Ready to Architect at Scale?
              </h2>
              <p className="text-sm sm:text-base text-foreground-muted">
                Join 150 student developers, industry architects, and Google Developer Experts for four days of building real production systems.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
              <Link
                href={`/events/${event.slug}/register`}
                className="inline-flex items-center justify-center gap-2 bg-primary text-on-primary px-8 py-3.5 rounded-full font-semibold text-sm shadow-md hover:bg-primary-hover transition-all"
              >
                <span>Register for Workshop</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
              <Link
                href={`/events/${event.slug}/speakers`}
                className="inline-flex items-center justify-center gap-2 bg-white text-foreground px-6 py-3.5 rounded-full font-semibold text-sm border border-border hover:bg-surface-container transition-all"
              >
                <span>Meet Instructors</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

