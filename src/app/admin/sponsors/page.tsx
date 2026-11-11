import { Suspense } from "react";
import type { Metadata } from "next";
import { getSponsorsAdmin } from "@/lib/db";
import { SponsorsManagerView } from "@/components/admin/sponsors-manager-view";

export const metadata: Metadata = {
  title: "Sponsors & Industry Partners · GDG VCET Admin",
};

export default function AdminSponsorsPage() {
  const initialSponsors = getSponsorsAdmin();

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <Suspense fallback={<div className="h-64 flex items-center justify-center">Loading sponsors...</div>}>
        <SponsorsManagerView initialSponsors={initialSponsors} />
      </Suspense>
    </div>
  );
}

