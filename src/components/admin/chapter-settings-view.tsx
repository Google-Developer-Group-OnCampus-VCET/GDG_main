"use client";

import { useState } from "react";
import type { ChapterTenant } from "@/types";

interface Props {
  initialSettings: ChapterTenant;
}

const DEMO_TENANTS = [
  {
    id: "gdg-vcet",
    name: "GDG on Campus VCET",
    institution: "Vidyavardhini's College of Engineering & Technology, Vasai",
    status: "Active Production Tenant",
    color: "#1A73E8",
  },
  {
    id: "gdg-spit",
    name: "GDG on Campus SPIT",
    institution: "Sardar Patel Institute of Technology, Andheri",
    status: "Ready for Scoped Onboarding",
    color: "#006E2C",
  },
  {
    id: "gdg-djce",
    name: "GDG on Campus DJCE",
    institution: "Dwarkadas J. Sanghvi College of Engineering, Vile Parle",
    status: "Ready for Scoped Onboarding",
    color: "#B51B15",
  },
];

export function ChapterSettingsView({ initialSettings }: Props) {
  const [settings, setSettings] = useState<ChapterTenant>(initialSettings);
  const [formData, setFormData] = useState({
    name: settings.name,
    shortName: settings.shortName,
    tagline: settings.tagline || "",
    description: settings.description || "",
    institution: settings.institution,
    contactEmail: settings.contactEmail || "",
    primaryColor: settings.primaryColor || "#1A73E8",
  });
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg("");

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterId: settings.id,
          ...formData,
        }),
      });

      const data = await res.json();
      if (res.ok && data.settings) {
        setSettings(data.settings);
        setSuccessMsg("Chapter configuration updated successfully.");
      } else {
        alert(data.error || "Failed to update settings");
      }
    } catch {
      alert("Error saving settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Chapter Settings &amp; Multi-Chapter Architecture
        </h1>
        <p className="text-xs sm:text-sm text-foreground-muted mt-1">
          Configure chapter brand identities, tenant isolation rules, and multi-campus scaling parameters.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-status-success text-xs font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-xs flex flex-col gap-6">
        <div className="border-b border-border pb-3">
          <h2 className="text-base font-bold text-foreground">Current Chapter Tenant: GDG VCET</h2>
          <p className="text-xs text-foreground-muted">Chapter Identifier: <span className="font-mono font-bold text-primary">{settings.id}</span></p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-foreground">Official Chapter Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="px-3 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-foreground">Short Name *</label>
            <input
              type="text"
              required
              value={formData.shortName}
              onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
              className="px-3 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-foreground">Host Institution *</label>
            <input
              type="text"
              required
              value={formData.institution}
              onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
              className="px-3 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-foreground">Lead Contact Email *</label>
            <input
              type="email"
              required
              value={formData.contactEmail}
              onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
              className="px-3 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-foreground">Chapter Tagline</label>
          <input
            type="text"
            value={formData.tagline}
            onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
            placeholder="Learn. Build. Connect."
            className="px-3 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-foreground">Description</label>
          <textarea
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="p-3 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-foreground-muted">Changes apply to all public views.</span>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-hover transition-colors shadow-xs disabled:opacity-50"
          >
            {loading ? "Saving Settings..." : "Save Chapter Settings"}
          </button>
        </div>
      </form>

      {/* Multi-Chapter Tenancy Switcher Preview */}
      <div className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">Multi-Chapter Architecture &amp; Future Tenancy</h2>
            <p className="text-xs text-foreground-muted mt-0.5">
              The platform is architected with complete database tenant isolation via <span className="font-mono text-primary font-bold">chapter_id</span>.
            </p>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold uppercase">
            Enterprise Ready
          </span>
        </div>

        <p className="text-xs text-foreground-muted leading-relaxed">
          Every table in the SQLite database schema (<code className="font-mono text-foreground font-semibold">events</code>, <code className="font-mono text-foreground font-semibold">registrations</code>, <code className="font-mono text-foreground font-semibold">certificates</code>, <code className="font-mono text-foreground font-semibold">users</code>, <code className="font-mono text-foreground font-semibold">resources</code>) includes a <code className="font-mono text-foreground font-semibold">chapter_id</code> foreign key. Future campus chapters can be provisioned in milliseconds without code duplication.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
          {DEMO_TENANTS.map((tenant) => (
            <div
              key={tenant.id}
              className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                tenant.id === "gdg-vcet"
                  ? "bg-primary/5 border-primary/40 shadow-xs"
                  : "bg-surface-container-low border-border/80 opacity-80"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase font-bold text-foreground-muted">
                    {tenant.id}
                  </span>
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: tenant.color }}
                  ></span>
                </div>
                <h3 className="text-xs font-bold text-foreground mt-1">{tenant.name}</h3>
                <p className="text-[11px] text-foreground-muted mt-0.5 line-clamp-2">
                  {tenant.institution}
                </p>
              </div>

              <span className="text-[10px] font-semibold text-primary">
                {tenant.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

