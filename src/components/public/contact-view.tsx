"use client";

import { useState } from "react";

export function ContactView() {
  const [inquiryType, setInquiryType] = useState<"general" | "speaker" | "sponsor" | "partnership">("general");
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    organization: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate sending inquiry to chapter inbox
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 600);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Column: Campus Info & Community Links (5 cols) */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        {/* Campus Location Card */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-xs flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">location_on</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Campus Chapter Location</h2>
              <p className="text-xs text-foreground-muted">Vidyavardhini&apos;s College of Engineering &amp; Technology</p>
            </div>
          </div>

          <p className="text-xs text-foreground-muted leading-relaxed">
            K.T. Marg, Vasai Road (West), Palghar District, Maharashtra 401202, India.
          </p>

          <div className="p-3.5 rounded-xl bg-surface-container-low border border-border/60 text-xs text-foreground-muted flex flex-col gap-1.5">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <span className="material-symbols-outlined text-[16px] text-primary">directions_subway</span>
              <span>Transit Guide</span>
            </div>
            <p>
              Conveniently located 5 minutes walking distance from Vasai Road Railway Station (Western Railway suburban line).
            </p>
          </div>
        </div>

        {/* Organizer Direct Contact */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-xs flex flex-col gap-4">
          <h2 className="text-base font-bold text-foreground">Direct Community Channels</h2>

          <div className="flex flex-col gap-3">
            <a
              href="mailto:lead@vcet.edu.in"
              className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-status-error flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">mail</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-foreground">Chapter Email</span>
                  <span className="text-[11px] text-foreground-muted">lead@vcet.edu.in</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-[16px] text-foreground-muted group-hover:text-foreground">
                arrow_forward
              </span>
            </a>

            <a
              href="https://gdg.community.dev/gdg-on-campus-vidyavardhinis-college-of-engineering-and-technology-vasai-india/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">public</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-foreground">Official GDG Community Page</span>
                  <span className="text-[11px] text-foreground-muted">gdg.community.dev</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-[16px] text-foreground-muted group-hover:text-foreground">
                arrow_forward
              </span>
            </a>

            <a
              href="https://github.com/gdg-vcet"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-container-high text-foreground flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">code</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-foreground">Open-Source GitHub</span>
                  <span className="text-[11px] text-foreground-muted">github.com/gdg-vcet</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-[16px] text-foreground-muted group-hover:text-foreground">
                arrow_forward
              </span>
            </a>
          </div>
        </div>
      </div>

      {/* Right Column: Interactive Inquiry Form (7 cols) */}
      <div className="lg:col-span-7 bg-white rounded-2xl border border-border p-6 md:p-8 shadow-xs">
        {isSubmitted ? (
          <div className="py-12 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-status-success/10 text-status-success flex items-center justify-center">
              <span className="material-symbols-outlined text-[32px]">check_circle</span>
            </div>
            <h2 className="text-xl font-bold text-foreground">Message Dispatched Successfully!</h2>
            <p className="text-sm text-foreground-muted max-w-md leading-relaxed">
              Thank you for reaching out to GDG VCET. Your message has been routed to our chapter organizing team. We typically respond within 24 to 48 hours.
            </p>
            <button
              onClick={() => {
                setIsSubmitted(false);
                setFormData({ fullName: "", email: "", organization: "", subject: "", message: "" });
              }}
              className="mt-4 px-6 py-2.5 rounded-full bg-primary text-on-primary text-xs font-bold hover:bg-primary-hover transition-colors"
            >
              Send Another Inquiry
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-bold text-foreground">Send an Inquiry or Proposal</h2>
              <p className="text-xs text-foreground-muted mt-1">
                Select your inquiry category and fill out the form below.
              </p>
            </div>

            {/* Category Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "general", label: "General Question" },
                { id: "speaker", label: "Speaker Proposal" },
                { id: "sponsor", label: "Sponsorship" },
                { id: "partnership", label: "Campus Partner" },
              ].map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setInquiryType(t.id as "general" | "speaker" | "sponsor" | "partnership")}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-center ${
                    inquiryType === t.id
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-surface-container-low text-foreground-muted hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Your Full Name <span className="text-status-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priyanshu Dave"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="px-3.5 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Email Address <span className="text-status-error">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="you@domain.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="px-3.5 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">Company / College / Team</label>
                <input
                  type="text"
                  placeholder="e.g. VCET / Google / Startup"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  className="px-3.5 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Subject Line <span className="text-status-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Brief summary of your inquiry"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="px-3.5 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">
                Detailed Message <span className="text-status-error">*</span>
              </label>
              <textarea
                rows={4}
                required
                placeholder="Tell us more about how you'd like to collaborate, propose a talk topic, or inquire about events..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="p-3.5 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full sm:w-auto self-start px-8 py-3 rounded-full bg-primary text-on-primary text-xs font-bold hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Transmitting...</span>
                </>
              ) : (
                <>
                  <span>Transmit Inquiry</span>
                  <span className="material-symbols-outlined text-[16px]">send</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
