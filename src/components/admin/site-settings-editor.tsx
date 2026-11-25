"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  AboutCardItem,
  ChapterSettings,
  LearningArea,
  NavLink,
  SiteFaqItem,
  SocialLink,
  TeamMember,
} from "@/types";

interface SiteSettingsEditorProps {
  initialSettings: ChapterSettings;
}

type SettingsTab = "team" | "chapter" | "about" | "faqs";

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function SiteSettingsEditor({ initialSettings }: SiteSettingsEditorProps) {
  const router = useRouter();
  const [settings, setSettings] = useState<ChapterSettings>(initialSettings);
  const [activeTab, setActiveTab] = useState<SettingsTab>("team");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/admin/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
        settings?: ChapterSettings;
      };

      if (!res.ok || !data.success) {
        setErrorMessage(data.message || "Failed to save site settings.");
        setSaving(false);
        return;
      }

      if (data.settings) {
        setSettings(data.settings);
      }
      setSuccessMessage("Site settings & Team roster saved and live caches refreshed.");
      setSaving(false);
      router.refresh();
    } catch {
      setErrorMessage("Network error saving site settings.");
      setSaving(false);
    }
  }

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: "team", label: `Team Roster (${settings.team.length})` },
    { id: "chapter", label: "Chapter Info & Nav" },
    { id: "about", label: "About & Focus Areas" },
    { id: "faqs", label: `Home & Join FAQs (${settings.homeFaq.length + settings.joinFaq.length})` },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-border shadow-xs">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs text-foreground-muted">
            <Link href="/admin/console" className="hover:text-primary transition-colors">
              Admin Console
            </Link>
            <span>/</span>
            <span className="text-foreground font-semibold">Site &amp; Team CMS</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Chapter Site &amp; Team CMS
          </h1>
          <p className="text-xs sm:text-sm text-foreground-muted">
            Edit chapter copy, navigation links, team members, focus areas, and FAQs without touching code.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs sm:text-sm font-semibold hover:bg-primary-hover shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer shrink-0"
        >
          {saving ? "Saving..." : "Save Site Settings"}
        </button>
      </div>

      {errorMessage ? (
        <div role="alert" className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div role="status" className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between gap-3">
          <span>{successMessage}</span>
          <Link href="/" target="_blank" className="font-bold underline shrink-0">
            View Live Site →
          </Link>
        </div>
      ) : null}

      {/* Card with Tabs */}
      <div className="bg-white rounded-3xl border border-border shadow-xs overflow-hidden">
        <div className="h-1.5 grid grid-cols-4">
          <div className="bg-[#4285F4]" />
          <div className="bg-[#EA4335]" />
          <div className="bg-[#FBBC05]" />
          <div className="bg-[#34A853]" />
        </div>

        <div className="px-5 pt-3 border-b border-border flex items-center gap-2 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-foreground-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5 sm:p-6 flex flex-col gap-5">
          {/* TAB 1: TEAM ROSTER */}
          {activeTab === "team" ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-foreground-muted">
                  Add, reorder, or remove core organizers shown on the public <span className="font-mono">/team</span> page.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const member: TeamMember = {
                      id: makeId("team"),
                      name: "New Team Member",
                      role: "Core Team Member",
                      academicYear: "2026-27",
                      photo: "",
                      profileUrl: "",
                    };
                    setSettings((prev) => ({ ...prev, team: [...prev.team, member] }));
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:bg-primary-hover cursor-pointer"
                >
                  + Add Team Member
                </button>
              </div>

              {settings.team.map((member, idx) => (
                <div
                  key={member.id || idx}
                  className="p-4 rounded-2xl border border-border bg-surface-container-low/40 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase text-primary">
                      Member #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSettings((prev) => ({
                          ...prev,
                          team: prev.team.filter((_, i) => i !== idx),
                        }))
                      }
                      className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={member.name}
                      placeholder="Full Name"
                      onChange={(e) => {
                        const updated = settings.team.map((m, i) =>
                          i === idx ? { ...m, name: e.target.value } : m
                        );
                        setSettings((prev) => ({ ...prev, team: updated }));
                      }}
                      className="h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold"
                    />
                    <input
                      type="text"
                      value={member.role}
                      placeholder="Role (e.g. GDG Lead, Cloud Lead)"
                      onChange={(e) => {
                        const updated = settings.team.map((m, i) =>
                          i === idx ? { ...m, role: e.target.value } : m
                        );
                        setSettings((prev) => ({ ...prev, team: updated }));
                      }}
                      className="h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs"
                    />
                    <input
                      type="text"
                      value={member.academicYear || ""}
                      placeholder="Academic Year (e.g. TE Computer)"
                      onChange={(e) => {
                        const updated = settings.team.map((m, i) =>
                          i === idx ? { ...m, academicYear: e.target.value } : m
                        );
                        setSettings((prev) => ({ ...prev, team: updated }));
                      }}
                      className="h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={member.photo || ""}
                      placeholder="Avatar Photo URL or /images/..."
                      onChange={(e) => {
                        const updated = settings.team.map((m, i) =>
                          i === idx ? { ...m, photo: e.target.value } : m
                        );
                        setSettings((prev) => ({ ...prev, team: updated }));
                      }}
                      className="h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs"
                    />
                    <input
                      type="text"
                      value={member.profileUrl || ""}
                      placeholder="Profile URL (LinkedIn / GDG)"
                      onChange={(e) => {
                        const updated = settings.team.map((m, i) =>
                          i === idx ? { ...m, profileUrl: e.target.value } : m
                        );
                        setSettings((prev) => ({ ...prev, team: updated }));
                      }}
                      className="h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {/* TAB 2: CHAPTER INFO, SOCIALS & NAV */}
          {activeTab === "chapter" ? (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold uppercase text-slate-600">Chapter Name</label>
                  <input
                    type="text"
                    value={settings.chapter.name}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        chapter: { ...prev.chapter, name: e.target.value },
                      }))
                    }
                    className="h-10 px-3 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold uppercase text-slate-600">Short Name</label>
                  <input
                    type="text"
                    value={settings.chapter.shortName}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        chapter: { ...prev.chapter, shortName: e.target.value },
                      }))
                    }
                    className="h-10 px-3 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold uppercase text-slate-600">Institution</label>
                  <input
                    type="text"
                    value={settings.chapter.institution}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        chapter: { ...prev.chapter, institution: e.target.value },
                      }))
                    }
                    className="h-10 px-3 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold uppercase text-slate-600">Tagline (Home Hero)</label>
                  <input
                    type="text"
                    value={settings.chapter.tagline}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        chapter: { ...prev.chapter, tagline: e.target.value },
                      }))
                    }
                    className="h-10 px-3 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold uppercase text-slate-600">Join Community URL</label>
                  <input
                    type="text"
                    value={settings.chapter.joinUrl}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        chapter: { ...prev.chapter, joinUrl: e.target.value },
                      }))
                    }
                    className="h-10 px-3 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold uppercase text-slate-600">Chapter Page URL</label>
                  <input
                    type="text"
                    value={settings.chapter.chapterPageUrl}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        chapter: { ...prev.chapter, chapterPageUrl: e.target.value },
                      }))
                    }
                    className="h-10 px-3 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase text-slate-600">
                  Home / Chapter Description
                </label>
                <textarea
                  rows={3}
                  value={settings.chapter.description}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      chapter: { ...prev.chapter, description: e.target.value },
                    }))
                  }
                  className="p-3 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              {/* Navigation Links */}
              <div className="p-4 rounded-2xl border border-border bg-surface-container-low/40 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-700">
                    Header Navigation Links
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const nextNav: NavLink = { label: "Link", href: "/" };
                      setSettings((prev) => ({
                        ...prev,
                        chapter: {
                          ...prev.chapter,
                          nav: [...prev.chapter.nav, nextNav],
                        },
                      }));
                    }}
                    className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                  >
                    + Add Nav Link
                  </button>
                </div>
                {settings.chapter.nav.map((link, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={link.label}
                      placeholder="Label"
                      onChange={(e) => {
                        const updated = settings.chapter.nav.map((n, i) =>
                          i === idx ? { ...n, label: e.target.value } : n
                        );
                        setSettings((prev) => ({
                          ...prev,
                          chapter: { ...prev.chapter, nav: updated },
                        }));
                      }}
                      className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={link.href}
                        placeholder="/events"
                        onChange={(e) => {
                          const updated = settings.chapter.nav.map((n, i) =>
                            i === idx ? { ...n, href: e.target.value } : n
                          );
                          setSettings((prev) => ({
                            ...prev,
                            chapter: { ...prev.chapter, nav: updated },
                          }));
                        }}
                        className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs flex-1"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setSettings((prev) => ({
                            ...prev,
                            chapter: {
                              ...prev.chapter,
                              nav: prev.chapter.nav.filter((_, i) => i !== idx),
                            },
                          }))
                        }
                        className="px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Social Links */}
              <div className="p-4 rounded-2xl border border-border bg-surface-container-low/40 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-700">
                    Footer Social Links
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const nextSocial: SocialLink = { label: "Social", href: "https://" };
                      setSettings((prev) => ({
                        ...prev,
                        chapter: {
                          ...prev.chapter,
                          socials: [...prev.chapter.socials, nextSocial],
                        },
                      }));
                    }}
                    className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                  >
                    + Add Social
                  </button>
                </div>
                {settings.chapter.socials.map((soc, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={soc.label}
                      placeholder="Label (e.g. Instagram)"
                      onChange={(e) => {
                        const updated = settings.chapter.socials.map((s, i) =>
                          i === idx ? { ...s, label: e.target.value } : s
                        );
                        setSettings((prev) => ({
                          ...prev,
                          chapter: { ...prev.chapter, socials: updated },
                        }));
                      }}
                      className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={soc.href}
                        placeholder="https://..."
                        onChange={(e) => {
                          const updated = settings.chapter.socials.map((s, i) =>
                            i === idx ? { ...s, href: e.target.value } : s
                          );
                          setSettings((prev) => ({
                            ...prev,
                            chapter: { ...prev.chapter, socials: updated },
                          }));
                        }}
                        className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs flex-1"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setSettings((prev) => ({
                            ...prev,
                            chapter: {
                              ...prev.chapter,
                              socials: prev.chapter.socials.filter((_, i) => i !== idx),
                            },
                          }))
                        }
                        className="px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* TAB 3: ABOUT & FOCUS AREAS */}
          {activeTab === "about" ? (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase text-slate-600">
                  About Page Lead Description
                </label>
                <textarea
                  rows={3}
                  value={settings.aboutDescription}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, aboutDescription: e.target.value }))
                  }
                  className="p-3 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              {/* Learning / Focus Areas */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-700">
                    Focus / Learning Areas ({settings.learningAreas.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const nextArea: LearningArea = {
                        id: makeId("area"),
                        title: "New Focus Area",
                        description: "Description of the technology track.",
                      };
                      setSettings((prev) => ({
                        ...prev,
                        learningAreas: [...prev.learningAreas, nextArea],
                      }));
                    }}
                    className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                  >
                    + Add Learning Area
                  </button>
                </div>

                {settings.learningAreas.map((area, idx) => (
                  <div key={area.id || idx} className="p-3.5 rounded-xl border border-border bg-surface-container-low/40 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={area.title}
                        onChange={(e) => {
                          const updated = settings.learningAreas.map((item, i) =>
                            i === idx ? { ...item, title: e.target.value } : item
                          );
                          setSettings((prev) => ({ ...prev, learningAreas: updated }));
                        }}
                        className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-semibold flex-1"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setSettings((prev) => ({
                            ...prev,
                            learningAreas: prev.learningAreas.filter((_, i) => i !== idx),
                          }))
                        }
                        className="text-xs text-rose-600 hover:underline px-2 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={area.description}
                      onChange={(e) => {
                        const updated = settings.learningAreas.map((item, i) =>
                          i === idx ? { ...item, description: e.target.value } : item
                        );
                        setSettings((prev) => ({ ...prev, learningAreas: updated }));
                      }}
                      className="p-2.5 rounded-lg border border-slate-300 bg-white text-xs"
                    />
                  </div>
                ))}
              </div>

              {/* About Cards */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-700">
                    About Page Cards ({settings.aboutCards.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const nextCard: AboutCardItem = {
                        title: "New Card",
                        description: "Details shown on /about.",
                      };
                      setSettings((prev) => ({
                        ...prev,
                        aboutCards: [...prev.aboutCards, nextCard],
                      }));
                    }}
                    className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                  >
                    + Add Card
                  </button>
                </div>

                {settings.aboutCards.map((card, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-border bg-surface-container-low/40 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={card.title}
                        onChange={(e) => {
                          const updated = settings.aboutCards.map((item, i) =>
                            i === idx ? { ...item, title: e.target.value } : item
                          );
                          setSettings((prev) => ({ ...prev, aboutCards: updated }));
                        }}
                        className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-semibold flex-1"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setSettings((prev) => ({
                            ...prev,
                            aboutCards: prev.aboutCards.filter((_, i) => i !== idx),
                          }))
                        }
                        className="text-xs text-rose-600 hover:underline px-2 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={card.description}
                      onChange={(e) => {
                        const updated = settings.aboutCards.map((item, i) =>
                          i === idx ? { ...item, description: e.target.value } : item
                        );
                        setSettings((prev) => ({ ...prev, aboutCards: updated }));
                      }}
                      className="p-2.5 rounded-lg border border-slate-300 bg-white text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* TAB 4: HOME & JOIN FAQS */}
          {activeTab === "faqs" ? (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase text-slate-600">
                  Join Page Description
                </label>
                <textarea
                  rows={2}
                  value={settings.joinDescription}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, joinDescription: e.target.value }))
                  }
                  className="p-3 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              {/* Home FAQ */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-700">
                    Home Page FAQ ({settings.homeFaq.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const nextFaq: SiteFaqItem = { question: "New FAQ?", answer: "" };
                      setSettings((prev) => ({
                        ...prev,
                        homeFaq: [...prev.homeFaq, nextFaq],
                      }));
                    }}
                    className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                  >
                    + Add Home FAQ
                  </button>
                </div>

                {settings.homeFaq.map((fq, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-border bg-surface-container-low/40 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={fq.question}
                        onChange={(e) => {
                          const updated = settings.homeFaq.map((item, i) =>
                            i === idx ? { ...item, question: e.target.value } : item
                          );
                          setSettings((prev) => ({ ...prev, homeFaq: updated }));
                        }}
                        className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-semibold flex-1"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setSettings((prev) => ({
                            ...prev,
                            homeFaq: prev.homeFaq.filter((_, i) => i !== idx),
                          }))
                        }
                        className="text-xs text-rose-600 hover:underline px-2 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={fq.answer}
                      onChange={(e) => {
                        const updated = settings.homeFaq.map((item, i) =>
                          i === idx ? { ...item, answer: e.target.value } : item
                        );
                        setSettings((prev) => ({ ...prev, homeFaq: updated }));
                      }}
                      className="p-2.5 rounded-lg border border-slate-300 bg-white text-xs"
                    />
                  </div>
                ))}
              </div>

              {/* Join FAQ */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-700">
                    Join Page FAQ ({settings.joinFaq.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const nextFaq: SiteFaqItem = { question: "New Join FAQ?", answer: "" };
                      setSettings((prev) => ({
                        ...prev,
                        joinFaq: [...prev.joinFaq, nextFaq],
                      }));
                    }}
                    className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                  >
                    + Add Join FAQ
                  </button>
                </div>

                {settings.joinFaq.map((fq, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-border bg-surface-container-low/40 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={fq.question}
                        onChange={(e) => {
                          const updated = settings.joinFaq.map((item, i) =>
                            i === idx ? { ...item, question: e.target.value } : item
                          );
                          setSettings((prev) => ({ ...prev, joinFaq: updated }));
                        }}
                        className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-semibold flex-1"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setSettings((prev) => ({
                            ...prev,
                            joinFaq: prev.joinFaq.filter((_, i) => i !== idx),
                          }))
                        }
                        className="text-xs text-rose-600 hover:underline px-2 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={fq.answer}
                      onChange={(e) => {
                        const updated = settings.joinFaq.map((item, i) =>
                          i === idx ? { ...item, answer: e.target.value } : item
                        );
                        setSettings((prev) => ({ ...prev, joinFaq: updated }));
                      }}
                      className="p-2.5 rounded-lg border border-slate-300 bg-white text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
