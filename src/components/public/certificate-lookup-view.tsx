"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function CertificateLookupView() {
  const router = useRouter();
  const [certInput, setCertInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = certInput.trim();
    if (!clean) {
      setErrorMessage("Please enter a valid Certificate ID or Pass Reference.");
      return;
    }
    setErrorMessage("");
    router.push(`/certificates/verify/${encodeURIComponent(clean)}`);
  };

  const sampleCertificates = [
    {
      id: "CERT-VCET-2025-0842",
      name: "Atharva Joshi",
      track: "Track A: Modern Web & Gemini AI",
      event: "DevCraft 2025",
    },
    {
      id: "CERT-VCET-2025-0843",
      name: "Pooja Sharma",
      track: "Track B: Cloud Architecture & GCP",
      event: "DevCraft 2025",
    },
  ];

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-8">
      {/* Search Input Box */}
      <div className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-xs flex flex-col gap-6">
        <div>
          <h2 className="text-lg font-bold text-foreground">Look up Certificate by ID</h2>
          <p className="text-xs text-foreground-muted mt-1">
            Enter the unique ID printed at the footer of your certificate (e.g. <span className="font-mono text-primary font-bold">CERT-VCET-2025-0842</span>) or your event registration pass reference.
          </p>
        </div>

        <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-foreground-muted pointer-events-none">
              verified
            </span>
            <input
              type="text"
              placeholder="CERT-VCET-2025-0842"
              value={certInput}
              onChange={(e) => {
                setCertInput(e.target.value);
                if (errorMessage) setErrorMessage("");
              }}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-surface-container-lowest text-sm font-mono text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary uppercase"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-hover transition-colors shadow-xs flex items-center justify-center gap-1.5"
          >
            <span>Verify Authenticity</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </form>

        {errorMessage && (
          <p className="text-xs font-medium text-status-error flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">error</span>
            <span>{errorMessage}</span>
          </p>
        )}
      </div>

      {/* Instant Verification Demo Samples */}
      <div className="bg-surface-container-low rounded-2xl border border-border/70 p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">
            Quick Verification Samples
          </span>
          <span className="text-[11px] text-foreground-muted">Click to preview live badge</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sampleCertificates.map((sample) => (
            <Link
              key={sample.id}
              href={`/certificates/verify/${sample.id}`}
              className="p-4 rounded-xl bg-white border border-border hover:border-primary/50 hover:shadow-xs transition-all flex flex-col justify-between gap-2 group"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-primary group-hover:underline">
                  {sample.id}
                </span>
                <span className="material-symbols-outlined text-[16px] text-foreground-muted group-hover:text-primary transition-colors">
                  launch
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">{sample.name}</p>
                <p className="text-[11px] text-foreground-muted">{sample.track}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

