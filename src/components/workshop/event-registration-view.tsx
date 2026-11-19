"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { generatePassPdfBytes } from "@/lib/pass-pdf";
import type { ChapterEvent, RegistrationRecord, WorkshopDetails } from "@/types";

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
  const capacity = stats?.capacity ?? event.capacity ?? workshop.capacity;
  const seatsText = `Limited to ${capacity} Seats`;
  const [remainingSeats, setRemainingSeats] = useState(
    stats?.remaining ?? Math.max(0, capacity - workshop.initialRegisteredCount)
  );
  const isRegistrationOpen = (stats?.isOpen ?? workshop.registrationConfig.isOpen) && remainingSeats > 0;

  // Form State — Streamlined & Mobile-Native
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [college, setCollege] = useState("");
  const [department, setDepartment] = useState(
    workshop.registrationConfig?.departments?.[0] ?? "Computer Engg"
  );
  const [yearOfStudy, setYearOfStudy] = useState(
    workshop.registrationConfig?.yearsOfStudy?.includes("3rd Year")
      ? "3rd Year"
      : workshop.registrationConfig?.yearsOfStudy?.[0] ?? "1st Year"
  );
  const [experienceLevel, setExperienceLevel] = useState(
    workshop.registrationConfig?.experienceLevels?.includes("Intermediate")
      ? "Intermediate"
      : workshop.registrationConfig?.experienceLevels?.[0] ?? "Beginner"
  );
  const [track] = useState("4-Day All-Access");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [agreedToCoc, setAgreedToCoc] = useState(false);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmedRegistration, setConfirmedRegistration] = useState<RegistrationRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [emailingPass, setEmailingPass] = useState(false);
  const [emailPassResult, setEmailPassResult] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!agreedToCoc) {
      setSubmitError("Please agree to the GDG Code of Conduct to proceed.");
      return;
    }

    setSubmitting(true);

    const resolvedCollege = college.trim() || "Vidyavardhini's College of Engineering & Technology (VCET)";

    try {
      const res = await fetch(`/api/events/${event.slug}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          college: resolvedCollege,
          department,
          yearOfStudy,
          track,
          experienceLevel,
          portfolioUrl: portfolioUrl.trim() || undefined,
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
      setRemainingSeats((prev) => Math.max(0, prev - 1));
      setIsModalOpen(true);
      setSubmitting(false);
    } catch {
      setSubmitError("Network connection error. Please try again.");
      setSubmitting(false);
    }
  }

  async function handleDownloadPass() {
    const pdfBytes = await generatePassPdfBytes({
      eventTitle: event.title,
      datesText: workshop.datesText,
      venueText: workshop.venueText,
      registration: activePass,
    });
    const blob = new Blob([Uint8Array.from(pdfBytes)], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gdg-vcet-pass-${activePass.referenceId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  }

  async function handleEmailSelfPass() {
    if (!confirmedRegistration) return;

    setEmailingPass(true);
    setEmailPassResult(null);

    try {
      const res = await fetch(`/api/events/${event.slug}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "self-send",
          referenceId: confirmedRegistration.referenceId,
          email: confirmedRegistration.email,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setEmailPassResult(`Pass successfully emailed to ${confirmedRegistration.email}!`);
      } else {
        setEmailPassResult(data.message || "Failed to send email.");
      }
    } catch {
      setEmailPassResult("Network error sending pass email.");
    } finally {
      setEmailingPass(false);
      setTimeout(() => setEmailPassResult(null), 4000);
    }
  }

  const activePass = confirmedRegistration ?? {
    id: "preview",
    eventSlug: event.slug,
    referenceId: "GDG-VCET-2026-0842",
    fullName: fullName.trim() || "John Doe",
    email: email.trim() || "john.doe@example.com",
    phone: phone.trim() || "+91 98765 43210",
    college: college.trim() || "Vidyavardhini's College of Engineering & Technology (VCET)",
    department: department || workshop.registrationConfig?.departments?.[0] || "Computer Engg",
    yearOfStudy: yearOfStudy || workshop.registrationConfig?.yearsOfStudy?.[0] || "3rd Year",
    track: track || workshop.registrationConfig?.tracks?.[0]?.name || "General Admission",
    experienceLevel: experienceLevel || workshop.registrationConfig?.experienceLevels?.[0] || "Intermediate",
    status: "confirmed" as const,
    checkedIn: false,
    createdAt: "2026-11-20T09:00:00.000Z",
  };

  useEffect(() => {
    if (!isModalOpen) return;
    let cancelled = false;
    QRCode.toDataURL(activePass.referenceId, {
      width: 200,
      margin: 1,
      color: { dark: "#1A1B1E", light: "#FFFFFF" },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl("");
      });
    return () => {
      cancelled = true;
    };
  }, [isModalOpen, activePass.referenceId]);

  return (
    <div className="flex flex-col w-full bg-surface">
      {/* SECTION 1: HERO */}
      <section className="relative w-full overflow-hidden border-b border-border bg-gradient-to-b from-white via-surface-container-low to-surface py-12 lg:py-16">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none"></div>
        <div className="absolute top-1/2 -right-32 w-96 h-96 rounded-full bg-secondary/10 blur-3xl pointer-events-none"></div>

        <div className="max-w-(--container-max) mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 flex flex-col gap-5 text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-full border border-border shadow-2xs w-fit">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4285f4]"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ea4335]"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#fbbc04]"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#34a853]"></span>
                </span>
                <span className="text-xs sm:text-sm font-semibold text-foreground tracking-wide">
                  {workshop.badgeText}
                </span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.15]">
                {event.title || workshop.headline}
              </h1>

              {/* Subheading */}
              <p className="text-sm sm:text-base text-foreground-muted max-w-2xl leading-relaxed">
                {event.summary || workshop.subheading}
              </p>

              {/* Metadata Bar */}
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-foreground-muted font-medium">
                <div className="flex items-center gap-1.5 bg-surface-container px-3.5 py-1.5 rounded-full">
                  <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span>{workshop.datesText}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-surface-container px-3.5 py-1.5 rounded-full">
                  <svg className="w-4 h-4 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>{workshop.venueText}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-surface-container px-3.5 py-1.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-foreground font-semibold">{seatsText}</span>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-1 w-full sm:w-auto">
                <a
                  href="#registration-form"
                  className="inline-flex items-center justify-center gap-2 bg-primary text-on-primary px-6 py-3.5 rounded-full text-sm font-semibold shadow-sm hover:bg-primary-hover active:scale-95 transition-all cursor-pointer w-full sm:w-auto text-center"
                >
                  <span>Register for Workshop</span>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <polyline points="19 12 12 19 5 12" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Right Visual composition */}
            <div className="lg:col-span-5 relative flex justify-center w-full">
              <div className="relative w-full max-w-sm bg-white rounded-3xl border border-border shadow-md p-4 sm:p-5 flex flex-col justify-between overflow-hidden min-h-[220px]">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ea4335]"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#fbbc04]"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#34a853]"></span>
                  </div>
                  <span className="text-xs font-mono bg-surface-container px-2.5 py-0.5 rounded-full text-foreground-muted">
                    {workshop.heroGraphic?.terminalLabel || `${event.slug}.sh`}
                  </span>
                </div>

                <div className="my-auto flex flex-col gap-2 py-3 text-center">
                  <div className="text-xs font-bold text-primary uppercase tracking-wider">
                    {workshop.heroGraphic?.versionBadge || "Hands-On Technical Workshop"}
                  </div>
                  <div className="text-xl font-bold text-foreground">
                    {event.title || workshop.headline}
                  </div>
                  <div className="text-xs text-foreground-muted">
                    {workshop.datesText} &bull; {seatsText}
                  </div>
                </div>

                <div className="bg-surface-container px-3.5 py-2 rounded-xl flex items-center justify-center text-xs">
                  <span className="font-semibold text-emerald-800">
                    {event.priceNote || (workshop.registrationConfig.price === 0 ? "100% Free For Students" : `${workshop.registrationConfig.currency} ${workshop.registrationConfig.price}`)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: FAST MOBILE-NATIVE REGISTRATION FORM */}
      <section
        className="w-full py-8 sm:py-16 bg-surface-container-low border-b border-border scroll-mt-20"
        id="registration-form"
      >
        <div className="max-w-xl mx-auto px-3 sm:px-6">
          <div className="flex flex-col gap-5 sm:gap-6">
            {/* Header with live seat counter */}
            <div className="text-center flex flex-col items-center gap-2">
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-3.5 py-1 rounded-full text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                <span>Fast Registration &bull; Only {remainingSeats} Seats Left</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Claim Your Event Pass
              </h2>
              <p className="text-xs sm:text-sm text-foreground-muted max-w-md">
                Quick 30-second sign-up. Direct QR admission pass generated instantly upon submission.
              </p>
            </div>

            {/* Mobile Native Registration Card */}
            <div className="bg-white p-4 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50 flex flex-col gap-4 sm:gap-5 w-full">
              {!isRegistrationOpen ? (
                <div className="text-center py-10 flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-foreground">Registration is Closed</h3>
                  <p className="text-xs text-foreground-muted max-w-sm">
                    {remainingSeats <= 0
                      ? `Event seating is at full capacity (${capacity}/${capacity}). Reach out to the chapter team for waitlist updates.`
                      : "Registration for this event is currently closed by the organizers."}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-5 w-full">
                  {/* Error Notification */}
                  {submitError ? (
                    <div
                      role="alert"
                      className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2.5"
                    >
                      <svg className="w-4 h-4 shrink-0 text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span>{submitError}</span>
                    </div>
                  ) : null}

                  {/* 1. Full Name */}
                  <div className="flex flex-col gap-1.5 text-left w-full">
                    <label htmlFor="fullName" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      required
                      autoComplete="name"
                      enterKeyHint="next"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full h-12 px-3.5 sm:px-4 rounded-xl border border-slate-300 bg-slate-50/50 text-base text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-primary focus:outline-hidden focus:ring-4 focus:ring-primary/10 transition-all"
                    />
                  </div>

                  {/* 2. Contact Details (Email & Phone in Responsive Grid) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                    <div className="flex flex-col gap-1.5 text-left w-full">
                      <label htmlFor="email" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="email"
                        type="email"
                        required
                        inputMode="email"
                        autoComplete="email"
                        enterKeyHint="next"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john.doe@example.com"
                        className="w-full h-12 px-3.5 sm:px-4 rounded-xl border border-slate-300 bg-slate-50/50 text-base text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-primary focus:outline-hidden focus:ring-4 focus:ring-primary/10 transition-all"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 text-left w-full">
                      <label htmlFor="phone" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        WhatsApp / Phone <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="phone"
                        type="tel"
                        required
                        inputMode="tel"
                        autoComplete="tel"
                        enterKeyHint="next"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full h-12 px-3.5 sm:px-4 rounded-xl border border-slate-300 bg-slate-50/50 text-base text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-primary focus:outline-hidden focus:ring-4 focus:ring-primary/10 transition-all font-mono"
                      />
                    </div>
                  </div>

                  {/* 3. College / Institution (Defaults to VCET if blank) */}
                  <div className="flex flex-col gap-1.5 text-left w-full">
                    <div className="flex items-center justify-between">
                      <label htmlFor="college" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        College / University
                      </label>
                      <span className="text-[11px] text-slate-400 font-medium">Defaults to VCET</span>
                    </div>
                    <input
                      id="college"
                      type="text"
                      autoComplete="organization"
                      enterKeyHint="next"
                      value={college}
                      onChange={(e) => setCollege(e.target.value)}
                      placeholder=""
                      className="w-full h-12 px-3.5 sm:px-4 rounded-xl border border-slate-300 bg-slate-50/50 text-base text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-primary focus:outline-hidden focus:ring-4 focus:ring-primary/10 transition-all"
                    />
                    <span className="text-[11px] text-slate-500">
                      Leave blank for VCET, or enter your college name if attending from another institute.
                    </span>
                  </div>

                  {/* 4. Academic Standing (Department & Year in 2-Column Grid) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                    <div className="flex flex-col gap-1.5 text-left w-full">
                      <label htmlFor="department" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Department / Branch <span className="text-rose-500">*</span>
                      </label>
                      <select
                        id="department"
                        required
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full h-12 px-3.5 rounded-xl border border-slate-300 bg-slate-50/50 text-base text-slate-900 focus:bg-white focus:border-primary focus:outline-hidden focus:ring-4 focus:ring-primary/10 transition-all"
                      >
                        {(workshop.registrationConfig?.departments || ["Computer Engg", "Information Tech", "AI & Data Science", "Other Engg"]).map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5 text-left w-full">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Year of Study <span className="text-rose-500">*</span>
                      </label>
                      <div className="grid grid-cols-4 gap-1.5 h-12 w-full">
                        {(workshop.registrationConfig?.yearsOfStudy || ["1st Year", "2nd Year", "3rd Year", "4th Year"]).map((yr) => (
                          <label key={yr} className="cursor-pointer">
                            <input
                              type="radio"
                              name="yearOfStudy"
                              value={yr}
                              checked={yearOfStudy === yr}
                              onChange={(e) => setYearOfStudy(e.target.value)}
                              className="sr-only peer"
                            />
                            <span className="h-full flex items-center justify-center rounded-xl border border-slate-300 text-[11px] sm:text-xs font-semibold text-slate-600 peer-checked:bg-primary peer-checked:text-white peer-checked:border-primary active:scale-95 transition-all text-center px-0.5">
                              {yr.replace(" Year", "")}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 5. Experience Level (Sourced from Firestore registrationConfig.experienceLevels) */}
                  {workshop.registrationConfig.experienceLevels &&
                  workshop.registrationConfig.experienceLevels.length > 0 ? (
                    <div className="flex flex-col gap-1.5 text-left w-full">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Experience Level <span className="text-rose-500">*</span>
                      </label>
                      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 h-11 sm:h-12 w-full">
                        {workshop.registrationConfig.experienceLevels.map((lvl) => (
                          <label key={lvl} className="cursor-pointer">
                            <input
                              type="radio"
                              name="experienceLevel"
                              value={lvl}
                              checked={experienceLevel === lvl}
                              onChange={(e) => setExperienceLevel(e.target.value)}
                              className="sr-only peer"
                            />
                            <span className="h-full flex items-center justify-center rounded-xl border border-slate-300 text-[11px] sm:text-xs font-semibold text-slate-600 peer-checked:bg-primary peer-checked:text-white peer-checked:border-primary active:scale-95 transition-all text-center px-1">
                              {lvl}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* 4-Day All-Access Pass Banner (All 4 workshop days included automatically) */}
                  <div className="flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-primary/5 via-secondary/5 to-surface-container border border-primary/20 text-xs text-left w-full">
                    <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-xs">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-xs sm:text-sm">4-Day All-Access Workshop Pass</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">Included</span>
                      </div>
                      <span className="text-[11px] text-foreground-muted">
                        Registration admits you to all 4 days (Dec 1–4, 2026). No track selection needed.
                      </span>
                    </div>
                  </div>

                  {/* 6. GitHub or LinkedIn Profile (Optional) */}
                  <div className="flex flex-col gap-1.5 text-left pt-1 w-full">
                    <div className="flex items-center justify-between">
                      <label htmlFor="portfolioUrl" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        GitHub / LinkedIn Profile
                      </label>
                      <span className="text-[11px] text-slate-400">Optional</span>
                    </div>
                    <input
                      id="portfolioUrl"
                      type="url"
                      inputMode="url"
                      autoComplete="url"
                      value={portfolioUrl}
                      onChange={(e) => setPortfolioUrl(e.target.value)}
                      placeholder="https://github.com/username or linkedin.com/in/username"
                      className="w-full h-12 px-3.5 sm:px-4 rounded-xl border border-slate-300 bg-slate-50/50 text-base text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-primary focus:outline-hidden focus:ring-4 focus:ring-primary/10 transition-all"
                    />
                  </div>

                  {/* 7. Agreement Checkbox */}
                  <div className="flex items-start gap-3 pt-2 text-left w-full">
                    <input
                      id="coc-agree"
                      type="checkbox"
                      required
                      checked={agreedToCoc}
                      onChange={(e) => setAgreedToCoc(e.target.checked)}
                      className="mt-0.5 h-5 w-5 rounded-md border-slate-300 text-primary focus:ring-0 cursor-pointer shrink-0"
                    />
                    <label htmlFor="coc-agree" className="text-xs text-slate-600 leading-relaxed cursor-pointer select-none">
                      I agree to the <span className="text-primary font-semibold">GDG Code of Conduct</span>. I understand workshop seats are strictly limited to {capacity}.
                    </label>
                  </div>

                  {/* 8. Full-Width Mobile-Native Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full min-h-[50px] py-3.5 px-4 mt-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-primary text-white text-base font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <svg className="w-5 h-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        <span>Issuing Pass &amp; QR Code...</span>
                      </>
                    ) : (
                      <>
                        <span>Claim Free Workshop Pass</span>
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="5" y1="12" x2="19" y2="12" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
                      </>
                    )}
                  </button>

                  <div className="text-center text-[11px] text-slate-400 pt-1">
                    {event.priceNote ? `${event.priceNote} • ` : "100% Free • "}Verified GDG Certificate &bull; Instant QR Pass
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CONFIRMATION / QR MODAL OVERLAY */}
      {isModalOpen && confirmedRegistration ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl overflow-hidden relative my-auto max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Google Colors Stripe */}
            <div className="h-1.5 w-full grid grid-cols-4 shrink-0">
              <div className="bg-[#4285f4]"></div>
              <div className="bg-[#ea4335]"></div>
              <div className="bg-[#fbbc04]"></div>
              <div className="bg-[#34a853]"></div>
            </div>

            <div className="p-4 sm:p-7 flex flex-col gap-4 sm:gap-5 overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Official GDG VCET Attendee Pass
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Success Notification if live submitted */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold flex items-center gap-2.5">
                <svg className="w-5 h-5 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Registration Confirmed! Your official seat is reserved.</span>
              </div>

              {/* Pass Card */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 shadow-xs flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                      {workshop.badgeText || "GDG on Campus VCET"}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">
                      {event.title || workshop.headline}
                    </h3>
                    <span className="text-xs text-slate-500 capitalize">
                      {event.format ?? "in-person"} &bull; {workshop.venueText}
                    </span>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase shrink-0">
                    4-DAY ALL-ACCESS PASS
                  </span>
                </div>

                {/* Multi-day info banner */}
                <div className="text-[11px] text-emerald-800 bg-emerald-50/80 p-2 rounded-xl border border-emerald-200/80 flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>This single pass &amp; QR code is valid for check-in on all 4 workshop days (Dec 1–4, 2026).</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 border-t border-b border-slate-200/80 py-3 sm:py-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Attendee
                    </span>
                    <span className="text-base font-bold text-slate-900">
                      {activePass.fullName}
                    </span>
                    <span className="text-xs text-slate-500">
                      {activePass.department} &bull; {activePass.yearOfStudy}
                    </span>
                    <span className="text-xs text-primary font-medium mt-0.5 truncate">
                      {activePass.college}
                    </span>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Access Tier
                    </span>
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md inline-block self-start mb-1.5">
                      4-Day All-Access Pass
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Pass Ref ID
                    </span>
                    <span className="font-mono font-bold text-sm text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 inline-block self-start">
                      #{activePass.referenceId}
                    </span>
                  </div>
                </div>

                {/* Footer details + QR Code */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
                  <div className="flex flex-col gap-1.5 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      <span>{workshop.datesText}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      <span>{workshop.venueText}</span>
                    </div>
                  </div>

                  {/* Scannable Dynamic QR Code */}
                  <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs flex flex-col items-center shrink-0">
                    {qrDataUrl ? (
                      <Image
                        src={qrDataUrl}
                        alt={`QR code for ${activePass.referenceId}`}
                        width={80}
                        height={80}
                        unoptimized
                        className="w-20 h-20 rounded"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded bg-slate-100 animate-pulse" />
                    )}
                    <span className="font-mono text-[9px] text-emerald-700 font-bold mt-1">
                      VALID FOR ALL 4 DAYS
                    </span>
                  </div>
                </div>
              </div>

              {/* Pass Actions */}
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={handleDownloadPass}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-white py-3 px-4 rounded-xl text-sm font-semibold hover:bg-primary-hover active:scale-95 transition-all cursor-pointer min-h-[44px]"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>{downloadSuccess ? "PDF Pass Downloaded!" : "Download Pass (PDF)"}</span>
                </button>

                {confirmedRegistration ? (
                  <button
                    type="button"
                    onClick={handleEmailSelfPass}
                    disabled={emailingPass}
                    className="inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 py-3 px-4 rounded-xl text-sm font-semibold active:scale-95 transition-all cursor-pointer min-h-[44px] disabled:opacity-50"
                  >
                    {emailingPass ? (
                      <svg className="w-3.5 h-3.5 animate-spin text-slate-700" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    )}
                    <span>{emailingPass ? "Sending Email…" : "Email Me My Pass"}</span>
                  </button>
                ) : null}
              </div>

              {emailPassResult ? (
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-semibold text-center">
                  {emailPassResult}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
