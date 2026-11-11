"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ChapterEvent, EventCategory, EventVisibility, EventFormat, EventTopic } from "@/types";
import { FileUploadField } from "@/components/admin/file-upload-field";

interface Props {
  initialEvent?: ChapterEvent;
  isEditMode?: boolean;
}

const TOPIC_OPTIONS: { value: EventTopic; label: string }[] = [
  { value: "web", label: "Web" },
  { value: "ai-ml", label: "AI / ML" },
  { value: "cloud", label: "Cloud" },
  { value: "android", label: "Android" },
  { value: "general", label: "General" },
];

export function EventBuilderForm({ initialEvent, isEditMode = false }: Props) {
  const router = useRouter();

  const [formData, setFormData] = useState({
    title: initialEvent?.title || "",
    slug: initialEvent?.slug || "",
    category: initialEvent?.category || "workshop",
    format: initialEvent?.format || "in-person",
    visibility: initialEvent?.visibility || "public",
    startsAt: initialEvent?.startsAt ? initialEvent.startsAt.substring(0, 16) : "2026-11-20T09:00",
    endsAt: initialEvent?.endsAt ? initialEvent.endsAt.substring(0, 16) : "2026-11-21T17:30",
    timezone: initialEvent?.timezone || "Asia/Kolkata",
    location: initialEvent?.location || "VCET Campus, Auditorium & Labs 402",
    capacity: initialEvent?.capacity || 150,
    isRegistrationOpen: initialEvent?.isRegistrationOpen !== false,
    registrationDeadline: initialEvent?.registrationDeadline || "",
    summary: initialEvent?.summary || "",
    image: initialEvent?.image || "",
    price: initialEvent?.price || 0,
    currency: initialEvent?.currency || "INR",
    topics: initialEvent?.topics || [],
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleTitleChange = (val: string) => {
    setFormData((prev) => ({
      ...prev,
      title: val,
      slug: !isEditMode && !prev.slug
        ? val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
        : prev.slug,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const endpoint = isEditMode
        ? `/api/admin/events/${initialEvent?.slug}`
        : "/api/admin/events";

      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Failed to save event");
        setLoading(false);
        return;
      }

      router.push("/admin/events");
      router.refresh();
    } catch {
      setErrorMsg("Network error occurred while saving.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin/events" className="text-xs text-foreground-muted hover:text-foreground">
              ← Events
            </Link>
            <span className="text-xs text-foreground-muted">/</span>
            <span className="text-xs font-bold text-foreground">
              {isEditMode ? "Edit Event" : "Create New Event"}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-1">
            {isEditMode ? `Edit: ${initialEvent?.title}` : "New Community Event"}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/events"
            className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-surface-container transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-hover transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">save</span>
                <span>{isEditMode ? "Save Changes" : "Create Event"}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-status-error/10 border border-status-error/20 text-status-error text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Form Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Essential Details (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-white rounded-2xl border border-border p-6 shadow-xs flex flex-col gap-4">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
              1. Event Overview &amp; Identity
            </h2>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">
                Event Title <span className="text-status-error">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. Cloud & AI Bootcamp 2026"
                className="px-3.5 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">
                URL Slug <span className="text-status-error">*</span>
              </label>
              <div className="flex items-center">
                <span className="px-3 py-2 rounded-l-xl border border-r-0 border-border bg-surface-container text-xs text-foreground-muted font-mono">
                  /events/
                </span>
                <input
                  type="text"
                  required
                  disabled={isEditMode}
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="cloud-ai-bootcamp-2026"
                  className="flex-1 px-3.5 py-2 rounded-r-xl border border-border text-xs text-foreground bg-surface-container-lowest font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-60"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">
                Summary / Tagline <span className="text-status-error">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                placeholder="Brief 1-2 sentence overview shown on event cards and SEO preview..."
                className="p-3 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <FileUploadField
              label="Event Banner"
              entity="events"
              value={formData.image}
              onChange={(url) => setFormData({ ...formData, image: url })}
            />
          </div>

          {/* Schedule & Venue Card */}
          <div className="bg-white rounded-2xl border border-border p-6 shadow-xs flex flex-col gap-4">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
              2. Date, Time &amp; Venue
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Starts At <span className="text-status-error">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.startsAt}
                  onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                  className="px-3.5 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">Ends At</label>
                <input
                  type="datetime-local"
                  value={formData.endsAt}
                  onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
                  className="px-3.5 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">
                Physical Location / Virtual Meeting Link <span className="text-status-error">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Auditorium & Labs 402, VCET Vasai or Google Meet Link"
                className="px-3.5 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Settings & Configuration (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white rounded-2xl border border-border p-6 shadow-xs flex flex-col gap-4">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
              3. Classification &amp; Format
            </h2>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as EventCategory })}
                className="px-3.5 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="workshop">Workshop</option>
                <option value="meetup">Technical Meetup</option>
                <option value="conference">Conference</option>
                <option value="hackathon">Hackathon</option>
                <option value="bootcamp">Bootcamp</option>
                <option value="webinar">Webinar</option>
                <option value="competition">Competition</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">Format</label>
              <select
                value={formData.format}
                onChange={(e) => setFormData({ ...formData, format: e.target.value as EventFormat })}
                className="px-3.5 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="in-person">In-Person</option>
                <option value="online">Online / Virtual</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">Visibility</label>
              <select
                value={formData.visibility}
                onChange={(e) => setFormData({ ...formData, visibility: e.target.value as EventVisibility })}
                className="px-3.5 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="public">Public (Visible on Website)</option>
                <option value="unlisted">Unlisted (Link only)</option>
                <option value="draft">Draft (Admin only)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">
                Topics <span className="text-foreground-muted font-normal">(used for public event filtering)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {TOPIC_OPTIONS.map((opt) => {
                  const checked = formData.topics.includes(opt.value);
                  return (
                    <label key={opt.value} className="cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            topics: e.target.checked
                              ? [...prev.topics, opt.value]
                              : prev.topics.filter((t) => t !== opt.value),
                          }))
                        }
                        className="sr-only peer"
                      />
                      <span className="inline-block px-3 py-1.5 rounded-full border border-border bg-surface-container-lowest text-foreground-muted text-xs font-medium peer-checked:bg-primary peer-checked:text-on-primary peer-checked:border-primary transition-all">
                        {opt.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Registration Controls Card */}
          <div className="bg-white rounded-2xl border border-border p-6 shadow-xs flex flex-col gap-4">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
              4. Registration Controls
            </h2>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">Attendee Capacity</label>
              <input
                type="number"
                min={1}
                max={5000}
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 100 })}
                className="px-3.5 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <label className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low border border-border cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isRegistrationOpen}
                onChange={(e) => setFormData({ ...formData, isRegistrationOpen: e.target.checked })}
                className="rounded border-border text-primary focus:ring-primary h-4 w-4"
              />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground">Open for Registration</span>
                <span className="text-[10px] text-foreground-muted">Accept new submissions</span>
              </div>
            </label>
          </div>
        </div>
      </div>
    </form>
  );
}
