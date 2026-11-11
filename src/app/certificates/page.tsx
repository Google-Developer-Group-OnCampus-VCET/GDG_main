import { Suspense } from "react";
import type { Metadata } from "next";
import { CertificateLookupView } from "@/components/public/certificate-lookup-view";

export const metadata: Metadata = {
  title: "Verify Digital Credentials & Certificates · GDG on Campus VCET",
  description:
    "Instant cryptographic validation portal for Google Developer Groups on Campus VCET workshop, hackathon, and boot camp completion certificates.",
};

export default function CertificatesPage() {
  return (
    <div className="min-h-screen bg-surface-container-lowest flex flex-col">
      {/* Hero Section */}
      <section className="border-b border-border bg-white py-12 md:py-16">
        <div className="mx-auto max-w-(--container-max) px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-status-success/10 text-status-success text-xs font-semibold mb-4">
              <span className="w-2 h-2 rounded-full bg-status-success"></span>
              <span>Tamper-Evident Credentials</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
              Certificate Verification Portal
            </h1>
            <p className="mt-4 text-base sm:text-lg text-foreground-muted leading-relaxed">
              Verify the authenticity of digital certificates issued by GDG on Campus VCET. Every credential includes cryptographic reference hashing, timestamped event participation records, and chapter verification.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 mx-auto max-w-(--container-max) w-full px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <Suspense fallback={<div className="h-64 flex items-center justify-center text-foreground-muted">Loading verification portal...</div>}>
          <CertificateLookupView />
        </Suspense>
      </main>
    </div>
  );
}

