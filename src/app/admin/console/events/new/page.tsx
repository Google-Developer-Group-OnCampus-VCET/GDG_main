"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminHeader } from "@/components/admin/admin-header";
import type { EventFormat, EventTopic } from "@/types";

const ALL_TOPICS: { id: EventTopic; label: string }[] = [
  { id: "web", label: "Modern Web" },
  { id: "cloud", label: "Cloud & DevOps" },
  { id: "ai-ml", label: "AI / ML & Gemini" },
  { id: "android", label: "Android & Mobile" },
  { id: "general", label: "General & Career" },
];

export default function CreateEventPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [autoSlug, setAutoSlug] = useState(true);
  const [format, setFormat] = useState<EventFormat>("in-person");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [location, setLocation] = useState(
    "Vidyavardhini's College of Engineering and Technology, Vasai"
  );
  const [capacity, setCapacity] = useState(150);
  const [selectedTopics, setSelectedTopics] = useState<EventTopic[]>(["web", "cloud"]);
  const [summary, setSummary] = useState("");
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleTitleChange(val: string) {
    setTitle(val);
    if (autoSlug) {
      const generated = val
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setSlug(generated);
    }
  }

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

    if (!title.trim() || !startsAt.trim()) {
      setErrorMessage("Please provide both an event title and start date/time.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim() || undefined,
          format,
          startsAt: startsAt.trim(),
          endsAt: endsAt.trim() || undefined,
          location: location.trim(),
          capacity: Number(capacity) || 150,
          topics: selectedTopics,
          summary: summary.trim() || undefined,
          isRegistrationOpen,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.message || "Failed to create event.");
        setLoading(false);
        return;
      }

      // Success: redirect to admin console
      router.push("/admin/console");
      router.refresh();
    } catch {
      setErrorMessage("Network error connecting to event API. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface-container-low flex flex-col">
      <AdminHeader currentTab="overview" />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-foreground-muted">
          <Link href="/admin/console" className="hover:text-primary transition-colors">
            Admin Console
          </Link>
          <span>/</span>
          <span className="text-foreground font-semibold">Create Event</span>
        </div>

        {/* Card Container */}
        <div className="bg-white rounded-3xl border border-border shadow-xs overflow-hidden">
          {/* Top Brand Accent */}
          <div className="h-1.5 grid grid-cols-4">
            <div className="bg-[#4285F4]"></div>
            <div className="bg-[#EA4335]"></div>
            <div className="bg-[#FBBC05]"></div>
            <div className="bg-[#34A853]"></div>
          </div>

          <div className="p-6 sm:p-8 flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold text-foreground">
                Create New Chapter Event
              </h1>
              <p className="text-xs sm:text-sm text-foreground-muted">
                Publish a workshop, hackathon, or seminar connected directly to Cloud Firestore.
              </p>
            </div>

            {errorMessage ? (
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
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

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* 1. Title */}
              <div className="flex flex-col gap-1 text-left">
                <label htmlFor="event-title" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Event Title <span className="text-rose-500">*</span>
                </label>
                <input
                  id="event-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. Cloud Community Day 2026"
                  className="h-11 px-3.5 rounded-xl border border-slate-300 bg-slate-50/50 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#1a73e8] focus:outline-hidden focus:ring-4 focus:ring-[#1a73e8]/10 transition-all"
                />
              </div>

              {/* 2. Slug */}
              <div className="flex flex-col gap-1 text-left">
                <div className="flex items-center justify-between">
                  <label htmlFor="event-slug" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    URL Slug
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    /events/{slug || "your-event-slug"}
                  </span>
                </div>
                <input
                  id="event-slug"
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setAutoSlug(false);
                    setSlug(e.target.value);
                  }}
                  placeholder="cloud-community-day-2026"
                  className="h-11 px-3.5 rounded-xl border border-slate-300 bg-slate-50/50 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#1a73e8] focus:outline-hidden focus:ring-4 focus:ring-[#1a73e8]/10 transition-all font-mono"
                />
              </div>

              {/* 3. Format & Capacity Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1 text-left">
                  <label htmlFor="event-format" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Format
                  </label>
                  <select
                    id="event-format"
                    value={format}
                    onChange={(e) => setFormat(e.target.value as EventFormat)}
                    className="h-11 px-3.5 rounded-xl border border-slate-300 bg-slate-50/50 text-sm text-slate-900 focus:bg-white focus:border-[#1a73e8] focus:outline-hidden focus:ring-4 focus:ring-[#1a73e8]/10 transition-all"
                  >
                    <option value="in-person">In-Person (VCET Campus)</option>
                    <option value="online">Online / Virtual</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1 text-left">
                  <label htmlFor="event-capacity" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Capacity (Seats)
                  </label>
                  <input
                    id="event-capacity"
                    type="number"
                    min="1"
                    max="1000"
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="h-11 px-3.5 rounded-xl border border-slate-300 bg-slate-50/50 text-sm text-slate-900 focus:bg-white focus:border-[#1a73e8] focus:outline-hidden focus:ring-4 focus:ring-[#1a73e8]/10 transition-all font-mono"
                  />
                </div>
              </div>

              {/* 4. Dates & Times */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1 text-left">
                  <label htmlFor="event-startsAt" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Starts At <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="event-startsAt"
                    type="datetime-local"
                    required
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="h-11 px-3.5 rounded-xl border border-slate-300 bg-slate-50/50 text-sm text-slate-900 focus:bg-white focus:border-[#1a73e8] focus:outline-hidden focus:ring-4 focus:ring-[#1a73e8]/10 transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1 text-left">
                  <label htmlFor="event-endsAt" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Ends At (Optional)
                  </label>
                  <input
                    id="event-endsAt"
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className="h-11 px-3.5 rounded-xl border border-slate-300 bg-slate-50/50 text-sm text-slate-900 focus:bg-white focus:border-[#1a73e8] focus:outline-hidden focus:ring-4 focus:ring-[#1a73e8]/10 transition-all"
                  />
                </div>
              </div>

              {/* 5. Location */}
              <div className="flex flex-col gap-1 text-left">
                <label htmlFor="event-location" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Venue / Location
                </label>
                <input
                  id="event-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Vidyavardhini's College of Engineering and Technology, Vasai"
                  className="h-11 px-3.5 rounded-xl border border-slate-300 bg-slate-50/50 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#1a73e8] focus:outline-hidden focus:ring-4 focus:ring-[#1a73e8]/10 transition-all"
                />
              </div>

              {/* 6. Topics */}
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
                            ? "bg-[#1a73e8] text-white shadow-xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {topic.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 7. Summary */}
              <div className="flex flex-col gap-1 text-left">
                <label htmlFor="event-summary" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Summary / Overview
                </label>
                <textarea
                  id="event-summary"
                  rows={3}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Brief 1-2 sentence description of what attendees will learn and experience."
                  className="p-3.5 rounded-xl border border-slate-300 bg-slate-50/50 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#1a73e8] focus:outline-hidden focus:ring-4 focus:ring-[#1a73e8]/10 transition-all"
                />
              </div>

              {/* 8. Registration Open Toggle */}
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <input
                  id="regOpen"
                  type="checkbox"
                  checked={isRegistrationOpen}
                  onChange={(e) => setIsRegistrationOpen(e.target.checked)}
                  className="w-4 h-4 rounded-md text-[#1a73e8] focus:ring-[#1a73e8]"
                />
                <label htmlFor="regOpen" className="text-xs sm:text-sm font-semibold text-slate-800 cursor-pointer">
                  Open registrations immediately upon publishing
                </label>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Link
                  href="/admin/console"
                  className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1a73e8] text-white text-xs sm:text-sm font-semibold hover:bg-[#1557b0] shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      <span>Publishing to Firestore...</span>
                    </>
                  ) : (
                    <>
                      <span>Publish Event</span>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
