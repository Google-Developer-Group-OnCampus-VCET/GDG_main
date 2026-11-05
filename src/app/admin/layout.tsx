import { Suspense } from "react";
import { AdminLayoutShell } from "@/components/admin/admin-layout-shell";

export const metadata = {
  title: "Admin Workspace · GDG on Campus VCET",
  description: "Centralized developer community and multi-event management platform.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface-container-low" />}>
      <AdminLayoutShell>{children}</AdminLayoutShell>
    </Suspense>
  );
}

