"use client";

import { useState } from "react";
import type { WorkshopSpeaker } from "@/types";

interface Props {
  initialSpeakers: WorkshopSpeaker[];
}

export function SpeakersManagerView({ initialSpeakers }: Props) {
  const [speakers, setSpeakers] = useState<WorkshopSpeaker[]>(initialSpeakers);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    organization: "",
    badge: "",
    category: "keynote",
    bio: "",
    expertise: "React 19, Cloud Architecture, AI",
    linkedin: "",
    github: "",
    website: "",
    photo: "",
  });
  const [loading, setLoading] = useState(false);

  const handleCreateSpeaker = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const expertiseArr = formData.expertise
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/admin/speakers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          expertise: expertiseArr,
        }),
      });

      const data = await res.json();
      if (res.ok && data.speaker) {
        setSpeakers((prev) => [data.speaker, ...prev]);
        setShowModal(false);
        setFormData({
          name: "",
          role: "",
          organization: "",
          badge: "",
          category: "keynote",
          bio: "",
          expertise: "React 19, Cloud Architecture, AI",
          linkedin: "",
          github: "",
          website: "",
          photo: "",
        });
      } else {
        alert(data.error || "Failed to create speaker");
      }
    } catch {
      alert("Error adding speaker");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSpeaker = async (id: string, name: string) => {
    if (!confirm(`Delete speaker "${name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/speakers?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSpeakers((prev) => prev.filter((s) => s.id !== id));
      }
    } catch {
      alert("Error deleting speaker");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Speakers &amp; Technical Mentors
          </h1>
          <p className="text-xs sm:text-sm text-foreground-muted mt-1">
            Curate keynote speakers, workshop facilitators, and industry mentors for GDG events.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-hover transition-colors shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          <span>Add Speaker Profile</span>
        </button>
      </div>

      {/* Grid of Speakers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {speakers.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl border border-dashed border-border p-12 text-center text-foreground-muted">
            No speakers configured yet. Add your first speaker profile!
          </div>
        ) : (
          speakers.map((spk) => (
            <div
              key={spk.id}
              className="bg-white rounded-2xl border border-border p-5 shadow-xs flex flex-col justify-between gap-4"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center font-bold text-sm text-foreground uppercase border border-border">
                      {spk.name.slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{spk.name}</h3>
                      <p className="text-xs text-foreground-muted">{spk.role}</p>
                      <p className="text-[11px] text-primary font-medium">{spk.organization}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteSpeaker(spk.id, spk.name)}
                    className="p-1 rounded-lg text-foreground-muted hover:text-status-error hover:bg-red-50 transition-colors"
                    title="Delete Speaker"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>

                {spk.bio && (
                  <p className="text-xs text-foreground-muted line-clamp-3 leading-relaxed">
                    {spk.bio}
                  </p>
                )}

                {(spk.tags || spk.expertise) && (spk.tags || spk.expertise)!.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(spk.tags || spk.expertise)!.map((tag: string) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-md bg-surface-container-low text-[10px] font-medium text-foreground-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-foreground-muted">
                <span className="capitalize px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-[10px] font-bold">
                  {spk.category || "keynote"}
                </span>

                <div className="flex items-center gap-2">
                  {(spk.socials?.linkedin || spk.linkedin) && (
                    <a
                      href={spk.socials?.linkedin || spk.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground-muted hover:text-primary"
                    >
                      LinkedIn
                    </a>
                  )}
                  {(spk.socials?.github || spk.github) && (
                    <a
                      href={spk.socials?.github || spk.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground-muted hover:text-foreground"
                    >
                      GitHub
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Speaker Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-border max-w-lg w-full p-6 sm:p-8 shadow-xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Add Speaker Profile</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl border border-border text-foreground hover:bg-surface-container"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSpeaker} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-foreground">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Tanvi Patel"
                    className="px-3 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-foreground">Job Title / Role *</label>
                  <input
                    type="text"
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="e.g. Staff Software Engineer"
                    className="px-3 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-foreground">Company / Organization *</label>
                  <input
                    type="text"
                    required
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    placeholder="e.g. Google Cloud"
                    className="px-3 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-foreground">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
                  >
                    <option value="keynote">Keynote Speaker</option>
                    <option value="mentor">Technical Mentor</option>
                    <option value="panelist">Panellist</option>
                    <option value="lightning">Lightning Talk</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">Expertise Topics (Comma Separated)</label>
                <input
                  type="text"
                  value={formData.expertise}
                  onChange={(e) => setFormData({ ...formData, expertise: e.target.value })}
                  placeholder="React 19, Gemini AI, GCP, Kubernetes"
                  className="px-3 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">Bio / Experience Summary</label>
                <textarea
                  rows={3}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Brief background on the speaker's industry experience..."
                  className="p-3 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-foreground">LinkedIn URL</label>
                  <input
                    type="url"
                    value={formData.linkedin}
                    onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                    placeholder="https://linkedin.com/in/..."
                    className="px-3 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-foreground">GitHub URL</label>
                  <input
                    type="url"
                    value={formData.github}
                    onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                    placeholder="https://github.com/..."
                    className="px-3 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-hover transition-colors shadow-xs"
              >
                {loading ? "Saving Profile..." : "Create Speaker Profile"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
