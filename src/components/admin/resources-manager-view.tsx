"use client";

import { useState } from "react";
import type { CommunityResource } from "@/types";

interface Props {
  initialResources: CommunityResource[];
}

export function ResourcesManagerView({ initialResources }: Props) {
  const [resources, setResources] = useState<CommunityResource[]>(initialResources);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "slides" as "slides" | "code" | "docs" | "video" | "tools",
    url: "",
    fileSize: "2.5 MB",
    tags: "React 19, Architecture",
    isPublic: true,
    author: "Tanvi Patel",
  });
  const [loading, setLoading] = useState(false);

  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const tagsArr = formData.tags
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/admin/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          tags: tagsArr,
        }),
      });

      const data = await res.json();
      if (res.ok && data.resource) {
        setResources((prev) => [data.resource, ...prev]);
        setShowModal(false);
        setFormData({
          title: "",
          description: "",
          category: "slides",
          url: "",
          fileSize: "2.5 MB",
          tags: "React 19, Architecture",
          isPublic: true,
          author: "Tanvi Patel",
        });
      } else {
        alert(data.error || "Failed to add resource");
      }
    } catch {
      alert("Error adding resource");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteResource = async (id: string, title: string) => {
    if (!confirm(`Delete resource "${title}"?`)) return;
    try {
      const res = await fetch(`/api/admin/resources?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setResources((prev) => prev.filter((r) => r.id !== id));
      }
    } catch {
      alert("Error deleting resource");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Community Learning Resources
          </h1>
          <p className="text-xs sm:text-sm text-foreground-muted mt-1">
            Manage open-source slide decks, starter code repositories, and laboratory guides.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-hover transition-colors shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          <span>Upload / Link Resource</span>
        </button>
      </div>

      {/* Resources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {resources.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl border border-dashed border-border p-12 text-center text-foreground-muted">
            No resources published yet. Add your first resource deck or repo!
          </div>
        ) : (
          resources.map((res) => (
            <div
              key={res.id}
              className="bg-white rounded-2xl border border-border p-5 shadow-xs flex flex-col justify-between gap-4"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-[10px] font-bold uppercase tracking-wider">
                    {res.category}
                  </span>

                  <button
                    onClick={() => handleDeleteResource(res.id, res.title)}
                    className="p-1 rounded-lg text-foreground-muted hover:text-status-error hover:bg-red-50 transition-colors"
                    title="Delete Resource"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>

                <div>
                  <h3 className="text-base font-bold text-foreground">{res.title}</h3>
                  <p className="mt-1 text-xs text-foreground-muted line-clamp-3 leading-relaxed">
                    {res.description}
                  </p>
                </div>

                {res.tags && res.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {res.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded bg-surface-container-low text-[10px] font-medium text-foreground-muted"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-foreground-muted">
                <span>By {res.author || "GDG VCET"}</span>
                <a
                  href={res.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary font-bold hover:underline flex items-center gap-1"
                >
                  <span>Access</span>
                  <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                </a>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Resource Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-border max-w-lg w-full p-6 sm:p-8 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Add Learning Resource</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl border border-border text-foreground hover:bg-surface-container"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateResource} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">Resource Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Gemini 1.5 Pro Multimodal Starter Kit"
                  className="px-3 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-foreground">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target.value as "slides" | "code" | "docs" | "video" | "tools",
                      })
                    }
                    className="px-3 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
                  >
                    <option value="slides">Slide Deck</option>
                    <option value="code">Code Repository</option>
                    <option value="docs">Documentation</option>
                    <option value="video">Session Recording</option>
                    <option value="tools">Tool / Template</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-foreground">Author / Speaker</label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    placeholder="e.g. Tanvi Patel"
                    className="px-3 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">Resource URL (GitHub / Drive) *</label>
                <input
                  type="url"
                  required
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://github.com/gdg-vcet/..."
                  className="px-3 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-foreground">File Size / Estimate</label>
                  <input
                    type="text"
                    value={formData.fileSize}
                    onChange={(e) => setFormData({ ...formData, fileSize: e.target.value })}
                    placeholder="e.g. 4.2 MB"
                    className="px-3 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-foreground">Topic Tags (Comma Separated)</label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="React, AI, Cloud"
                    className="px-3 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">Summary Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief details about what is included in this deck or repo..."
                  className="p-3 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-hover transition-colors shadow-xs"
              >
                {loading ? "Publishing..." : "Publish Resource"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
