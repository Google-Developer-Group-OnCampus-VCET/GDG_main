import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getEventBySlugAsync, getAuditLogsAsync } from "@/lib/db";
import { AdminHeader } from "@/components/admin/admin-header";
import { AuditView } from "@/components/admin/audit-view";
import { AdminPageSkeleton } from "@/components/skeletons/admin-skeletons";
import type { AuditLogEntry } from "@/types";

export function generateStaticParams() {
  return [{ slug: "dev-to-cloud" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return {
    title: `Audit Trail · ${slug}`,
  };
}

async function AdminAuditContent({ slug }: { slug: string }) {
  await connection();
  const event = await getEventBySlugAsync(slug);
  if (!event) notFound();

  let logs: AuditLogEntry[] = [];
  try {
    logs = await getAuditLogsAsync({ eventSlug: slug, limit: 100 });
  } catch (err) {
    console.warn("Failed to fetch initial audit logs:", err);
    logs = [];
  }

  return (
    <div className="min-h-screen bg-surface-container-low flex flex-col">
      <AdminHeader currentTab="audit" eventSlug={slug} />

      <main className="flex-1 max-w-(--container-max) w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AuditView slug={slug} eventTitle={event.title} initialLogs={logs} />
      </main>
    </div>
  );
}

export default async function AdminAuditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      <AdminAuditContent slug={slug} />
    </Suspense>
  );
}
