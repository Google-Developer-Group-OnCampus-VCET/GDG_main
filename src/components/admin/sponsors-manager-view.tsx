"use client";

import { useState } from "react";
import type { WorkshopSponsor } from "@/types";

interface Props {
  initialSponsors: WorkshopSponsor[];
}

export function SponsorsManagerView({ initialSponsors }: Props) {
  const [sponsors, setSponsors] = useState<WorkshopSponsor[]>(initialSponsors);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    tier: "gold",
    description: "",
    website: "",
    logo: "",
    contribution: "",
    status: "approved",
  });
  const [loading, setLoading] = useState(false);

  const handleCreateSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/admin/sponsors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok && data.sponsor) {
        setSponsors((prev) => [data.sponsor, ...prev]);
        setShowModal(false);
        setFormData({
          name: "",
          tier: "gold",
          description: "",
          website: "",
          logo: "",
          contribution: "",
          status: "approved",
        });
      } else {
        alert(data.error || "Failed to add sponsor");
      }
    } catch {
      alert("Error adding sponsor");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSponsor = async (id: string, name: string) => {
    if (!confirm(`Delete sponsor partner "${name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/sponsors?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSponsors((prev) => prev.filter((s) => s.id !== id));
      }
    } catch {
      alert("Error deleting sponsor");
    }
  };

  const tierColors: Record<string, { bg: string; text: string }> = {
    title: { bg: "bg-purple-100", text: "text-purple-800" },
    platinum: { bg: "bg-slate-200", text: "text-slate-900" },
    gold: { bg: "bg-amber-100", text: "text-amber-800" },
    silver: { bg: "bg-gray-100", text: "text-gray-800" },
    community: { bg: "bg-blue-100", text: "text-blue-800" },
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Sponsors &amp; Industry Partners
          </h1>
          <p className="text-xs sm:text-sm text-foreground-muted mt-1">
            Manage corporate sponsorships, non-profit grant allocations, and cloud credit providers.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-hover transition-colors shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          <span>Add Sponsor Partner</span>
        </button>
      </div>

      {/* Sponsors Table / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {sponsors.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl border border-dashed border-border p-12 text-center text-foreground-muted">
            No sponsors registered. Add your first community sponsor!
          </div>
        ) : (
          sponsors.map((sp) => {
            const style = tierColors[sp.tier.toLowerCase()] || tierColors.gold;

            return (
              <div
                key={sp.id}
                className="bg-white rounded-2xl border border-border p-5 shadow-xs flex flex-col justify-between gap-4"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${style.bg} ${style.text}`}>
                        {sp.tier} Partner
                      </span>
                      <h3 className="text-base font-bold text-foreground mt-1.5">{sp.name}</h3>
                    </div>

                    <button
                      onClick={() => handleDeleteSponsor(sp.id, sp.name)}
                      className="p-1 rounded-lg text-foreground-muted hover:text-status-error hover:bg-red-50 transition-colors"
                      title="Delete Sponsor"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>

                  {sp.description && (
                    <p className="text-xs text-foreground-muted leading-relaxed line-clamp-3">
                      {sp.description}
                    </p>
                  )}

                  {sp.contribution && (
                    <div className="p-2.5 rounded-xl bg-surface-container-low border border-border/60 text-xs">
                      <span className="text-[10px] uppercase font-bold text-foreground-muted">Contribution:</span>
                      <p className="font-semibold text-foreground mt-0.5">{sp.contribution}</p>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                  <span className="capitalize px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    {sp.status || "approved"}
                  </span>

                  {(sp.website || sp.url) && (
                    <a
                      href={sp.website || sp.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary font-bold hover:underline flex items-center gap-1"
                    >
                      <span>Website</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_outward</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Sponsor Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-border max-w-lg w-full p-6 sm:p-8 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Add Sponsor Partner</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl border border-border text-foreground hover:bg-surface-container"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSponsor} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">Company / Organization Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Google Cloud for Startups"
                  className="px-3 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-foreground">Sponsorship Tier</label>
                  <select
                    value={formData.tier}
                    onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
                  >
                    <option value="title">Title Sponsor</option>
                    <option value="platinum">Platinum Sponsor</option>
                    <option value="gold">Gold Sponsor</option>
                    <option value="silver">Silver Sponsor</option>
                    <option value="community">Community / In-Kind</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-foreground">Contribution Details</label>
                  <input
                    type="text"
                    value={formData.contribution}
                    onChange={(e) => setFormData({ ...formData, contribution: e.target.value })}
                    placeholder="e.g. $1,000 Cloud Credits"
                    className="px-3 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Overview of the partnership, products provided to students..."
                  className="p-3 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">Website URL</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://cloud.google.com"
                  className="px-3 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-hover transition-colors shadow-xs"
              >
                {loading ? "Adding Partner..." : "Register Sponsor"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
