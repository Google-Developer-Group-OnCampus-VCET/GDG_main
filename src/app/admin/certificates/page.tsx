import { Suspense } from "react";
import type { Metadata } from "next";
import { getCertificates, getAllEventsAdmin } from "@/lib/db";
import { CertificatesManagerView } from "@/components/admin/certificates-manager-view";

export const metadata: Metadata = {
  title: "Verifiable Certificates & Credential Issuance · GDG VCET Admin",
};

export default function AdminCertificatesPage() {
  const initialCertificates = getCertificates();
  const events = getAllEventsAdmin();

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <Suspense fallback={<div className="h-64 flex items-center justify-center">Loading certificates...</div>}>
        <CertificatesManagerView initialCertificates={initialCertificates} events={events} />
      </Suspense>
    </div>
  );
}

