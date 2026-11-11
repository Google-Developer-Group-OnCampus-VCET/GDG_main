import type { Metadata } from "next";
import Link from "next/link";
import { getCertificateById } from "@/lib/db";
import { VerifiedCertificateCard } from "@/components/public/verified-certificate-card";

interface PageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  // These two IDs only exist in the dev-only seed data (src/lib/db/index.ts). Returning an
  // empty array here would be the honest fix, but cacheComponents requires at least one
  // result (see nextjs.org/docs/messages/empty-generate-static-params) — an empty return
  // hard-fails the production build. In production these rows don't exist (the seed is
  // gated the same way), so the prerendered page just renders the honest "not found" state
  // for these two IDs — harmless, if slightly wasteful to prebuild.
  return [
    { id: "CERT-VCET-2025-0842" },
    { id: "CERT-VCET-2025-0843" },
  ];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const cert = getCertificateById(id);

  if (!cert) {
    return {
      title: "Certificate Verification · GDG on Campus VCET",
    };
  }

  return {
    title: `Verified Certificate: ${cert.recipientName} · GDG VCET`,
    description: `Official completion certificate #${cert.certificateId} awarded to ${cert.recipientName} for ${cert.eventTitle}.`,
  };
}

export default async function CertificateVerifyPage({ params }: PageProps) {
  const { id } = await params;
  const cert = getCertificateById(id);

  return (
    <div className="min-h-screen bg-surface-container-lowest flex flex-col py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto w-full flex flex-col gap-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/certificates"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground-muted hover:text-foreground transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Back to Certificate Lookup</span>
          </Link>

          <span className="text-[11px] font-mono text-foreground-muted">
            Lookup Query: {id}
          </span>
        </div>

        {!cert ? (
          <div className="bg-white rounded-2xl border border-border p-10 text-center flex flex-col items-center justify-center gap-4 shadow-xs">
            <div className="w-14 h-14 rounded-full bg-status-error/10 text-status-error flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">gpp_bad</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Certificate Record Not Found</h2>
              <p className="mt-2 text-xs text-foreground-muted max-w-md leading-relaxed">
                No certificate record matching <span className="font-mono font-bold text-foreground">{id}</span> was found in the GDG VCET chapter registry. Please verify the ID for typographical errors.
              </p>
            </div>
            <Link
              href="/certificates"
              className="mt-2 px-6 py-2.5 rounded-full bg-primary text-on-primary text-xs font-bold hover:bg-primary-hover transition-colors"
            >
              Try Another ID
            </Link>
          </div>
        ) : (
          <VerifiedCertificateCard certificate={cert} />
        )}
      </div>
    </div>
  );
}
