"use client";

import { useState } from "react";
import type { AgendaSession, ChapterEvent } from "@/types";

interface Props {
  events: ChapterEvent[];
  initialSessions: AgendaSession[];
}

export function AgendaBuilderView({ events, initialSessions }: Props) {
  const [selectedEvent, setSelectedEvent] = useState(events[0]?.slug || "devcraft-2025");
  const [sessions, setSessions] = useState<AgendaSession[]>(initialSessions);
  const [activeDay, setActiveDay] = useState<number>(1);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    day: 1,
    time: "10:00 AM – 11:15 AM",
    title: "",
    description: "",
    track: "all",
    trackLabel: "All Attendees",
    speaker: "",
    speakerRole: "",
    location: "Auditorium 402",
  });

  const filteredSessions = sessions.filter(
    (s) => (s.eventSlug === selectedEvent || !s.eventSlug) && s.day === activeDay
  );

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/admin/agenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          eventSlug: selectedEvent,
        }),
      });

      const data = await res.json();
      if (res.ok && data.session) {
        setSessions((prev) => [...prev, data.session]);
        setShowModal(false);
        setFormData({
          day: activeDay,
          time: "11:30 AM – 12:45 PM",
          title: "",
          description: "",
          track: "all",
          trackLabel: "All Attendees",
          speaker: "",
          speakerRole: "",
          location: "Auditorium 402",
        });
      } else {
        alert(data.error || "Failed to create session");
      }
    } catch {
      alert("Error adding session slot");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (id: string, title: string) => {
    if (!confirm(`Delete agenda slot "${title}"?`)) return;
    try {
      const res = await fetch(`/api/admin/agenda?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== id));
      }
    } catch {
      alert("Error deleting session");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Agenda &amp; Timeline Session Builder
          </h1>
          <p className="text-xs sm:text-sm text-foreground-muted mt-1">
            Build multi-day workshop timelines, assign parallel tracks, and manage speaker stages.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="px-3 py-2 rounded-xl border border-border bg-white text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs"
          >
            {events.map((e) => (
              <option key={e.slug} value={e.slug}>
                {e.title}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setFormData((prev) => ({ ...prev, day: activeDay }));
              setShowModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-hover transition-colors shadow-xs flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Add Session Slot</span>
          </button>
        </div>
      </div>

      {/* Day Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        {[1, 2].map((dayNum) => (
          <button
            key={dayNum}
            onClick={() => setActiveDay(dayNum)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeDay === dayNum
                ? "bg-primary text-on-primary shadow-xs"
                : "bg-surface-container-low text-foreground-muted hover:text-foreground"
            }`}
          >
            Day {dayNum} Sessions
          </button>
        ))}
      </div>

      {/* Sessions Timeline List */}
      <div className="flex flex-col gap-3">
        {filteredSessions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-border p-12 text-center text-foreground-muted">
            No sessions scheduled for Day {activeDay}. Click &quot;Add Session Slot&quot; to begin building your event timeline.
          </div>
        ) : (
          filteredSessions.map((session) => (
            <div
              key={session.id}
              className="bg-white rounded-2xl border border-border p-5 shadow-xs hover:border-primary/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                {/* Time Badge */}
                <div className="px-3 py-2 rounded-xl bg-surface-container-low border border-border/80 font-mono text-xs font-bold text-foreground sm:w-44 text-center shrink-0">
                  {session.time}
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-[10px] font-bold uppercase">
                      {session.track === "all" ? "Common Session" : session.track}
                    </span>
                    {session.location && (
                      <span className="text-[11px] text-foreground-muted flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[12px]">location_on</span>
                        <span>{session.location}</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-foreground">{session.title}</h3>

                  {session.description && (
                    <p className="text-xs text-foreground-muted leading-relaxed line-clamp-2">
                      {session.description}
                    </p>
                  )}

                  {session.speaker && (
                    <span className="text-[11px] text-primary font-medium mt-0.5">
                      Presenter: {session.speaker} {session.speakerRole && `(${session.speakerRole})`}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleDeleteSession(session.id, session.title)}
                className="p-1.5 rounded-xl border border-border text-foreground-muted hover:text-status-error hover:bg-red-50 transition-colors self-end sm:self-center"
                title="Delete Session"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add Session Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-border max-w-lg w-full p-6 sm:p-8 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Add Agenda Session Slot</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl border border-border text-foreground hover:bg-surface-container"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-foreground">Event Day</label>
                  <select
                    value={formData.day}
                    onChange={(e) => setFormData({ ...formData, day: parseInt(e.target.value) || 1 })}
                    className="px-3 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
                  >
                    <option value={1}>Day 1</option>
                    <option value={2}>Day 2</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-foreground">Time Interval *</label>
                  <input
                    type="text"
                    required
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    placeholder="09:30 AM – 10:45 AM"
                    className="px-3 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">Session Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Masterclass: Deploying Generative AI with Cloud Run"
                  className="px-3 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-foreground">Track Allocation</label>
                  <select
                    value={formData.track}
                    onChange={(e) => setFormData({ ...formData, track: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
                  >
                    <option value="all">Common (All Cohorts)</option>
                    <option value="track-a">Track A: Web & Gemini AI</option>
                    <option value="track-b">Track B: Cloud & GCP</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-foreground">Venue / Lab Room</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Auditorium 402"
                    className="px-3 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-foreground">Assigned Speaker</label>
                  <input
                    type="text"
                    value={formData.speaker}
                    onChange={(e) => setFormData({ ...formData, speaker: e.target.value })}
                    placeholder="e.g. Tanvi Patel"
                    className="px-3 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-foreground">Speaker Role</label>
                  <input
                    type="text"
                    value={formData.speakerRole}
                    onChange={(e) => setFormData({ ...formData, speakerRole: e.target.value })}
                    placeholder="Staff Engineer, Google"
                    className="px-3 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">Description & Objectives</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Hands-on coding lab covering Dockerfile optimizations..."
                  className="p-3 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-hover transition-colors shadow-xs"
              >
                {loading ? "Adding Slot..." : "Save Session Slot"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

