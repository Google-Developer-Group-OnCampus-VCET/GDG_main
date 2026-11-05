import type { Metadata } from "next";
import { ContactView } from "@/components/public/contact-view";

export const metadata: Metadata = {
  title: "Contact & Chapter Inquiries · GDG on Campus VCET",
  description:
    "Get in touch with Google Developer Groups on Campus VCET. Submit speaker proposals, sponsorship requests, student inquiries, or campus partnerships.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-surface-container-lowest flex flex-col">
      {/* Hero Section */}
      <section className="border-b border-border bg-white py-12 md:py-16">
        <div className="mx-auto max-w-(--container-max) px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-semibold mb-4">
              <span className="w-2 h-2 rounded-full bg-primary"></span>
              <span>Open Campus Community</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
              Contact &amp; Partner with GDG VCET
            </h1>
            <p className="mt-4 text-base sm:text-lg text-foreground-muted leading-relaxed">
              Have a question about our developer workshops, interested in mentoring students as a tech speaker, or want to sponsor campus hackathons? Reach out directly to our core organizer team.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 mx-auto max-w-(--container-max) w-full px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <ContactView />
      </main>
    </div>
  );
}

