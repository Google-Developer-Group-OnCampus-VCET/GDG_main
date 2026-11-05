"use client";

import Link from "next/link";
import type { CertificateRecord } from "@/types";
import { GdgLogo } from "@/components/gdg-logo";

interface Props {
  certificate: CertificateRecord;
}

export function VerifiedCertificateCard({ certificate }: Props) {
  const isRevoked = certificate.status === "revoked";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Verification Status Banner */}
      <div
        className={`p-4 rounded-2xl border flex items-center justify-between ${
          isRevoked
            ? "bg-red-50 border-red-200 text-status-error"
            : "bg-emerald-50 border-emerald-200 text-status-success"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[24px]">
            {isRevoked ? "cancel" : "verified"}
          </span>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider">
              {isRevoked ? "Certificate Revoked" : "Official Verified Credential"}
            </h3>
            <p className="text-[11px] opacity-90">
              {isRevoked
                ? "This credential has been marked invalid by the chapter administrators."
                : "Authenticated against the immutable GDG on Campus VCET chapter registry."}
            </p>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-border text-foreground text-xs font-bold hover:bg-surface-container shadow-xs transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">print</span>
          <span>Print / Save PDF</span>
        </button>
      </div>

      {/* Verifiable Certificate Canvas */}
      <div className="bg-white rounded-3xl border-2 border-border shadow-lg p-8 sm:p-12 relative overflow-hidden print:p-8 print:border print:shadow-none">
        {/* Top Google Colors Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-google-blue via-google-red to-google-yellow"></div>

        {/* Certificate Watermark Graphic */}
        <div className="absolute -right-16 -bottom-16 opacity-5 pointer-events-none select-none">
          <span className="material-symbols-outlined text-[320px]">workspace_premium</span>
        </div>

        {/* Certificate Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-border pb-8">
          <div className="flex items-center gap-3">
            <GdgLogo className="h-8 sm:h-10" />
            <div>
              <p className="text-sm font-bold text-foreground">Google Developer Groups</p>
              <p className="text-xs text-foreground-muted">on Campus · VCET Vasai</p>
            </div>
          </div>

          <div className="flex flex-col sm:items-end">
            <span className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest">
              Credential ID
            </span>
            <span className="font-mono text-sm font-bold text-primary">
              {certificate.certificateId}
            </span>
          </div>
        </div>

        {/* Certificate Body */}
        <div className="py-10 flex flex-col items-center text-center gap-4">
          <span className="text-xs font-bold tracking-widest uppercase text-foreground-muted">
            Certificate of Completion &amp; Achievement
          </span>

          <p className="text-xs text-foreground-muted">This certifies that</p>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight font-serif">
            {certificate.recipientName}
          </h1>

          <p className="text-xs sm:text-sm text-foreground-muted max-w-lg leading-relaxed mt-2">
            has actively participated in, completed all technical lab milestones, and successfully graduated from
          </p>

          <div className="p-4 rounded-2xl bg-surface-container-low border border-border/80 max-w-xl w-full my-2">
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              {certificate.eventTitle}
            </h2>
            {certificate.track && (
              <p className="text-xs font-semibold text-primary mt-1">
                Specialized Track: {certificate.track}
              </p>
            )}
          </div>
        </div>

        {/* Signatures & Verification Meta */}
        <div className="pt-8 border-t border-border grid grid-cols-1 sm:grid-cols-3 gap-6 items-end">
          {/* Issue Date */}
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-foreground-muted">Issue Date</span>
            <span className="text-xs font-bold text-foreground">{certificate.issueDate}</span>
            <span className="text-[10px] text-foreground-muted">Vasai, Maharashtra</span>
          </div>

          {/* Cryptographic Seal */}
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full border-2 border-primary/40 bg-primary/5 flex items-center justify-center text-primary mb-1">
              <span className="material-symbols-outlined text-[24px]">verified</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">
              Official Chapter Seal
            </span>
            <span className="text-[9px] font-mono text-foreground-muted">
              REF: {certificate.referenceId}
            </span>
          </div>

          {/* Signatory */}
          <div className="flex flex-col sm:items-end sm:text-right">
            <div className="font-serif italic text-base text-foreground font-bold">
              {certificate.issuerName || "Jatush Hingu"}
            </div>
            <span className="text-[10px] uppercase font-bold text-foreground">
              {certificate.issuerRole || "Lead Organizer"}
            </span>
            <span className="text-[10px] text-foreground-muted">GDG on Campus VCET</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-border shadow-xs print:hidden">
        <Link
          href={`/events/${certificate.eventSlug}`}
          className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
        >
          <span>View Associated Event Details</span>
          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
        </Link>

        <button
          onClick={handlePrint}
          className="w-full sm:w-auto px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-hover transition-colors shadow-xs"
        >
          Print / Download Certificate
        </button>
      </div>
    </div>
  );
}

