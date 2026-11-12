"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ChapterEvent, EventFormat, EventTopic } from "@/types";

const ALL_TOPICS: { id: EventTopic; label: string }[] = [
  { id: "web", label: "Modern Web" },
  { id: "cloud", label: "Cloud & DevOps" },
  { id: "ai-ml", label: "AI / ML & Gemini" },
  { id: "android", label: "Android & Mobile" },
  { id: "general", label: "General & Career" },
];

const IST_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function toDatetimeLocalValue(value?: string): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T09:00`;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    return trimmed.slice(0, 16);
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return "";

  const parts = IST_FORMATTER.formatToParts(parsed);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function toIsoFromDatetimeLocal(localValue: string, originalValue?: string): string {
  const trimmed = localValue.trim();
  if (!trimmed) return "";
  if (originalValue && trimmed === toDatetimeLocalValue(originalValue)) {
    return originalValue;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}:00+05:30`;
  }
  return trimmed;
}

interface EventEditFormProps {
  event: ChapterEvent;
  initialCapacity: number;
  initialIsOpen: boolean;
}

export function EventEditForm({
  event,
  initialCapacity,
  initialIsOpen,
}: EventEditFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(event.title);
  const [format, setFormat] = useState<EventFormat>(event.format ?? "in-person");
  const [startsAt, setStartsAt] = useState(() => toDatetimeLocalValue(event.startsAt));
  const [endsAt, setEndsAt] = useState(() => toDatetimeLocalValue(event.endsAt));
  const [location, setLocation] = useState(
    event.location ?? "Vidyavardhini's College of Engineering and Technology, Vasai"
  );
  const [capacity, setCapacity] = useState<number>(initialCapacity || 150);
  const [selectedTopics, setSelectedTopics] = useState<EventTopic[]>(
    event.topics && event.topics.length > 0 ? event.topics : ["general"]
  );
  const [summary, setSummary] = useState(event.summary ?? "");
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(initialIsOpen);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function toggleTopic(topic: EventTopic) {
    if (selectedTopics.includes(topic)) {
      if (selectedTopics.length > 1) {
        setSelectedTopics(selectedTopics.filter((t) => t !== topic));
      }
    } else {
      setSelectedTopics([...selectedTopics, topic]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!title.trim() || !startsAt.trim()) {
      setErrorMessage("Please provide both an event title and start date/time.");
      return;
    }

    const parsedCapacity = Number(capacity);
    if (!Number.isFinite(parsedCapacity) || parsedCapacity < 1) {
      setErrorMessage("Capacity must be at least 1 seat.");
      return;
    }

    setLoading(true);

    const formattedStartsAt = toIsoFromDatetimeLocal(startsAt, event.startsAt);
    const formattedEndsAt = endsAt.trim()
      ? toIsoFromDatetimeLocal(endsAt, event.endsAt)
      : event.endsAt
        ? ""
        : undefined;

    try {
      const res = await fetch(`/api/admin/events/${encodeURIComponent(event.slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          format,
          startsAt: formattedStartsAt,
          endsAt: formattedEndsAt,
          location: location.trim(),
          capacity: parsedCapacity,
          topics: selectedTopics,
          summary: summary.trim(),
          isRegistrationOpen,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as { message?: string };

      if (!res.ok) {
        setErrorMessage(data.message || "Failed to update event details.");
        setLoading(false);
        return;
      }

      setSuccessMessage("Event details updated and synced successfully.");
      setLoading(false);
      router.refresh();
    } catch {
      setErrorMessage("Network error connecting to event API. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Navigation Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-foreground-muted">
          <Link href="/admin/console" className="hover:text-primary transition-colors">
            Admin Console
          </Link>
          <span>/</span>
          <Link
            href={`/admin/console/events/${event.slug}/registrations`}
            className="hover:text-primary transition-colors"
          >
            {event.title}
          </Link>
          <span>/</span>
          <span className="text-foreground font-semibold">Edit Event</span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/console"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-white text-xs font-semibold text-foreground-muted hover:text-foreground hover:bg-surface-container transition-all"
          >
            <span>Back to Console</span>
          </Link>
          <Link
            href={`/admin/console/events/${event.slug}/registrations`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-white text-xs font-semibold text-primary hover:bg-primary-fixed/40 transition-all"
          >
            <span>View Registrations</span>
          </Link>
        </div>
      </div>

      {/* Card Container */}
      <div className="bg-white rounded-3xl border border-border shadow-xs overflow-hidden">
        {/* Top Brand Accent */}
        <div className="h-1.5 grid grid-cols-4">
          <div className="bg-[#4285F4]" />
          <div className="bg-[#EA4335]" />
          <div className="bg-[#FBBC05]" />
          <div className="bg-[#34A853]" />
        </div>

        <div className="p-6 sm:p-8 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold text-foreground">
                Edit Chapter Event
              </h1>
              <p className="text-xs sm:text-sm text-foreground-muted">
                Update schedule, capacity, topics, or registration availability for{" "}
                <span className="font-mono font-semibold text-foreground">/events/{event.slug}</span>.
              </p>
            </div>
          </div>

          {errorMessage ? (
            <div
              role="alert"
              className="flex items-start gap-3 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium"
            >
              <svg
                className="w-4 h-4 shrink-0 text-rose-600 mt-0.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          ) : null}

          {successMessage ? (
            <div
              role="status"
              className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium"
            >
              <div className="flex items-center gap-2.5">
                <svg
                  className="w-4 h-4 shrink-0 text-emerald-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>{successMessage}</span>
              </div>
              <Link
                href={`/admin/console/events/${event.slug}/registrations`}
                className="font-bold underline hover:text-emerald-950 shrink-0"
              >
                Open Registrations →
              </Link>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* 1. Title */}
            <div className="flex flex-col gap-1 text-left">
              <label
                htmlFor="edit-event-title"
                className="text-xs font-bold text-slate-700 uppercase tracking-wider"
              >
                Event Title <span className="text-rose-500">*</span>
              </label>
              <input
                id="edit-event-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Cloud Community Day 2026"
                className="h-11 px-3.5 rounded-xl border border-slate-300 bg-slate-50/50 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-primary focus:outline-hidden focus:ring-4 focus:ring-primary/10 transition-all"
              />
            </div>

            {/* 2. Format & Capacity Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1 text-left">
                <label
                  htmlFor="edit-event-format"
                  className="text-xs font-bold text-slate-700 uppercase tracking-wider"
                >
                  Format
                </label>
                <select
                  id="edit-event-format"
                  value={format}
                  onChange={(e) => setFormat(e.target.value as EventFormat)}
                  className="h-11 px-3.5 rounded-xl border border-slate-300 bg-slate-50/50 text-sm text-slate-900 focus:bg-white focus:border-primary focus:outline-hidden focus:ring-4 focus:ring-primary/10 transition-all"
                >
                  <option value="in-person">In-Person (VCET Campus)</option>
                  <option value="online">Online / Virtual</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>

              <div className="flex flex-col gap-1 text-left">
                <label
                  htmlFor="edit-event-capacity"
                  className="text-xs font-bold text-slate-700 uppercase tracking-wider"
                >
                  Capacity (Seats)
                </label>
                <input
                  id="edit-event-capacity"
                  type="number"
                  min={1}
                  max={5000}
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className="h-11 px-3.5 rounded-xl border border-slate-300 bg-slate-50/50 text-sm text-slate-900 focus:bg-white focus:border-primary focus:outline-hidden focus:ring-4 focus:ring-primary/10 transition-all font-mono"
                />
              </div>
            </div>

            {/* 3. Dates & Times */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1 text-left">
                <label
                  htmlFor="edit-event-startsAt"
                  className="text-xs font-bold text-slate-700 uppercase tracking-wider"
                >
                  Starts At (IST) <span className="text-rose-500">*</span>
                </label>
                <input
                  id="edit-event-startsAt"
                  type="datetime-local"
                  required
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="h-11 px-3.5 rounded-xl border border-slate-300 bg-slate-50/50 text-sm text-slate-900 focus:bg-white focus:border-primary focus:outline-hidden focus:ring-4 focus:ring-primary/10 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1 text-left">
                <label
                  htmlFor="edit-event-endsAt"
                  className="text-xs font-bold text-slate-700 uppercase tracking-wider"
                >
                  Ends At (Optional, IST)
                </label>
                <input
                  id="edit-event-endsAt"
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="h-11 px-3.5 rounded-xl border border-slate-300 bg-slate-50/50 text-sm text-slate-900 focus:bg-white focus:border-primary focus:outline-hidden focus:ring-4 focus:ring-primary/10 transition-all"
                />
              </div>
            </div>

            {/* 4. Location */}
            <div className="flex flex-col gap-1 text-left">
              <label
                htmlFor="edit-event-location"
                className="text-xs font-bold text-slate-700 uppercase tracking-wider"
              >
                Venue / Location
              </label>
              <input
                id="edit-event-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Vidyavardhini's College of Engineering and Technology, Vasai"
                className="h-11 px-3.5 rounded-xl border border-slate-300 bg-slate-50/50 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-primary focus:outline-hidden focus:ring-4 focus:ring-primary/10 transition-all"
              />
            </div>

            {/* 5. Topics */}
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Topics / Categories
              </label>
              <div className="flex flex-wrap gap-2">
                {ALL_TOPICS.map((topic) => {
                  const active = selectedTopics.includes(topic.id);
                  return (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => toggleTopic(topic.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        active
                          ? "bg-primary text-on-primary shadow-xs"
                          : "bg-surface-container-low text-foreground-muted hover:bg-surface-container"
                      }`}
                    >
                      {topic.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 6. Summary */}
            <div className="flex flex-col gap-1 text-left">
              <label
                htmlFor="edit-event-summary"
                className="text-xs font-bold text-slate-700 uppercase tracking-wider"
              >
                Summary / Overview
              </label>
              <textarea
                id="edit-event-summary"
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Brief 1-2 sentence description of what attendees will learn and experience."
                className="p-3.5 rounded-xl border border-slate-300 bg-slate-50/50 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-primary focus:outline-hidden focus:ring-4 focus:ring-primary/10 transition-all"
              />
            </div>

            {/* 7. Registration Open Toggle */}
            <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-surface-container-low border border-border/60">
              <div className="flex flex-col gap-0.5">
                <label
                  htmlFor="edit-regOpen"
                  className="text-xs sm:text-sm font-semibold text-foreground cursor-pointer"
                >
                  Accepting Public Registrations
                </label>
                <span className="text-xs text-foreground-muted">
                  When disabled, the public registration form displays registration as closed.
                </span>
              </div>
              <button
                id="edit-regOpen"
                type="button"
                role="switch"
                aria-checked={isRegistrationOpen}
                onClick={() => setIsRegistrationOpen((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                  isRegistrationOpen ? "bg-emerald-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                    isRegistrationOpen ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <Link
                  href="/admin/console"
                  className="px-4 py-2.5 rounded-xl border border-border bg-white text-xs sm:text-sm font-semibold text-foreground-muted hover:text-foreground hover:bg-surface-container-low transition-all"
                >
                  Back to Admin Console
                </Link>
                <Link
                  href={`/admin/console/events/${event.slug}/registrations`}
                  className="px-4 py-2.5 rounded-xl border border-border bg-white text-xs sm:text-sm font-semibold text-foreground-muted hover:text-foreground hover:bg-surface-container-low transition-all"
                >
                  Registrations
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs sm:text-sm font-semibold hover:bg-primary-hover shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <span>Save Changes</span>
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
