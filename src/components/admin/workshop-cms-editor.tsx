"use client";

import { useState } from "react";
import { createStarterWorkshopDetails } from "@/lib/site-defaults";
import type {
  AgendaSession,
  WorkshopDetails,
  WorkshopFaq,
  WorkshopSpeaker,
  WorkshopSponsor,
  WorkshopTrack,
} from "@/types";

interface WorkshopCmsEditorProps {
  workshop: WorkshopDetails | undefined;
  onChange: (workshop: WorkshopDetails | undefined) => void;
  defaultTitle: string;
  defaultSummary?: string;
  defaultVenue?: string;
  defaultCapacity: number;
  defaultIsOpen: boolean;
}

type CmsTab = "overview" | "agenda" | "speakers" | "sponsors" | "faq";

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function splitCommaList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function WorkshopCmsEditor({
  workshop,
  onChange,
  defaultTitle,
  defaultSummary,
  defaultVenue,
  defaultCapacity,
  defaultIsOpen,
}: WorkshopCmsEditorProps) {
  const [activeTab, setActiveTab] = useState<CmsTab>("overview");

  if (!workshop) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900">
              Rich Workshop Experience (Agenda, Speakers, Sponsors &amp; FAQ)
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold uppercase">
              Off
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Enable Workshop Mode to unlock custom Agenda, Speakers, Sponsors, Tracks, Departments, and FAQ tabs managed right from this console.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            onChange(
              createStarterWorkshopDetails({
                title: defaultTitle || "Chapter Workshop",
                summary: defaultSummary,
                venueText: defaultVenue,
                capacity: defaultCapacity || 120,
                isOpen: defaultIsOpen,
              })
            )
          }
          className="shrink-0 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:bg-primary-hover transition-all cursor-pointer shadow-2xs"
        >
          + Enable Workshop Mode
        </button>
      </div>
    );
  }

  function updateWorkshop(patch: Partial<WorkshopDetails>) {
    if (!workshop) return;
    onChange({ ...workshop, ...patch });
  }

  const tabs: { id: CmsTab; label: string }[] = [
    { id: "overview", label: "Workshop & Reg Config" },
    { id: "agenda", label: `Agenda (${workshop.agenda.length})` },
    { id: "speakers", label: `Speakers (${workshop.speakers.length})` },
    { id: "sponsors", label: `Sponsors (${workshop.sponsors.length})` },
    { id: "faq", label: `FAQ (${workshop.faq.length})` },
  ];

  const tracks = workshop.registrationConfig?.tracks || [];

  return (
    <div className="rounded-2xl border border-border bg-surface-container-low/40 overflow-hidden">
      {/* Header & Tabs */}
      <div className="px-4 py-3 bg-white border-b border-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <h3 className="text-sm font-bold text-foreground">
            Workshop Content &amp; Pages CMS
          </h3>
        </div>

        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 px-2.5 py-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
        >
          Disable Workshop Mode
        </button>
      </div>

      <div className="px-4 pt-2.5 bg-white border-b border-border flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-foreground-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4 sm:p-5 flex flex-col gap-4">
        {/* TAB 1: Overview & Registration Config */}
        {activeTab === "overview" ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase text-slate-600">
                  Hero Headline
                </label>
                <input
                  type="text"
                  value={workshop.headline}
                  onChange={(e) => updateWorkshop({ headline: e.target.value })}
                  className="h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs text-slate-900"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase text-slate-600">
                  Top Badge Text
                </label>
                <input
                  type="text"
                  value={workshop.badgeText}
                  onChange={(e) => updateWorkshop({ badgeText: e.target.value })}
                  className="h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs text-slate-900"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase text-slate-600">
                  Display Dates Text
                </label>
                <input
                  type="text"
                  value={workshop.datesText}
                  onChange={(e) => updateWorkshop({ datesText: e.target.value })}
                  placeholder="e.g. Nov 19 – Nov 22, 2026"
                  className="h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs text-slate-900"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase text-slate-600">
                  Seats Display Label
                </label>
                <input
                  type="text"
                  value={workshop.seatsText}
                  onChange={(e) => updateWorkshop({ seatsText: e.target.value })}
                  placeholder="e.g. Limited to 135 Seats"
                  className="h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs text-slate-900"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase text-slate-600">
                Hero Subheading
              </label>
              <textarea
                rows={2}
                value={workshop.subheading}
                onChange={(e) => updateWorkshop({ subheading: e.target.value })}
                className="p-3 rounded-xl border border-slate-300 bg-white text-xs text-slate-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white border border-border cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-slate-800">Speakers TBD Banner</div>
                  <div className="text-[11px] text-slate-500">Show &ldquo;To Be Announced&rdquo; mode on Speakers page</div>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(workshop.speakersTbd)}
                  onChange={(e) => updateWorkshop({ speakersTbd: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
              </label>

              <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white border border-border cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-slate-800">Show Sponsors Tab</div>
                  <div className="text-[11px] text-slate-500">Display the Sponsors navigation link publicly</div>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(workshop.showSponsors)}
                  onChange={(e) => updateWorkshop({ showSponsors: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
              </label>
            </div>

            {/* Registration Form Dropdown Options */}
            <div className="p-4 rounded-xl bg-white border border-border flex flex-col gap-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Registration Form Options
              </h4>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-slate-600">
                    Departments (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={(workshop.registrationConfig?.departments || []).join(", ")}
                    onChange={(e) =>
                      updateWorkshop({
                        registrationConfig: {
                          ...workshop.registrationConfig,
                          departments: splitCommaList(e.target.value),
                        },
                      })
                    }
                    className="h-9 px-3 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-slate-600">
                    Years of Study (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={(workshop.registrationConfig?.yearsOfStudy || []).join(", ")}
                    onChange={(e) =>
                      updateWorkshop({
                        registrationConfig: {
                          ...workshop.registrationConfig,
                          yearsOfStudy: splitCommaList(e.target.value),
                        },
                      })
                    }
                    className="h-9 px-3 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-slate-600">
                    Experience Levels (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={(workshop.registrationConfig?.experienceLevels || []).join(", ")}
                    onChange={(e) =>
                      updateWorkshop({
                        registrationConfig: {
                          ...workshop.registrationConfig,
                          experienceLevels: splitCommaList(e.target.value),
                        },
                      })
                    }
                    className="h-9 px-3 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
              </div>

              {/* Tracks Editor */}
              <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-slate-600">
                    Registration Tracks ({tracks.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const nextTrack: WorkshopTrack = {
                        id: makeId("track"),
                        name: "New Track",
                        description: "Track description",
                        badge: "All Days",
                        icon: "code",
                      };
                      updateWorkshop({
                        registrationConfig: {
                          ...workshop.registrationConfig,
                          tracks: [...tracks, nextTrack],
                        },
                      });
                    }}
                    className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                  >
                    + Add Track
                  </button>
                </div>

                {tracks.map((tr, idx) => (
                  <div key={tr.id || idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={tr.name}
                      placeholder="Track Name"
                      onChange={(e) => {
                        const updated = tracks.map((item, i) =>
                          i === idx ? { ...item, name: e.target.value } : item
                        );
                        updateWorkshop({
                          registrationConfig: { ...workshop.registrationConfig, tracks: updated },
                        });
                      }}
                      className="h-8 px-2.5 rounded border border-slate-300 bg-white text-xs"
                    />
                    <input
                      type="text"
                      value={tr.badge}
                      placeholder="Badge (e.g. Recommended)"
                      onChange={(e) => {
                        const updated = tracks.map((item, i) =>
                          i === idx ? { ...item, badge: e.target.value } : item
                        );
                        updateWorkshop({
                          registrationConfig: { ...workshop.registrationConfig, tracks: updated },
                        });
                      }}
                      className="h-8 px-2.5 rounded border border-slate-300 bg-white text-xs"
                    />
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={tr.description}
                        placeholder="Short description"
                        onChange={(e) => {
                          const updated = tracks.map((item, i) =>
                            i === idx ? { ...item, description: e.target.value } : item
                          );
                          updateWorkshop({
                            registrationConfig: { ...workshop.registrationConfig, tracks: updated },
                          });
                        }}
                        className="h-8 px-2.5 rounded border border-slate-300 bg-white text-xs flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          updateWorkshop({
                            registrationConfig: {
                              ...workshop.registrationConfig,
                              tracks: tracks.filter((_, i) => i !== idx),
                            },
                          });
                        }}
                        className="px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {/* TAB 2: Agenda Builder */}
        {activeTab === "agenda" ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-600">
                Manage workshop sessions across days cleanly.
              </p>
              <button
                type="button"
                onClick={() => {
                  const newSession: AgendaSession = {
                    id: makeId("session"),
                    title: "New Workshop Session",
                    description: "",
                    time: "10:00 AM – 11:30 AM",
                    track: "tech",
                    trackLabel: "Tech Session",
                    speaker: "",
                    location: "Main Seminar Hall",
                    tags: [],
                    day: 1,
                  };
                  updateWorkshop({ agenda: [...workshop.agenda, newSession] });
                }}
                className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary-hover cursor-pointer"
              >
                + Add Session
              </button>
            </div>

            {workshop.agenda.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-white border border-border text-xs text-slate-500">
                No agenda sessions added yet. Click &ldquo;+ Add Session&rdquo; to begin.
              </div>
            ) : (
              workshop.agenda.map((session, idx) => (
                <div
                  key={session.id || idx}
                  className="p-3.5 rounded-xl bg-white border border-border flex flex-col gap-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase text-primary">
                      Session #{idx + 1} · Day {session.day}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateWorkshop({
                          agenda: workshop.agenda.filter((_, i) => i !== idx),
                        })
                      }
                      className="text-xs text-rose-600 hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input
                      type="text"
                      value={session.title}
                      placeholder="Session Title"
                      onChange={(e) => {
                        const updated = workshop.agenda.map((item, i) =>
                          i === idx ? { ...item, title: e.target.value } : item
                        );
                        updateWorkshop({ agenda: updated });
                      }}
                      className="h-9 px-2.5 rounded-lg border border-slate-300 text-xs sm:col-span-2 font-semibold"
                    />
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] font-semibold text-slate-500 shrink-0">Day</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={session.day}
                        onChange={(e) => {
                          const updated = workshop.agenda.map((item, i) =>
                            i === idx ? { ...item, day: Number(e.target.value) || 1 } : item
                          );
                          updateWorkshop({ agenda: updated });
                        }}
                        className="h-9 px-2.5 rounded-lg border border-slate-300 text-xs w-full"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input
                      type="text"
                      value={session.time}
                      placeholder="Time (e.g. 10:00 AM – 11:30 AM)"
                      onChange={(e) => {
                        const updated = workshop.agenda.map((item, i) =>
                          i === idx ? { ...item, time: e.target.value } : item
                        );
                        updateWorkshop({ agenda: updated });
                      }}
                      className="h-9 px-2.5 rounded-lg border border-slate-300 text-xs"
                    />
                    <select
                      value={session.track}
                      onChange={(e) => {
                        const updated = workshop.agenda.map((item, i) =>
                          i === idx
                            ? { ...item, track: e.target.value as AgendaSession["track"] }
                            : item
                        );
                        updateWorkshop({ agenda: updated });
                      }}
                      className="h-9 px-2.5 rounded-lg border border-slate-300 text-xs bg-white"
                    >
                      <option value="all">All</option>
                      <option value="tech">Tech Session</option>
                      <option value="lab">Hands-on Lab</option>
                      <option value="keynote">Keynote</option>
                      <option value="break">Break / Networking</option>
                    </select>
                    <input
                      type="text"
                      value={session.speaker || ""}
                      placeholder="Speaker Name(s)"
                      onChange={(e) => {
                        const updated = workshop.agenda.map((item, i) =>
                          i === idx ? { ...item, speaker: e.target.value } : item
                        );
                        updateWorkshop({ agenda: updated });
                      }}
                      className="h-9 px-2.5 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      value={session.location || ""}
                      placeholder="Room / Venue"
                      onChange={(e) => {
                        const updated = workshop.agenda.map((item, i) =>
                          i === idx ? { ...item, location: e.target.value } : item
                        );
                        updateWorkshop({ agenda: updated });
                      }}
                      className="h-9 px-2.5 rounded-lg border border-slate-300 text-xs"
                    />
                    <input
                      type="text"
                      value={(session.tags || []).join(", ")}
                      placeholder="Tags (comma-separated)"
                      onChange={(e) => {
                        const updated = workshop.agenda.map((item, i) =>
                          i === idx ? { ...item, tags: splitCommaList(e.target.value) } : item
                        );
                        updateWorkshop({ agenda: updated });
                      }}
                      className="h-9 px-2.5 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>

                  <textarea
                    rows={2}
                    value={session.description || ""}
                    placeholder="Session summary / learning outcomes"
                    onChange={(e) => {
                      const updated = workshop.agenda.map((item, i) =>
                        i === idx ? { ...item, description: e.target.value } : item
                      );
                      updateWorkshop({ agenda: updated });
                    }}
                    className="p-2.5 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
              ))
            )}
          </div>
        ) : null}

        {/* TAB 3: Speakers Manager */}
        {activeTab === "speakers" ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-600">
                Add instructors, keynote speakers, mentors, and leads.
              </p>
              <button
                type="button"
                onClick={() => {
                  const sp: WorkshopSpeaker = {
                    id: makeId("speaker"),
                    name: "New Speaker",
                    role: "Speaker",
                    organization: "GDG on Campus VCET",
                    category: "hands-on",
                    topicTitle: "",
                    topicDescription: "",
                    tags: [],
                    photo: "",
                    socials: {},
                  };
                  updateWorkshop({ speakers: [...workshop.speakers, sp] });
                }}
                className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary-hover cursor-pointer"
              >
                + Add Speaker
              </button>
            </div>

            {workshop.speakers.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-white border border-border text-xs text-slate-500">
                No speakers added yet. Click &ldquo;+ Add Speaker&rdquo; to add one.
              </div>
            ) : (
              workshop.speakers.map((sp, idx) => (
                <div
                  key={sp.id || idx}
                  className="p-3.5 rounded-xl bg-white border border-border flex flex-col gap-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase text-primary">
                      Speaker #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateWorkshop({
                          speakers: workshop.speakers.filter((_, i) => i !== idx),
                        })
                      }
                      className="text-xs text-rose-600 hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input
                      type="text"
                      value={sp.name}
                      placeholder="Full Name"
                      onChange={(e) => {
                        const updated = workshop.speakers.map((item, i) =>
                          i === idx ? { ...item, name: e.target.value } : item
                        );
                        updateWorkshop({ speakers: updated });
                      }}
                      className="h-9 px-2.5 rounded-lg border border-slate-300 text-xs font-semibold"
                    />
                    <input
                      type="text"
                      value={sp.role}
                      placeholder="Role / Title"
                      onChange={(e) => {
                        const updated = workshop.speakers.map((item, i) =>
                          i === idx ? { ...item, role: e.target.value } : item
                        );
                        updateWorkshop({ speakers: updated });
                      }}
                      className="h-9 px-2.5 rounded-lg border border-slate-300 text-xs"
                    />
                    <select
                      value={sp.category}
                      onChange={(e) => {
                        const updated = workshop.speakers.map((item, i) =>
                          i === idx
                            ? { ...item, category: e.target.value as WorkshopSpeaker["category"] }
                            : item
                        );
                        updateWorkshop({ speakers: updated });
                      }}
                      className="h-9 px-2.5 rounded-lg border border-slate-300 text-xs bg-white"
                    >
                      <option value="keynote">Keynote</option>
                      <option value="hands-on">Hands-on Lab</option>
                      <option value="mentors">Mentor</option>
                      <option value="leads">Lead / Organizer</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      value={sp.organization}
                      placeholder="Organization"
                      onChange={(e) => {
                        const updated = workshop.speakers.map((item, i) =>
                          i === idx ? { ...item, organization: e.target.value } : item
                        );
                        updateWorkshop({ speakers: updated });
                      }}
                      className="h-9 px-2.5 rounded-lg border border-slate-300 text-xs"
                    />
                    <input
                      type="text"
                      value={sp.photo || ""}
                      placeholder="Photo URL (optional)"
                      onChange={(e) => {
                        const updated = workshop.speakers.map((item, i) =>
                          i === idx ? { ...item, photo: e.target.value } : item
                        );
                        updateWorkshop({ speakers: updated });
                      }}
                      className="h-9 px-2.5 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      value={sp.topicTitle || ""}
                      placeholder="Talk / Session Title"
                      onChange={(e) => {
                        const updated = workshop.speakers.map((item, i) =>
                          i === idx ? { ...item, topicTitle: e.target.value } : item
                        );
                        updateWorkshop({ speakers: updated });
                      }}
                      className="h-9 px-2.5 rounded-lg border border-slate-300 text-xs"
                    />
                    <input
                      type="text"
                      value={(sp.tags || []).join(", ")}
                      placeholder="Tags (comma-separated)"
                      onChange={(e) => {
                        const updated = workshop.speakers.map((item, i) =>
                          i === idx ? { ...item, tags: splitCommaList(e.target.value) } : item
                        );
                        updateWorkshop({ speakers: updated });
                      }}
                      className="h-9 px-2.5 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input
                      type="text"
                      value={sp.socials?.linkedin || ""}
                      placeholder="LinkedIn URL"
                      onChange={(e) => {
                        const updated = workshop.speakers.map((item, i) =>
                          i === idx
                            ? { ...item, socials: { ...(item.socials || {}), linkedin: e.target.value } }
                            : item
                        );
                        updateWorkshop({ speakers: updated });
                      }}
                      className="h-8 px-2.5 rounded-lg border border-slate-300 text-xs"
                    />
                    <input
                      type="text"
                      value={sp.socials?.github || ""}
                      placeholder="GitHub URL"
                      onChange={(e) => {
                        const updated = workshop.speakers.map((item, i) =>
                          i === idx
                            ? { ...item, socials: { ...(item.socials || {}), github: e.target.value } }
                            : item
                        );
                        updateWorkshop({ speakers: updated });
                      }}
                      className="h-8 px-2.5 rounded-lg border border-slate-300 text-xs"
                    />
                    <input
                      type="text"
                      value={sp.socials?.twitter || ""}
                      placeholder="X / Twitter URL"
                      onChange={(e) => {
                        const updated = workshop.speakers.map((item, i) =>
                          i === idx
                            ? { ...item, socials: { ...(item.socials || {}), twitter: e.target.value } }
                            : item
                        );
                        updateWorkshop({ speakers: updated });
                      }}
                      className="h-8 px-2.5 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        ) : null}

        {/* TAB 4: Sponsors Manager */}
        {activeTab === "sponsors" ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-600">
                Manage sponsors and ecosystem partners.
              </p>
              <button
                type="button"
                onClick={() => {
                  const sp: WorkshopSponsor = {
                    id: makeId("sponsor"),
                    name: "New Partner",
                    tier: "ecosystem",
                    badge: "Community Partner",
                    description: "",
                    url: "",
                    logo: "",
                  };
                  updateWorkshop({ sponsors: [...workshop.sponsors, sp] });
                }}
                className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary-hover cursor-pointer"
              >
                + Add Sponsor
              </button>
            </div>

            {workshop.sponsors.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-white border border-border text-xs text-slate-500">
                No sponsors added yet. Click &ldquo;+ Add Sponsor&rdquo; to create one.
              </div>
            ) : (
              workshop.sponsors.map((sp, idx) => (
                <div
                  key={sp.id || idx}
                  className="p-3.5 rounded-xl bg-white border border-border flex flex-col gap-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase text-primary">
                      Sponsor #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateWorkshop({
                          sponsors: workshop.sponsors.filter((_, i) => i !== idx),
                        })
                      }
                      className="text-xs text-rose-600 hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input
                      type="text"
                      value={sp.name}
                      placeholder="Sponsor / Partner Name"
                      onChange={(e) => {
                        const updated = workshop.sponsors.map((item, i) =>
                          i === idx ? { ...item, name: e.target.value } : item
                        );
                        updateWorkshop({ sponsors: updated });
                      }}
                      className="h-9 px-2.5 rounded-lg border border-slate-300 text-xs font-semibold"
                    />
                    <select
                      value={sp.tier}
                      onChange={(e) => {
                        const updated = workshop.sponsors.map((item, i) =>
                          i === idx
                            ? { ...item, tier: e.target.value as WorkshopSponsor["tier"] }
                            : item
                        );
                        updateWorkshop({ sponsors: updated });
                      }}
                      className="h-9 px-2.5 rounded-lg border border-slate-300 text-xs bg-white"
                    >
                      <option value="title">Title Sponsor</option>
                      <option value="gold">Gold Sponsor</option>
                      <option value="platform">Platform Partner</option>
                      <option value="ecosystem">Ecosystem Partner</option>
                    </select>
                    <input
                      type="text"
                      value={sp.badge || ""}
                      placeholder="Badge (optional)"
                      onChange={(e) => {
                        const updated = workshop.sponsors.map((item, i) =>
                          i === idx ? { ...item, badge: e.target.value } : item
                        );
                        updateWorkshop({ sponsors: updated });
                      }}
                      className="h-9 px-2.5 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      value={sp.url || ""}
                      placeholder="Website URL (https://...)"
                      onChange={(e) => {
                        const updated = workshop.sponsors.map((item, i) =>
                          i === idx ? { ...item, url: e.target.value } : item
                        );
                        updateWorkshop({ sponsors: updated });
                      }}
                      className="h-9 px-2.5 rounded-lg border border-slate-300 text-xs"
                    />
                    <input
                      type="text"
                      value={sp.logo || ""}
                      placeholder="Logo Path or URL"
                      onChange={(e) => {
                        const updated = workshop.sponsors.map((item, i) =>
                          i === idx ? { ...item, logo: e.target.value } : item
                        );
                        updateWorkshop({ sponsors: updated });
                      }}
                      className="h-9 px-2.5 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>

                  <textarea
                    rows={2}
                    value={sp.description || ""}
                    placeholder="Sponsor description"
                    onChange={(e) => {
                      const updated = workshop.sponsors.map((item, i) =>
                        i === idx ? { ...item, description: e.target.value } : item
                      );
                      updateWorkshop({ sponsors: updated });
                    }}
                    className="p-2.5 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
              ))
            )}
          </div>
        ) : null}

        {/* TAB 5: Workshop FAQs */}
        {activeTab === "faq" ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-600">
                Manage event-specific FAQ questions shown on the workshop page.
              </p>
              <button
                type="button"
                onClick={() => {
                  const faqItem: WorkshopFaq = {
                    question: "New Frequently Asked Question",
                    answer: "",
                    category: "General",
                  };
                  updateWorkshop({ faq: [...workshop.faq, faqItem] });
                }}
                className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary-hover cursor-pointer"
              >
                + Add FAQ
              </button>
            </div>

            {workshop.faq.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-white border border-border text-xs text-slate-500">
                No event FAQs configured yet. Click &ldquo;+ Add FAQ&rdquo; to add one.
              </div>
            ) : (
              workshop.faq.map((fq, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-white border border-border flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={fq.question}
                      placeholder="Question"
                      onChange={(e) => {
                        const updated = workshop.faq.map((item, i) =>
                          i === idx ? { ...item, question: e.target.value } : item
                        );
                        updateWorkshop({ faq: updated });
                      }}
                      className="h-9 px-2.5 rounded-lg border border-slate-300 text-xs font-semibold flex-1"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateWorkshop({
                          faq: workshop.faq.filter((_, i) => i !== idx),
                        })
                      }
                      className="text-xs text-rose-600 hover:underline px-2 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={fq.answer}
                    placeholder="Answer"
                    onChange={(e) => {
                      const updated = workshop.faq.map((item, i) =>
                        i === idx ? { ...item, answer: e.target.value } : item
                      );
                      updateWorkshop({ faq: updated });
                    }}
                    className="p-2.5 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
              ))
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
