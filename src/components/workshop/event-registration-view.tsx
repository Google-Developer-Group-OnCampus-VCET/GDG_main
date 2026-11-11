"use client";

import { useState } from "react";
import type { ChapterEvent, RegistrationRecord, WorkshopDetails } from "@/types";
import { formatEventDateRange } from "@/lib/events";

interface EventRegistrationViewProps {
  event: ChapterEvent;
  workshop: WorkshopDetails;
  stats?: {
    totalRegistered: number;
    capacity: number;
    remaining: number;
    percentFilled: number;
    isOpen: boolean;
  };
}

export function EventRegistrationView({
  event,
  workshop,
  stats,
}: EventRegistrationViewProps) {
  const initialRemaining = stats?.remaining ?? 26;
  const isRegistrationOpen = stats?.isOpen ?? workshop.registrationConfig.isOpen;

  // Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [college, setCollege] = useState(
    "Vidyavardhini's College of Engineering & Technology"
  );
  const [department, setDepartment] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState("3rd Year");
  const [track, setTrack] = useState(workshop.registrationConfig.tracks[0]?.name ?? "Track A: Modern Web & Gemini AI");
  const [experienceLevel, setExperienceLevel] = useState("Intermediate");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [agreedToCoc, setAgreedToCoc] = useState(false);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmedRegistration, setConfirmedRegistration] = useState<RegistrationRecord | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewPassMode, setPreviewPassMode] = useState(false);

  // Calculate live progress percentage
  let filledCount = 0;
  if (fullName.trim()) filledCount++;
  if (email.trim()) filledCount++;
  if (phone.trim()) filledCount++;
  if (college.trim()) filledCount++;
  if (department) filledCount++;
  if (yearOfStudy) filledCount++;
  if (track) filledCount++;
  if (experienceLevel) filledCount++;
  if (agreedToCoc) filledCount += 2;

  const progressPercent = Math.min(100, Math.round((filledCount / 10) * 100));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!agreedToCoc) {
      setSubmitError("Please agree to the GDG Code of Conduct to proceed.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/events/${event.slug}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          college,
          department,
          yearOfStudy,
          track,
          experienceLevel,
          portfolioUrl,
          notes,
          agreedToCoc,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.message || "Registration failed. Please check your inputs.");
        setSubmitting(false);
        return;
      }

      setConfirmedRegistration(data.registration);
      setQrDataUrl(typeof data.qrDataUrl === "string" ? data.qrDataUrl : null);
      setPreviewPassMode(false);
      setIsModalOpen(true);
      setSubmitting(false);
    } catch {
      setSubmitError("Network connection error. Please try again.");
      setSubmitting(false);
    }
  }

  function handleOpenPreviewPass() {
    setPreviewPassMode(true);
    setIsModalOpen(true);
  }

  const activePass = confirmedRegistration ?? {
    id: "preview",
    eventSlug: event.slug,
    referenceId: "GDG-VCET-2025-0842",
    fullName: fullName.trim() || "Atharva Joshi",
    email: email.trim() || "atharva.joshi@vcet.edu.in",
    phone: phone.trim() || "+91 98765 43210",
    college: college.trim() || "Vidyavardhini's College of Engineering & Technology",
    department: department || "Computer Engg",
    yearOfStudy: yearOfStudy || "3rd Year",
    track: track || "Track A: Modern Web & Gemini AI",
    experienceLevel: experienceLevel || "Intermediate",
    status: "confirmed" as const,
    checkedIn: false,
    createdAt: "2026-11-20T09:00:00.000Z",
  };

  return (
    <div className="flex flex-col w-full bg-surface">
      {/* SECTION 1: HERO */}
      <section className="relative w-full overflow-hidden border-b border-border bg-gradient-to-b from-white via-surface-container-low to-surface py-12 lg:py-20">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none"></div>
        <div className="absolute top-1/2 -right-32 w-96 h-96 rounded-full bg-secondary/10 blur-3xl pointer-events-none"></div>

        <div className="max-w-(--container-max) mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 flex flex-col gap-6 text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-white px-4 py-1.5 rounded-full border border-border shadow-xs w-fit">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-tertiary"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#fbbc04]"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
                </span>
                <span className="text-xs sm:text-sm font-semibold text-foreground tracking-wide">
                  ⚡ {workshop.badgeText}
                </span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.15]">
                DevCraft: Architecting Scale with{" "}
                <span className="text-primary">Modern Web</span>,{" "}
                <span className="text-secondary">Cloud</span> &amp;{" "}
                <span className="text-tertiary">AI</span>
              </h1>

              {/* Subheading */}
              <p className="text-base sm:text-lg text-foreground-muted max-w-2xl leading-relaxed">
                {workshop.subheading}
              </p>

              {/* Metadata Bar */}
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-foreground-muted font-medium">
                <div className="flex items-center gap-1.5 bg-surface-container px-3.5 py-1.5 rounded-full">
                  <span className="material-symbols-outlined text-[18px] text-primary">calendar_month</span>
                  <span>{workshop.datesText}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-surface-container px-3.5 py-1.5 rounded-full">
                  <span className="material-symbols-outlined text-[18px] text-tertiary">location_on</span>
                  <span>{workshop.venueText}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-surface-container px-3.5 py-1.5 rounded-full">
                  <span className="material-symbols-outlined text-[18px] text-[#fbbc04]">confirmation_number</span>
                  <span className="text-foreground font-semibold">{workshop.seatsText}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-surface-container px-3.5 py-1.5 rounded-full">
                  <span className="material-symbols-outlined text-[18px] text-secondary">devices</span>
                  <span>Offline Labs</span>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href="#registration-form"
                  className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-full text-sm font-semibold shadow-sm hover:bg-primary-hover transition-all"
                >
                  <span>Register for Workshop</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
                </a>
                <button
                  type="button"
                  onClick={handleOpenPreviewPass}
                  className="inline-flex items-center gap-2 bg-white text-foreground px-5 py-3 rounded-full text-sm font-semibold border border-border hover:bg-surface-container transition-all"
                >
                  <span className="material-symbols-outlined text-[18px] text-secondary">badge</span>
                  <span>Preview Attendee Pass</span>
                </button>
              </div>

              {/* Live stats micro-bar — only shown when we have a real count, never a placeholder number */}
              {stats ? (
                <div className="flex items-center gap-3 pt-2">
                  <span className="material-symbols-outlined text-[20px] text-secondary">group</span>
                  <p className="text-xs sm:text-sm text-foreground-muted">
                    <strong className="text-foreground font-semibold">{stats.totalRegistered}</strong>{" "}
                    {stats.totalRegistered === 1 ? "developer" : "developers"} registered so far
                  </p>
                </div>
              ) : null}
            </div>

            {/* Right Visual / Stylized Isometric Graphic */}
            <div className="lg:col-span-5 relative flex justify-center">
              <div className="relative w-full max-w-md aspect-square bg-white rounded-3xl border border-border shadow-lg p-6 flex flex-col justify-between overflow-hidden">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-tertiary"></span>
                    <span className="w-3 h-3 rounded-full bg-[#fbbc04]"></span>
                    <span className="w-3 h-3 rounded-full bg-secondary"></span>
                  </div>
                  <span className="text-xs font-mono bg-surface-container px-2.5 py-1 rounded-full text-foreground-muted">
                    {workshop.heroGraphic?.terminalLabel ?? "devcraft_2025.sh"}
                  </span>
                </div>

                {/* Vector Architecture composition */}
                <div className="my-auto flex flex-col items-center justify-center py-4 relative">
                  <svg
                    className="w-full max-w-[280px] h-auto drop-shadow-sm"
                    fill="none"
                    viewBox="0 0 400 320"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M200 40 L360 130 L200 220 L40 130 Z" fill="#EEF2F6" stroke="#D8E2FF" strokeWidth="2" />
                    <path d="M200 40 L200 220" stroke="#E2E8F0" strokeDasharray="4 4" strokeWidth="1.5" />
                    <path d="M40 130 L360 130" stroke="#E2E8F0" strokeDasharray="4 4" strokeWidth="1.5" />

                    <g transform="translate(130, 70)">
                      <rect className="drop-shadow-md" fill="#1A73E8" height="90" rx="16" width="140" x="0" y="0" />
                      <text fill="#FFFFFF" fontFamily="system-ui, sans-serif" fontSize="13" fontWeight="700" textAnchor="middle" x="70" y="38">
                        CLOUD &amp; WEB
                      </text>
                      <text fill="#ADC6FF" fontFamily="system-ui, sans-serif" fontSize="11" textAnchor="middle" x="70" y="60">
                        React 19 • Cloud Run
                      </text>
                      <circle cx="70" cy="78" fill="#89FA9B" r="4" />
                    </g>

                    <g transform="translate(50, 160)">
                      <path d="M40 0 L80 20 L40 40 L0 20 Z" fill="#D9372B" />
                      <path d="M0 20 L40 40 L40 70 L0 50 Z" fill="#B51B15" />
                      <path d="M80 20 L40 40 L40 70 L80 50 Z" fill="#930004" />
                      <text fill="#FFFFFF" fontFamily="system-ui, sans-serif" fontSize="9" fontWeight="700" textAnchor="middle" x="40" y="32">
                        GEMINI
                      </text>
                    </g>

                    <g transform="translate(250, 150)">
                      <path d="M40 0 L80 20 L40 40 L0 20 Z" fill="#86F898" />
                      <path d="M0 20 L40 40 L40 70 L0 50 Z" fill="#006E2C" />
                      <path d="M80 20 L40 40 L40 70 L80 50 Z" fill="#005320" />
                      <text fill="#002108" fontFamily="system-ui, sans-serif" fontSize="9" fontWeight="700" textAnchor="middle" x="40" y="32">
                        GCP CI/CD
                      </text>
                    </g>

                    <g transform="translate(170, 195)">
                      <rect className="drop-shadow-xs" fill="#FBBC04" height="50" rx="10" width="60" x="0" y="0" />
                      <text fill="#3D2900" fontFamily="system-ui, sans-serif" fontSize="10" fontWeight="700" textAnchor="middle" x="30" y="24">
                        K8s
                      </text>
                      <text fill="#5E4200" fontFamily="system-ui, sans-serif" fontSize="9" textAnchor="middle" x="30" y="38">
                        Docker
                      </text>
                    </g>

                    <path d="M90 180 Q200 130 290 170" fill="none" stroke="#1A73E8" strokeDasharray="6 4" strokeWidth="2.5" />
                  </svg>
                </div>

                <div className="bg-surface-container px-4 py-2.5 rounded-2xl flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-[22px]">verified</span>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-foreground">100% Free For Students</span>
                      <span className="text-[11px] text-foreground-muted">Verified GDG Certificate Included</span>
                    </div>
                  </div>
                  <span className="bg-secondary-fixed text-on-secondary-fixed text-xs px-2.5 py-0.5 rounded-full font-bold">
                    {workshop.heroGraphic?.versionBadge ?? "BATCH '25"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: WORKSHOP REGISTRATION FORM */}
      <section className="w-full py-16 bg-surface-container-low border-b border-border scroll-mt-28" id="registration-form">
        <div className="max-w-(--container-max) mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Form Left: Progress Summary & Live Counters */}
            <div className="lg:col-span-4 flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Fast Registration
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                  Claim Your DevCraft Seat
                </h2>
                <p className="text-sm text-foreground-muted leading-relaxed">
                  Workshop registration is completely free. Seating is capped at {workshop.capacity} developers to guarantee dedicated mentor ratios in lab sessions.
                </p>
              </div>

              {/* Progress Indicator Card */}
              <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex flex-col gap-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-foreground">Form Completion</span>
                  <span className="font-bold text-primary">{progressPercent}%</span>
                </div>
                <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
                <div className="flex flex-col gap-2 pt-1 text-xs text-foreground-muted">
                  <div className="flex items-center gap-2">
                    <span
                      className={`material-symbols-outlined text-[18px] ${
                        fullName && email && phone ? "text-secondary" : "text-border"
                      }`}
                    >
                      check_circle
                    </span>
                    <span>Personal details</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`material-symbols-outlined text-[18px] ${
                        department && yearOfStudy ? "text-secondary" : "text-border"
                      }`}
                    >
                      check_circle
                    </span>
                    <span>Academic background</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`material-symbols-outlined text-[18px] ${
                        track && experienceLevel ? "text-secondary" : "text-border"
                      }`}
                    >
                      check_circle
                    </span>
                    <span>Track preference</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`material-symbols-outlined text-[18px] ${
                        agreedToCoc ? "text-secondary" : "text-border"
                      }`}
                    >
                      check_circle
                    </span>
                    <span>Instant QR pass confirmation</span>
                  </div>
                </div>
              </div>

              {/* Live Seats Counter Banner */}
              <div className="bg-white p-4 rounded-2xl border border-border shadow-xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-tertiary-fixed flex items-center justify-center text-tertiary shrink-0">
                  <span className="material-symbols-outlined text-[20px]">timer</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-foreground">
                    Only {initialRemaining} Lab Seats Remaining
                  </span>
                  <span className="text-xs text-foreground-muted">
                    Direct entry pass issued immediately upon submission
                  </span>
                </div>
              </div>

              {/* College Priority Card */}
              <div className="p-4 rounded-2xl bg-surface-container border border-border/60 text-xs text-foreground-muted flex items-start gap-2.5">
                <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">school</span>
                <span>
                  Priority access is guaranteed for VCET students. Cross-college engineering students from Mumbai University are also welcomed.
                </span>
              </div>

              {/* Digital Pass Preview Card Button */}
              <button
                type="button"
                onClick={handleOpenPreviewPass}
                className="p-4 rounded-2xl bg-white border border-border shadow-xs flex flex-col gap-2 text-left hover:border-primary transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-primary"></span>
                    <span className="w-2 h-2 rounded-full bg-secondary"></span>
                    <span className="text-xs font-bold text-foreground ml-1">Digital Pass Preview</span>
                  </div>
                  <span className="bg-secondary-fixed text-on-secondary-fixed text-[10px] px-2 py-0.5 rounded-full font-bold">
                    SAMPLE
                  </span>
                </div>
                <p className="text-xs text-foreground-muted">
                  Click to inspect the verifiable digital attendee badge with QR check-in code.
                </p>
              </button>
            </div>

            {/* Form Right: Form Fields */}
            <div className="lg:col-span-8 bg-white p-6 sm:p-8 rounded-3xl border border-border shadow-sm">
              {!isRegistrationOpen ? (
                <div className="text-center py-12 flex flex-col items-center gap-3">
                  <span className="material-symbols-outlined text-[48px] text-tertiary">lock</span>
                  <h3 className="text-xl font-bold text-foreground">Registration is Closed</h3>
                  <p className="text-sm text-foreground-muted max-w-md">
                    Seating for this cohort is currently at maximum capacity. Please check back for updates or join our community discord for waitlist announcements.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                  {/* Error Notification */}
                  {submitError ? (
                    <div className="p-4 rounded-xl bg-status-error/10 border border-status-error/30 text-status-error text-sm flex items-center gap-2">
                      <span className="material-symbols-outlined text-[20px] shrink-0">error</span>
                      <span>{submitError}</span>
                    </div>
                  ) : null}

                  {/* Section 1: Basic Information */}
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 pb-1 border-b border-border/40">
                      <span className="w-2 h-2 rounded-full bg-primary"></span>
                      <h3 className="text-base font-bold text-foreground">
                        1. Personal &amp; Contact Details
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Full Name */}
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="fullName" className="text-xs font-bold text-foreground">
                          Full Name <span className="text-tertiary">*</span>
                        </label>
                        <input
                          id="fullName"
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Atharva Joshi"
                          className="h-11 px-3.5 rounded-lg border border-border bg-surface-container-low text-sm text-foreground focus:outline-hidden focus:border-primary focus:bg-white transition-all"
                        />
                      </div>

                      {/* Email */}
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="email" className="text-xs font-bold text-foreground">
                          College / Professional Email <span className="text-tertiary">*</span>
                        </label>
                        <input
                          id="email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@vcet.edu.in"
                          className="h-11 px-3.5 rounded-lg border border-border bg-surface-container-low text-sm text-foreground focus:outline-hidden focus:border-primary focus:bg-white transition-all"
                        />
                      </div>

                      {/* Phone */}
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="phone" className="text-xs font-bold text-foreground">
                          WhatsApp / Contact Number <span className="text-tertiary">*</span>
                        </label>
                        <input
                          id="phone"
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="h-11 px-3.5 rounded-lg border border-border bg-surface-container-low text-sm text-foreground focus:outline-hidden focus:border-primary focus:bg-white transition-all"
                        />
                      </div>

                      {/* College Name */}
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="college" className="text-xs font-bold text-foreground">
                          College / University <span className="text-tertiary">*</span>
                        </label>
                        <input
                          id="college"
                          type="text"
                          required
                          value={college}
                          onChange={(e) => setCollege(e.target.value)}
                          className="h-11 px-3.5 rounded-lg border border-border bg-surface-container-low text-sm text-foreground focus:outline-hidden focus:border-primary focus:bg-white transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Academic Standing */}
                  <div className="flex flex-col gap-4 pt-2">
                    <div className="flex items-center gap-2 pb-1 border-b border-border/40">
                      <span className="w-2 h-2 rounded-full bg-secondary"></span>
                      <h3 className="text-base font-bold text-foreground">
                        2. Academic Standing
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Department */}
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="department" className="text-xs font-bold text-foreground">
                          Department / Branch <span className="text-tertiary">*</span>
                        </label>
                        <select
                          id="department"
                          required
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          className="h-11 px-3.5 rounded-lg border border-border bg-surface-container-low text-sm text-foreground focus:outline-hidden focus:border-primary focus:bg-white transition-all"
                        >
                          <option value="" disabled>Select Department</option>
                          {workshop.registrationConfig.departments.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>

                      {/* Year of Study Pills */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-foreground">
                          Current Year of Study <span className="text-tertiary">*</span>
                        </label>
                        <div className="grid grid-cols-4 gap-1.5 h-11">
                          {workshop.registrationConfig.yearsOfStudy.map((yr) => (
                            <label key={yr} className="cursor-pointer">
                              <input
                                type="radio"
                                name="yearOfStudy"
                                value={yr}
                                checked={yearOfStudy === yr}
                                onChange={(e) => setYearOfStudy(e.target.value)}
                                className="sr-only peer"
                              />
                              <span className="h-full flex items-center justify-center rounded-lg border border-border text-xs font-medium text-foreground-muted peer-checked:bg-primary peer-checked:text-on-primary peer-checked:border-primary transition-all">
                                {yr.replace(" Year", "")}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Workshop Track & Experience */}
                  <div className="flex flex-col gap-4 pt-2">
                    <div className="flex items-center gap-2 pb-1 border-b border-border/40">
                      <span className="w-2 h-2 rounded-full bg-[#fbbc04]"></span>
                      <h3 className="text-base font-bold text-foreground">
                        3. Workshop Track Preference
                      </h3>
                    </div>

                    {/* Track Radio Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {workshop.registrationConfig.tracks.map((t) => (
                        <label key={t.id} className="cursor-pointer relative">
                          <input
                            type="radio"
                            name="track"
                            value={t.name}
                            checked={track === t.name}
                            onChange={(e) => setTrack(e.target.value)}
                            className="sr-only peer"
                          />
                          <div className="p-4 rounded-2xl border border-border bg-surface-container-low/50 peer-checked:bg-primary-fixed/40 peer-checked:border-primary transition-all flex flex-col gap-2 h-full">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                {t.badge}
                              </span>
                              <span className="material-symbols-outlined text-[20px] text-primary">
                                {t.icon}
                              </span>
                            </div>
                            <span className="text-sm font-bold text-foreground">{t.name}</span>
                            <p className="text-xs text-foreground-muted leading-relaxed">
                              {t.description}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>

                    {/* Experience Level */}
                    <div className="flex flex-col gap-2 pt-1">
                      <label className="text-xs font-bold text-foreground">
                        Technical Experience Level <span className="text-tertiary">*</span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {workshop.registrationConfig.experienceLevels.map((lvl) => (
                          <label key={lvl} className="cursor-pointer">
                            <input
                              type="radio"
                              name="experienceLevel"
                              value={lvl.split(" ")[0]}
                              checked={experienceLevel === lvl.split(" ")[0]}
                              onChange={(e) => setExperienceLevel(e.target.value)}
                              className="sr-only peer"
                            />
                            <span className="inline-block px-3.5 py-1.5 rounded-full border border-border bg-surface-container text-foreground-muted text-xs font-medium peer-checked:bg-foreground peer-checked:text-white peer-checked:border-foreground transition-all">
                              {lvl}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Supplementary Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="portfolioUrl" className="text-xs font-bold text-foreground">
                        GitHub or LinkedIn Profile <span className="text-foreground-muted font-normal">(Optional)</span>
                      </label>
                      <input
                        id="portfolioUrl"
                        type="url"
                        value={portfolioUrl}
                        onChange={(e) => setPortfolioUrl(e.target.value)}
                        placeholder="https://github.com/username"
                        className="h-11 px-3.5 rounded-lg border border-border bg-surface-container-low text-sm text-foreground focus:outline-hidden focus:border-primary focus:bg-white transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="notes" className="text-xs font-bold text-foreground">
                        Dietary / Accessibility Needs <span className="text-foreground-muted font-normal">(Optional)</span>
                      </label>
                      <input
                        id="notes"
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Any questions or special requests"
                        className="h-11 px-3.5 rounded-lg border border-border bg-surface-container-low text-sm text-foreground focus:outline-hidden focus:border-primary focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  {/* Agreement Checkbox */}
                  <div className="flex items-start gap-2.5 pt-2">
                    <input
                      id="coc-agree"
                      type="checkbox"
                      required
                      checked={agreedToCoc}
                      onChange={(e) => setAgreedToCoc(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="coc-agree" className="text-xs text-foreground-muted leading-relaxed cursor-pointer">
                      I agree to adhere to the{" "}
                      <span className="text-primary font-semibold">GDG Community Guidelines</span> and
                      Code of Conduct. I understand that workshop seats are strictly limited and promise to notify the organizers if I cannot attend.
                    </label>
                  </div>

                  {/* Submit Button */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/40">
                    <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
                      <span className="material-symbols-outlined text-[16px] text-secondary">lock</span>
                      <span>Protected by GDG on Campus VCET Privacy Standards</span>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary text-on-primary px-8 py-3.5 rounded-full font-semibold text-sm shadow-md hover:bg-primary-hover transition-all disabled:opacity-50"
                    >
                      {submitting ? (
                        <span>Processing Registration...</span>
                      ) : (
                        <>
                          <span>Complete Free Registration</span>
                          <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CONFIRMATION / QR MODAL OVERLAY */}
      {isModalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white w-full max-w-xl rounded-3xl border border-border shadow-2xl overflow-hidden relative my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Google Colors Stripe */}
            <div className="h-2 w-full bg-gradient-to-r from-primary via-tertiary to-secondary"></div>

            <div className="p-6 sm:p-8 flex flex-col gap-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-tertiary"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#fbbc04]"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
                  <span className="text-xs font-bold text-foreground ml-1 uppercase tracking-wider">
                    {previewPassMode ? "Sample Pass Preview" : "Official GDG VCET Attendee Pass"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high text-foreground-muted flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {/* Success Notification if live submitted */}
              {!previewPassMode && confirmedRegistration ? (
                <div className="p-3.5 rounded-xl bg-status-success/10 border border-status-success/30 text-status-success text-xs sm:text-sm font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">check_circle</span>
                  <span>Registration Confirmed! Your official seat is reserved.</span>
                </div>
              ) : null}

              {/* Pass Card */}
              <div className="rounded-2xl border border-border bg-surface-container-low p-5 sm:p-6 shadow-xs flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                      GDG on Campus VCET
                    </span>
                    <h3 className="text-lg font-bold text-foreground">
                      {event.title}
                    </h3>
                  </div>
                  <span className="bg-secondary-fixed text-on-secondary-fixed text-[11px] px-2.5 py-1 rounded-full font-bold uppercase shrink-0">
                    ALL-ACCESS PASS
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-b border-border/60 py-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">
                      Attendee
                    </span>
                    <span className="text-base font-bold text-foreground">
                      {activePass.fullName}
                    </span>
                    <span className="text-xs text-foreground-muted">
                      {activePass.department} · {activePass.yearOfStudy}
                    </span>
                    <span className="text-xs text-primary font-medium mt-0.5 truncate">
                      {activePass.college}
                    </span>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">
                      Assigned Track
                    </span>
                    <span className="text-sm font-bold text-secondary">
                      {activePass.track}
                    </span>
                    <span className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mt-1.5">
                      Pass Ref ID
                    </span>
                    <span className="font-mono font-bold text-sm text-foreground bg-white px-2 py-0.5 rounded border border-border inline-block self-start">
                      #{activePass.referenceId}
                    </span>
                  </div>
                </div>

                {/* Footer details + QR Code */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
                  <div className="flex flex-col gap-1.5 text-xs text-foreground-muted">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-tertiary">calendar_month</span>
                      <span>{formatEventDateRange(event)}</span>
                    </div>
                    {event.location ? (
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-primary">location_on</span>
                        <span>{event.location}</span>
                      </div>
                    ) : null}
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-secondary">qr_code_scanner</span>
                      <span>Fast Entrance Check-in Enabled</span>
                    </div>
                  </div>

                  {/* QR code: a real encoding of this pass's reference ID once registration is
                      confirmed (generated server-side); a clearly-labeled sample placeholder
                      while only previewing. */}
                  <div className="bg-white p-2 rounded-xl border border-border shadow-xs flex flex-col items-center shrink-0">
                    {!previewPassMode && qrDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- data: URL, not an optimizable remote image
                      <img src={qrDataUrl} alt={`QR code for pass ${activePass.referenceId}`} className="w-24 h-24" />
                    ) : (
                      <div className="w-24 h-24 rounded-lg border border-dashed border-border flex items-center justify-center text-center p-2">
                        <span className="text-[10px] text-foreground-muted">
                          Sample only — a real QR code is issued after you register
                        </span>
                      </div>
                    )}
                    <span className="font-mono text-[9px] text-foreground-muted font-bold mt-1">
                      SCAN AT ENTRANCE
                    </span>
                  </div>
                </div>
              </div>

              {/* Pass Actions */}
              <div className="flex flex-wrap items-center gap-3">
                {!previewPassMode && confirmedRegistration ? (
                  <a
                    href={`/api/events/${event.slug}/register/pass?referenceId=${encodeURIComponent(confirmedRegistration.referenceId)}`}
                    download
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-on-primary py-2.5 px-4 rounded-full text-xs font-semibold hover:bg-primary-hover transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    <span>Download Pass (PDF)</span>
                  </a>
                ) : (
                  <span className="flex-1 inline-flex items-center justify-center gap-2 bg-surface-container text-foreground-muted py-2.5 px-4 rounded-full text-xs font-semibold border border-border cursor-not-allowed">
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    <span>Download available after registering</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

