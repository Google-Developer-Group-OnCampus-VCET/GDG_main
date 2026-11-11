import { Suspense } from "react";
import { AdminLayoutShell } from "@/components/admin/admin-layout-shell";
import { getCurrentUser } from "@/lib/auth";

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
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}

/**
 * The actual auth gate lives in src/middleware.ts — by the time any request reaches this
 * layout (other than /admin/login, which middleware deliberately excludes), it has already
 * proven a valid, active Firebase session. This just fetches the profile to display it;
 * it does not and must not re-implement the redirect, to avoid two sources of truth.
 */
async function AdminShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return <AdminLayoutShell user={user}>{children}</AdminLayoutShell>;
}
