"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ChapterEvent } from "@/types";

interface Props {
  initialEvents: ChapterEvent[];
}

export function EventsManagerView({ initialEvents }: Props) {
  const router = useRouter();
  const [events, setEvents] = useState<ChapterEvent[]>(initialEvents);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const categories = [
    "all",
    "workshop",
    "meetup",
    "conference",
    "hackathon",
    "bootcamp",
    "webinar",
    "competition",
    "other",
  ];

  const filteredEvents = events.filter((e) => {
    const matchesCat = selectedCategory === "all" || e.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === "" ||
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.location && e.location.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const handleDuplicate = async (slug: string) => {
    if (!confirm(`Duplicate event "${slug}"? A new copy will be created as a draft.`)) return;
    setActionLoading(slug);

    try {
      const res = await fetch(`/api/admin/events/${slug}/duplicate`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        router.refresh();
        // Refresh local list
        const refreshed = await fetch("/api/admin/events").then((r) => r.json());
        if (refreshed.events) setEvents(refreshed.events);
      } else {
        alert(data.error || "Failed to duplicate event");
      }
    } catch {
      alert("Error duplicating event");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleRegistration = async (slug: string, currentStatus: boolean) => {
    setActionLoading(slug);
    try {
      const res = await fetch(`/api/admin/events/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRegistrationOpen: !currentStatus }),
      });
      if (res.ok) {
        setEvents((prev) =>
          prev.map((e) => (e.slug === slug ? { ...e, isRegistrationOpen: !currentStatus } : e))
        );
      }
    } catch {
      alert("Error updating registration status");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (slug: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) return;
    setActionLoading(slug);

    try {
      const res = await fetch(`/api/admin/events/${slug}`, { method: "DELETE" });
      if (res.ok) {
        setEvents((prev) => prev.filter((e) => e.slug !== slug));
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete event");
      }
    } catch {
      alert("Error deleting event");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Chapter Events</h1>
          <p className="text-xs sm:text-sm text-foreground-muted mt-1">
            Create, configure, preview and manage developer events for GDG on Campus VCET.
          </p>
        </div>

        <Link
          href="/admin/events/new"
          className="px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-hover transition-colors shadow-xs flex items-center justify-center gap-1.5 self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          <span>Create New Event</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-border p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? "bg-primary text-on-primary shadow-xs font-bold"
                  : "bg-surface-container-low text-foreground-muted hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-foreground-muted pointer-events-none">
            search
          </span>
          <input
            type="text"
            placeholder="Search by title, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-full border border-border bg-surface-container-lowest text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>

      {/* Events Table / Card Grid */}
      <div className="grid grid-cols-1 gap-4">
        {filteredEvents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-border p-12 text-center flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-[32px] text-foreground-muted">
              event_busy
            </span>
            <p className="text-sm font-bold text-foreground">No events found</p>
            <p className="text-xs text-foreground-muted">
              Try switching your category filter or create a new event.
            </p>
          </div>
        ) : (
          filteredEvents.map((evt) => (
            <div
              key={evt.id}
              className="bg-white rounded-2xl border border-border p-5 shadow-xs hover:border-primary/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Event Info */}
              <div className="flex flex-col gap-1.5 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-[10px] font-bold uppercase tracking-wider">
                    {evt.category}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-surface-container text-foreground-muted text-[10px] font-medium capitalize">
                    {evt.format}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      evt.visibility === "public"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-surface-container text-foreground-muted"
                    }`}
                  >
                    {evt.visibility}
                  </span>
                </div>

                <h3 className="text-base font-bold text-foreground">{evt.title}</h3>

                <div className="flex flex-wrap items-center gap-4 text-xs text-foreground-muted">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                    <span>{evt.startsAt.split("T")[0]}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                    <span className="truncate max-w-[200px]">{evt.location || "VCET Auditorium"}</span>
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-foreground">
                    <span className="material-symbols-outlined text-[14px]">group</span>
                    <span>Capacity: {evt.capacity}</span>
                  </span>
                </div>
              </div>

              {/* Actions Button Group */}
              <div className="flex flex-wrap items-center gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-border/60">
                {/* Registration Toggle */}
                <button
                  onClick={() => handleToggleRegistration(evt.slug, evt.isRegistrationOpen ?? true)}
                  disabled={actionLoading === evt.slug}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1 ${
                    evt.isRegistrationOpen
                      ? "border-emerald-200 bg-emerald-50 text-status-success hover:bg-emerald-100"
                      : "border-border bg-surface-container-low text-foreground-muted hover:bg-surface-container"
                  }`}
                  title="Toggle Registration"
                >
                  <span className="w-2 h-2 rounded-full bg-current"></span>
                  <span>{evt.isRegistrationOpen ? "Open" : "Closed"}</span>
                </button>

                {/* View Roster */}
                <Link
                  href={`/admin/events/${evt.slug}/registrations`}
                  className="px-3 py-1.5 rounded-xl border border-border bg-white text-foreground text-xs font-semibold hover:bg-surface-container transition-colors flex items-center gap-1"
                  title="View Roster"
                >
                  <span className="material-symbols-outlined text-[16px]">group</span>
                  <span className="hidden sm:inline">Roster</span>
                </Link>

                {/* QR Check-in */}
                <Link
                  href={`/admin/events/${evt.slug}/check-in`}
                  className="px-3 py-1.5 rounded-xl border border-border bg-white text-foreground text-xs font-semibold hover:bg-surface-container transition-colors flex items-center gap-1"
                  title="Scanner Terminal"
                >
                  <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
                  <span className="hidden sm:inline">Scanner</span>
                </Link>

                {/* Edit Event */}
                <Link
                  href={`/admin/events/${evt.slug}/edit`}
                  className="p-1.5 rounded-xl border border-border bg-white text-foreground hover:bg-surface-container transition-colors"
                  title="Edit Event Content"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </Link>

                {/* Duplicate Event */}
                <button
                  onClick={() => handleDuplicate(evt.slug)}
                  disabled={actionLoading === evt.slug}
                  className="p-1.5 rounded-xl border border-border bg-white text-foreground hover:bg-surface-container transition-colors"
                  title="Duplicate Event"
                >
                  <span className="material-symbols-outlined text-[18px]">content_copy</span>
                </button>

                {/* Public Link */}
                <Link
                  href={`/events/${evt.slug}`}
                  target="_blank"
                  className="p-1.5 rounded-xl border border-border bg-white text-foreground hover:bg-surface-container transition-colors"
                  title="Preview Public Page"
                >
                  <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                </Link>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(evt.slug, evt.title)}
                  disabled={actionLoading === evt.slug}
                  className="p-1.5 rounded-xl border border-border bg-white text-foreground-muted hover:text-status-error hover:bg-red-50 transition-colors"
                  title="Delete Event"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
