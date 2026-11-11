import { Suspense } from "react";
import type { Metadata } from "next";
import { getAdminUsers, getAuditLogs } from "@/lib/db";
import { TeamManagerView } from "@/components/admin/team-manager-view";

export const metadata: Metadata = {
  title: "Team & Role-Based Access Control (RBAC) · GDG VCET Admin",
};

export default function AdminTeamPage() {
  const users = getAdminUsers();
  const logs = getAuditLogs("gdg-vcet", 25);

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <Suspense fallback={<div className="h-64 flex items-center justify-center">Loading team directory...</div>}>
        <TeamManagerView initialUsers={users} initialLogs={logs} />
      </Suspense>
    </div>
  );
}

