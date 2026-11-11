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
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: inquiryType, ...formData }),
      });
      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.message || "Failed to send your message. Please try again.");
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      setIsSubmitted(true);
    } catch {
      setSubmitError("Network connection error. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Column: Campus Info & Community Links (5 cols) */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        {/* Campus Location Card — only the one verified fact (the college name) is shown;
            a precise address and transit directions aren't verified, see docs/content-needed.md */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-xs flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">location_on</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Campus Chapter Location</h2>
              <p className="text-xs text-foreground-muted">Vidyavardhini&apos;s College of Engineering &amp; Technology, Vasai</p>
            </div>
          </div>
        </div>

        {/* Organizer Direct Contact — no chapter email or social links have been verified yet;
            use the form instead of a placeholder/fabricated address. See docs/content-needed.md. */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-xs flex flex-col gap-3">
          <h2 className="text-base font-bold text-foreground">Direct Community Channels</h2>
          <p className="text-xs text-foreground-muted leading-relaxed">
            A verified chapter email and social links aren&apos;t published yet — use the form to reach the organizing team directly.
          </p>
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

            {submitError ? (
              <div className="p-3.5 rounded-xl bg-status-error/10 border border-status-error/30 text-status-error text-xs font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{submitError}</span>
              </div>
            ) : null}

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
