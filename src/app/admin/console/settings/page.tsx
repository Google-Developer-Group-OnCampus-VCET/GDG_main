import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getAdminRoleFromCookies } from "@/lib/auth";
import { getSiteSettingsAsync } from "@/lib/db";
import { AdminHeader } from "@/components/admin/admin-header";
import { SiteSettingsEditor } from "@/components/admin/site-settings-editor";
import { AdminPageSkeleton } from "@/components/skeletons/admin-skeletons";

export const metadata = {
  title: "Site & Team CMS · Admin Console",
};

async function AdminSiteSettingsContent() {
  await connection();

  const role = await getAdminRoleFromCookies();
  if (!role) {
    redirect("/admin");
  }
  if (role !== "admin") {
    redirect("/admin/console");
  }

  const settings = await getSiteSettingsAsync();

  return (
    <div className="min-h-screen bg-surface-container-low flex flex-col">
      <AdminHeader currentTab="settings" initialRole={role} />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        <SiteSettingsEditor initialSettings={settings} />
      </main>
    </div>
  );
}

export default function AdminSiteSettingsPage() {
  return (
    <Suspense fallback={<AdminPageSkeleton label="Loading Site & Team CMS…" />}>
      <AdminSiteSettingsContent />
    </Suspense>
  );
}
