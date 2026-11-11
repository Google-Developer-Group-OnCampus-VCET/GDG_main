import { Suspense } from "react";
import type { Metadata } from "next";
import { getResources } from "@/lib/db";
import { ResourcesManagerView } from "@/components/admin/resources-manager-view";

export const metadata: Metadata = {
  title: "Community Learning Resources Catalog · GDG VCET Admin",
};

export default function AdminResourcesPage() {
  const initialResources = getResources();

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <Suspense fallback={<div className="h-64 flex items-center justify-center">Loading resources...</div>}>
        <ResourcesManagerView initialResources={initialResources} />
      </Suspense>
    </div>
  );
}

