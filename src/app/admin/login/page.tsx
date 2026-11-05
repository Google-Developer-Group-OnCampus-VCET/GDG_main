import { Suspense } from "react";
import type { Metadata } from "next";
import { AdminLoginForm } from "@/components/admin/admin-login-form";

export const metadata: Metadata = {
  title: "Admin Portal Sign In · GDG on Campus VCET",
  description:
    "Secure administrative login for GDG VCET organizers, chapter leads, event managers, and check-in volunteers.",
};

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-surface-container-low flex flex-col justify-center items-center p-4 sm:p-6">
      <Suspense fallback={<div className="h-96 flex items-center justify-center">Loading admin portal...</div>}>
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}

