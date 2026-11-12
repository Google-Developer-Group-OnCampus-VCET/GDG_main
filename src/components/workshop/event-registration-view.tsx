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
  const capacity = stats?.capacity ?? workshop.capacity;
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
    workshop.registrationConfig.departments[0] ?? "Computer Engg"
  );
  const [yearOfStudy, setYearOfStudy] = useState("3rd Year");
  const [track, setTrack] = useState(
    workshop.registrationConfig.tracks[0]?.name ?? "General Admission"
  );
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [agreedToCoc, setAgreedToCoc] = useState(false);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmedRegistration, setConfirmedRegistration] = useState<RegistrationRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewPassMode, setPreviewPassMode] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
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
          experienceLevel: "Intermediate",
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

  function handlePrintPass() {
    window.print();
  }

  const activePass = confirmedRegistration ?? {
    id: "preview",
    eventSlug: event.slug,
    referenceId: "GDG-VCET-2025-0842",
    fullName: fullName.trim() || "Atharva Joshi",
    email: email.trim() || "atharva.joshi@vcet.edu.in",
    phone: phone.trim() || "+91 98765 43210",
    college: college.trim() || "Vidyavardhini's College of Engineering & Technology (VCET)",
    department: department || "Computer Engineering",
    yearOfStudy: yearOfStudy || "3rd Year",
    track: track || "Track A: Modern Web & Gemini AI",
    experienceLevel: "Intermediate",
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
                {event.title}
              </h1>

              {/* Subheading */}
              <p className="text-sm sm:text-base text-foreground-muted max-w-2xl leading-relaxed">
                {workshop.subheading}
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
                  <span className="text-foreground font-semibold">{workshop.seatsText}</span>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <a
                  href="#registration-form"
                  className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-full text-sm font-semibold shadow-sm hover:bg-primary-hover active:scale-95 transition-all cursor-pointer"
                >
                  <span>Register for Workshop</span>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <polyline points="19 12 12 19 5 12" />
                  </svg>
                </a>
                <button
                  type="button"
                  onClick={handleOpenPreviewPass}
                  className="inline-flex items-center gap-2 bg-white text-foreground px-5 py-3 rounded-full text-sm font-semibold border border-border hover:bg-surface-container active:scale-95 transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4 text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16v16H4z" />
                    <circle cx="12" cy="10" r="3" />
                    <path d="M6 18c0-3 3-4 6-4s6 1 6 4" />
                  </svg>
                  <span>Preview Attendee Pass</span>
                </button>
              </div>
            </div>

            {/* Right Visual composition */}
            <div className="lg:col-span-5 relative flex justify-center">
              <div className="relative w-full max-w-sm aspect-4/3 bg-white rounded-3xl border border-border shadow-md p-5 flex flex-col justify-between overflow-hidden">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ea4335]"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#fbbc04]"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#34a853]"></span>
                  </div>
                  <span className="text-xs font-mono bg-surface-container px-2.5 py-0.5 rounded-full text-foreground-muted">
                    devcraft_2025.sh
                  </span>
                </div>

                <div className="my-auto flex flex-col gap-2 py-3 text-center">
                  <div className="text-xs font-bold text-primary uppercase tracking-wider">
                    Hands-On Collegiate Workshop
                  </div>
                  <div className="text-xl font-bold text-foreground">
                    Modern Web &bull; Cloud &bull; Gemini AI
                  </div>
                  <div className="text-xs text-foreground-muted">
                    2 Days &bull; 2 Intensive Learning Tracks &bull; Verified Badge
                  </div>
                </div>

                <div className="bg-surface-container px-3.5 py-2 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-800">100% Free For Students</span>
                  <span className="bg-secondary-fixed text-on-secondary-fixed text-[11px] px-2 py-0.5 rounded-full font-bold">
                    BATCH &apos;25
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: FAST MOBILE-NATIVE REGISTRATION FORM */}
      <section
        className="w-full py-12 sm:py-16 bg-surface-container-low border-b border-border scroll-mt-20"
        id="registration-form"
      >
        <div className="max-w-xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col gap-6">
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
            <div className="bg-white p-5 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50 flex flex-col gap-5">
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
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-5">
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
                  <div className="flex flex-col gap-1.5 text-left">
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
                      placeholder="e.g. Atharva Joshi"
                      className="h-12 px-4 rounded-xl border border-slate-300 bg-slate-50/50 text-base text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-primary focus:outline-hidden focus:ring-4 focus:ring-primary/10 transition-all"
                    />
                  </div>

                  {/* 2. Contact Details (Email & Phone in Responsive Grid) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5 text-left">
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
                        placeholder="name@vcet.edu.in"
                        className="h-12 px-4 rounded-xl border border-slate-300 bg-slate-50/50 text-base text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-primary focus:outline-hidden focus:ring-4 focus:ring-primary/10 transition-all"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 text-left">
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
                        className="h-12 px-4 rounded-xl border border-slate-300 bg-slate-50/50 text-base text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-primary focus:outline-hidden focus:ring-4 focus:ring-primary/10 transition-all font-mono"
                      />
                    </div>
                  </div>

                  {/* 3. College / Institution (Placeholder hint for VCET, editable) */}
                  <div className="flex flex-col gap-1.5 text-left">
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
                      placeholder="Vidyavardhini's College of Engineering & Technology (VCET)"
                      className="h-12 px-4 rounded-xl border border-slate-300 bg-slate-50/50 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-primary focus:outline-hidden focus:ring-4 focus:ring-primary/10 transition-all"
                    />
                    <span className="text-[11px] text-slate-500">
                      Leave blank for VCET, or enter your college name if attending from another institute.
                    </span>
                  </div>

                  {/* 4. Academic Standing (Department & Year in 2-Column Grid) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5 text-left">
                      <label htmlFor="department" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Department / Branch <span className="text-rose-500">*</span>
                      </label>
                      <select
                        id="department"
                        required
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="h-12 px-3.5 rounded-xl border border-slate-300 bg-slate-50/50 text-sm sm:text-base text-slate-900 focus:bg-white focus:border-primary focus:outline-hidden focus:ring-4 focus:ring-primary/10 transition-all"
                      >
                        {workshop.registrationConfig.departments.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Year of Study <span className="text-rose-500">*</span>
                      </label>
                      <div className="grid grid-cols-4 gap-1.5 h-12">
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
                            <span className="h-full flex items-center justify-center rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 peer-checked:bg-primary peer-checked:text-white peer-checked:border-primary active:scale-95 transition-all">
                              {yr.replace(" Year", "")}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 5. Workshop Track Selection (Mobile-Friendly Tactile Cards) */}
                  <div className="flex flex-col gap-2 text-left pt-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Select Workshop Track <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {workshop.registrationConfig.tracks.map((t) => {
                        const isSelected = track === t.name;
                        return (
                          <label
                            key={t.id}
                            className={`cursor-pointer rounded-2xl border p-4 transition-all active:scale-[0.99] flex flex-col gap-2 ${
                              isSelected
                                ? "border-primary bg-primary/5 shadow-xs ring-2 ring-primary/20"
                                : "border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="radio"
                              name="track"
                              value={t.name}
                              checked={isSelected}
                              onChange={(e) => setTrack(e.target.value)}
                              className="sr-only"
                            />
                            <div className="flex items-center justify-between">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isSelected
                                    ? "bg-primary text-white"
                                    : "bg-slate-200 text-slate-700"
                                }`}
                              >
                                {t.badge}
                              </span>
                              <span
                                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                  isSelected
                                    ? "border-primary bg-primary text-white"
                                    : "border-slate-300 bg-white"
                                }`}
                              >
                                {isSelected ? (
                                  <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                                ) : null}
                              </span>
                            </div>
                            <span className="text-sm font-bold text-slate-900 leading-snug">
                              {t.name}
                            </span>
                            <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                              {t.description}
                            </p>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* 6. GitHub or LinkedIn Profile (Optional) */}
                  <div className="flex flex-col gap-1.5 text-left pt-1">
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
                      className="h-12 px-4 rounded-xl border border-slate-300 bg-slate-50/50 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-primary focus:outline-hidden focus:ring-4 focus:ring-primary/10 transition-all"
                    />
                  </div>

                  {/* 7. Agreement Checkbox */}
                  <div className="flex items-start gap-3 pt-2 text-left">
                    <input
                      id="coc-agree"
                      type="checkbox"
                      required
                      checked={agreedToCoc}
                      onChange={(e) => setAgreedToCoc(e.target.checked)}
                      className="mt-0.5 h-5 w-5 rounded-md border-slate-300 text-primary focus:ring-0 cursor-pointer shrink-0"
                    />
                    <label htmlFor="coc-agree" className="text-xs text-slate-600 leading-relaxed cursor-pointer">
                      I agree to the <span className="text-primary font-semibold">GDG Code of Conduct</span>. I understand workshop seats are strictly limited to {workshop.capacity}.
                    </label>
                  </div>

                  {/* 8. Full-Width Mobile-Native Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-13 mt-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-primary text-white text-base font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer"
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
                    100% Free &bull; Verified GDG Certificate &bull; Instant QR Pass
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
            className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl overflow-hidden relative my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Google Colors Stripe */}
            <div className="h-1.5 w-full grid grid-cols-4">
              <div className="bg-[#4285f4]"></div>
              <div className="bg-[#ea4335]"></div>
              <div className="bg-[#fbbc04]"></div>
              <div className="bg-[#34a853]"></div>
            </div>

            <div className="p-5 sm:p-7 flex flex-col gap-5">
              {/* Modal Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    {previewPassMode ? "Sample Pass Preview" : "Official GDG VCET Attendee Pass"}
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
              {!previewPassMode && confirmedRegistration ? (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold flex items-center gap-2.5">
                  <svg className="w-5 h-5 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Registration Confirmed! Your official seat is reserved.</span>
                </div>
              ) : null}

              {/* Pass Card */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 shadow-xs flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                      GDG on Campus VCET
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">
                      {event.title}
                    </h3>
                    <span className="text-xs text-slate-500 capitalize">
                      {event.format ?? "in-person"} &bull; {workshop.venueText}
                    </span>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase shrink-0">
                    ALL-ACCESS PASS
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-b border-slate-200/80 py-4">
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
                      Assigned Track
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      {activePass.track}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1.5">
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
                    <span className="font-mono text-[9px] text-slate-400 font-bold mt-1">
                      SCAN AT ENTRANCE
                    </span>
                  </div>
                </div>
              </div>

              {/* Pass Actions */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleDownloadPass}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-white py-2.5 px-4 rounded-xl text-xs font-semibold hover:bg-primary-hover active:scale-95 transition-all cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>{downloadSuccess ? "PDF Pass Downloaded!" : "Download Pass (PDF)"}</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintPass}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-100 text-slate-800 py-2.5 px-4 rounded-xl text-xs font-semibold hover:bg-slate-200 active:scale-95 transition-all border border-slate-200 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  <span>Print / Save PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
