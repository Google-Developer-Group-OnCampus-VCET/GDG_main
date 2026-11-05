"use client";

import { useState } from "react";
import Link from "next/link";
import type { CertificateRecord, ChapterEvent } from "@/types";

interface Props {
  initialCertificates: CertificateRecord[];
  events: ChapterEvent[];
}

export function CertificatesManagerView({ initialCertificates, events }: Props) {
  const [certificates, setCertificates] = useState<CertificateRecord[]>(initialCertificates);
  const [selectedEvent, setSelectedEvent] = useState(events[0]?.slug || "devcraft-2025");
  const [search, setSearch] = useState("");
  const [isBulkIssuing, setIsBulkIssuing] = useState(false);
  const [showSingleModal, setShowSingleModal] = useState(false);
  const [singleForm, setSingleForm] = useState({
    eventSlug: events[0]?.slug || "devcraft-2025",
    eventTitle: events[0]?.title || "DevCraft 2025 Workshop",
    recipientName: "",
    recipientEmail: "",
    track: "Track A: Modern Web & Gemini AI",
  });
  const [loading, setLoading] = useState(false);

  const filteredCerts = certificates.filter((c) => {
    const q = search.toLowerCase().trim();
    return (
      q === "" ||
      c.certificateId.toLowerCase().includes(q) ||
      c.recipientName.toLowerCase().includes(q) ||
      c.recipientEmail.toLowerCase().includes(q) ||
      c.referenceId.toLowerCase().includes(q)
    );
  });

  const handleBulkIssue = async () => {
    if (
      !confirm(
        `Bulk-issue verifiable digital certificates to all checked-in attendees of "${selectedEvent}"?`
      )
    )
      return;

    setIsBulkIssuing(true);
    try {
      const res = await fetch("/api/admin/certificates/bulk-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventSlug: selectedEvent, onlyCheckedIn: true }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || `Issued ${data.count} certificates.`);
        // Refresh list
        const refresh = await fetch("/api/admin/certificates").then((r) => r.json());
        if (refresh.certificates) setCertificates(refresh.certificates);
      } else {
        alert(data.error || "Failed to bulk-issue certificates");
      }
    } catch {
      alert("Error during bulk certificate issuance");
    } finally {
      setIsBulkIssuing(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "issued" ? "revoked" : "issued";
    try {
      const res = await fetch(`/api/admin/certificates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setCertificates((prev) =>
          prev.map((c) =>
            c.id === id || c.certificateId === id ? { ...c, status: newStatus as "issued" | "revoked" } : c
          )
        );
      }
    } catch {
      alert("Error updating certificate status");
    }
  };

  const handleIssueSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/admin/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(singleForm),
      });

      const data = await res.json();
      if (res.ok && data.certificate) {
        setCertificates((prev) => [data.certificate, ...prev]);
        setShowSingleModal(false);
        setSingleForm({
          eventSlug: selectedEvent,
          eventTitle: events.find((e) => e.slug === selectedEvent)?.title || "DevCraft Workshop",
          recipientName: "",
          recipientEmail: "",
          track: "Track A: Modern Web & Gemini AI",
        });
      } else {
        alert(data.error || "Failed to issue certificate");
      }
    } catch {
      alert("Error issuing certificate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Digital Certificates &amp; Verification Hub
          </h1>
          <p className="text-xs sm:text-sm text-foreground-muted mt-1">
            Issue cryptographically tamper-evident completion credentials to verified event participants.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSingleModal(true)}
            className="px-4 py-2.5 rounded-xl border border-border bg-white text-foreground text-xs font-bold hover:bg-surface-container transition-colors shadow-xs"
          >
            Issue Single
          </button>
          <button
            onClick={handleBulkIssue}
            disabled={isBulkIssuing}
            className="px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-hover transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            {isBulkIssuing ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>Issuing...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">workspace_premium</span>
                <span>1-Click Bulk Issue (Checked-In Only)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Target Event & Search Filter */}
      <div className="bg-white rounded-2xl border border-border p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-xs font-bold text-foreground-muted">Target Event:</label>
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-border bg-surface-container-lowest text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            {events.map((e) => (
              <option key={e.slug} value={e.slug}>
                {e.title}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-foreground-muted pointer-events-none">
            search
          </span>
          <input
            type="text"
            placeholder="Search certificate ID, name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-full border border-border bg-surface-container-lowest text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>

      {/* Certificates Table */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-container-low border-b border-border text-[11px] text-foreground-muted uppercase tracking-wider font-semibold">
            <tr>
              <th className="py-3 px-4">Certificate ID</th>
              <th className="py-3 px-4">Recipient</th>
              <th className="py-3 px-4">Pass Reference</th>
              <th className="py-3 px-4">Track / Program</th>
              <th className="py-3 px-4">Issue Date</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Verification</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filteredCerts.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-foreground-muted">
                  No certificate records found. Use &quot;1-Click Bulk Issue&quot; to issue credentials to checked-in attendees.
                </td>
              </tr>
            ) : (
              filteredCerts.map((cert) => (
                <tr key={cert.id} className="hover:bg-surface-container-lowest">
                  <td className="py-3 px-4 font-mono font-bold text-primary">
                    {cert.certificateId}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-foreground">{cert.recipientName}</div>
                    <div className="text-[10px] text-foreground-muted">{cert.recipientEmail}</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-foreground">
                    {cert.referenceId}
                  </td>
                  <td className="py-3 px-4 text-foreground truncate max-w-[160px]">
                    {cert.track || "General Event"}
                  </td>
                  <td className="py-3 px-4 font-mono text-foreground-muted">
                    {cert.issueDate}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleToggleStatus(cert.id, cert.status)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize transition-colors ${
                        cert.status === "issued"
                          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                          : "bg-red-100 text-status-error hover:bg-red-200"
                      }`}
                      title="Click to toggle Revocation"
                    >
                      {cert.status}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/certificates/verify/${cert.certificateId}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                    >
                      <span>Public Badge</span>
                      <span className="material-symbols-outlined text-[14px]">launch</span>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Issue Single Modal */}
      {showSingleModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-border max-w-md w-full p-6 sm:p-8 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Issue Single Certificate</h2>
              <button
                onClick={() => setShowSingleModal(false)}
                className="p-1.5 rounded-xl border border-border text-foreground hover:bg-surface-container"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleIssueSingle} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">Recipient Name *</label>
                <input
                  type="text"
                  required
                  value={singleForm.recipientName}
                  onChange={(e) => setSingleForm({ ...singleForm, recipientName: e.target.value })}
                  placeholder="e.g. Atharva Joshi"
                  className="px-3 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">Recipient Email *</label>
                <input
                  type="email"
                  required
                  value={singleForm.recipientEmail}
                  onChange={(e) => setSingleForm({ ...singleForm, recipientEmail: e.target.value })}
                  placeholder="atharva.joshi@vcet.edu.in"
                  className="px-3 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">Track / Specialization</label>
                <input
                  type="text"
                  value={singleForm.track}
                  onChange={(e) => setSingleForm({ ...singleForm, track: e.target.value })}
                  placeholder="Track A: Modern Web & Gemini AI"
                  className="px-3 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-hover transition-colors shadow-xs"
              >
                {loading ? "Generating..." : "Issue Verified Certificate"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
