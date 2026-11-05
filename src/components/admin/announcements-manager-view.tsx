"use client";

import { useState } from "react";
import type { Announcement, ChapterEvent } from "@/types";

interface Props {
  initialAnnouncements: Announcement[];
  events: ChapterEvent[];
}

export function AnnouncementsManagerView({ initialAnnouncements, events }: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    eventSlug: events[0]?.slug || "devcraft-2025",
    targetAudience: "registered" as "all" | "registered" | "checked-in" | "waitlisted",
    channel: "email" as "email" | "web" | "banner",
  });
  const [loading, setLoading] = useState(false);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok && data.announcement) {
        setAnnouncements((prev) => [data.announcement, ...prev]);
        setShowModal(false);
        setFormData({
          title: "",
          message: "",
          eventSlug: events[0]?.slug || "devcraft-2025",
          targetAudience: "registered",
          channel: "email",
        });
      } else {
        alert(data.error || "Failed to dispatch announcement");
      }
    } catch {
      alert("Error dispatching announcement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Announcements &amp; Cohort Broadcasts
          </h1>
          <p className="text-xs sm:text-sm text-foreground-muted mt-1">
            Dispatch laboratory preparation updates, venue guidance, and logistics to registered attendees.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-hover transition-colors shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[16px]">campaign</span>
          <span>Draft Announcement</span>
        </button>
      </div>

      {/* Grid of Announcements */}
      <div className="flex flex-col gap-4">
        {announcements.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-border p-12 text-center text-foreground-muted">
            No announcements broadcast yet. Draft your first communication update!
          </div>
        ) : (
          announcements.map((ann) => (
            <div
              key={ann.id}
              className="bg-white rounded-2xl border border-border p-6 shadow-xs flex flex-col gap-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-[10px] font-bold uppercase tracking-wider">
                    {ann.channel}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-surface-container text-foreground-muted text-[10px] font-semibold capitalize">
                    Cohort: {ann.targetAudience}
                  </span>
                  {ann.eventSlug && (
                    <span className="text-[11px] font-mono text-primary font-bold">
                      #{ann.eventSlug}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-foreground-muted">
                  <span className="flex items-center gap-1 text-status-success font-semibold">
                    <span className="material-symbols-outlined text-[14px]">done_all</span>
                    <span>Delivered to {ann.sentCount} recipients</span>
                  </span>
                  <span className="font-mono text-[11px]">{ann.createdAt?.split("T")[0]}</span>
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-foreground">{ann.title}</h3>
                <p className="mt-1.5 text-xs text-foreground-muted leading-relaxed whitespace-pre-line">
                  {ann.message}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Announcement Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-border max-w-lg w-full p-6 sm:p-8 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Draft Announcement Broadcast</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl border border-border text-foreground hover:bg-surface-container"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">Associated Event</label>
                <select
                  value={formData.eventSlug}
                  onChange={(e) => setFormData({ ...formData, eventSlug: e.target.value })}
                  className="px-3 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
                >
                  {events.map((e) => (
                    <option key={e.slug} value={e.slug}>
                      {e.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-foreground">Target Cohort</label>
                  <select
                    value={formData.targetAudience}
                    onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value as "all" | "registered" | "checked-in" | "waitlisted" })}
                    className="px-3 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
                  >
                    <option value="all">All Chapter Members</option>
                    <option value="registered">Confirmed Registered Attendees</option>
                    <option value="checked-in">Checked-In Attendees (Venue Only)</option>
                    <option value="waitlisted">Waitlisted Students</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-foreground">Delivery Channel</label>
                  <select
                    value={formData.channel}
                    onChange={(e) => setFormData({ ...formData, channel: e.target.value as "email" | "web" | "banner" })}
                    className="px-3 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
                  >
                    <option value="email">Email Notification</option>
                    <option value="web">Web Portal Notice</option>
                    <option value="banner">Site Banner</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">Subject / Announcement Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Lab 402 Workstation Setup & WiFi Credentials"
                  className="px-3 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">Detailed Message Body *</label>
                <textarea
                  rows={4}
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Instructions, timing, pre-requisite software, parking directions..."
                  className="p-3 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-hover transition-colors shadow-xs"
              >
                {loading ? "Transmitting..." : "Dispatch Announcement"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
