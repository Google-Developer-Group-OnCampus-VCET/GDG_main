"use client";

import { useState } from "react";
import Link from "next/link";
import type { ChapterEvent, WorkshopDetails } from "@/types";

interface EventSponsorsViewProps {
  event: ChapterEvent;
  workshop: WorkshopDetails;
}

export function EventSponsorsView({ event, workshop }: EventSponsorsViewProps) {
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
  const [partnerName, setPartnerName] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");
  const [partnerTier, setPartnerTier] = useState("Gold Tier ($1,500)");
  const [partnerMessage, setPartnerMessage] = useState("");
  const [partnerSubmitted, setPartnerSubmitted] = useState(false);

  const titleSponsor = workshop.sponsors.find((s) => s.tier === "title");
  const goldSponsors = workshop.sponsors.filter((s) => s.tier === "gold");
  const platformPartners = workshop.sponsors.filter((s) => s.tier === "platform");
  const ecosystemPartners = workshop.sponsors.filter((s) => s.tier === "ecosystem");

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPartnerSubmitted(true);
    setTimeout(() => {
      setPartnerSubmitted(false);
      setInquiryModalOpen(false);
      setPartnerName("");
      setPartnerEmail("");
      setPartnerMessage("");
    }, 2500);
  };

  return (
    <div className="flex flex-col w-full bg-surface">
      {/* Top Banner */}
      <section className="relative w-full overflow-hidden border-b border-border bg-white py-12 lg:py-16">
        <div className="absolute -top-24 right-0 w-96 h-96 bg-primary-fixed/40 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-48 left-12 w-80 h-80 bg-secondary-fixed/30 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-(--container-max) mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col gap-6">
          <div className="flex flex-col gap-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 self-start bg-primary-fixed text-on-primary-fixed-variant px-3 py-1 rounded-full text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-primary shrink-0 animate-pulse"></span>
              <span className="uppercase tracking-wider">Allies in Tech Empowerment</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
              Our Generous Sponsors &amp; Community Partners
            </h1>
            <p className="text-base sm:text-lg text-foreground-muted leading-relaxed pt-1">
              DevCraft 2025 is made possible thanks to our visionary partners supporting tech education, open student innovation, and developer growth in VCET.
            </p>
          </div>

          {/* Quick Stats Metric Band */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
            <div className="p-5 rounded-2xl bg-surface-container-low border border-border shadow-xs flex flex-col gap-1">
              <span className="text-2xl font-bold text-primary">150+</span>
              <span className="text-xs text-foreground-muted font-medium">Top Student Coders</span>
            </div>
            <div className="p-5 rounded-2xl bg-surface-container-low border border-border shadow-xs flex flex-col gap-1">
              <span className="text-2xl font-bold text-secondary">$100k+</span>
              <span className="text-xs text-foreground-muted font-medium">Cloud Perks &amp; Tooling</span>
            </div>
            <div className="p-5 rounded-2xl bg-surface-container-low border border-border shadow-xs flex flex-col gap-1">
              <span className="text-2xl font-bold text-tertiary">36 Hrs</span>
              <span className="text-xs text-foreground-muted font-medium">Intensive Prototyping</span>
            </div>
            <div className="p-5 rounded-2xl bg-surface-container-low border border-border shadow-xs flex flex-col gap-1">
              <span className="text-2xl font-bold text-foreground">100%</span>
              <span className="text-xs text-foreground-muted font-medium">Open Collegiate Access</span>
            </div>
          </div>
        </div>
      </section>

      {/* TIER 1: Title Sponsor Showcase */}
      {titleSponsor ? (
        <section className="w-full py-12 bg-surface-container-low border-b border-border">
          <div className="max-w-(--container-max) mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">verified</span>
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Premier Title Sponsor
                </span>
              </div>
              <span className="text-xs text-foreground-muted bg-white border border-border px-3 py-1 rounded-full font-semibold">
                Anchor Support
              </span>
            </div>

            <div className="bg-white rounded-3xl border-2 border-primary/40 p-6 sm:p-10 shadow-md flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="flex flex-col gap-4 max-w-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary-fixed flex items-center justify-center text-primary font-bold text-xl">
                    GC
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-foreground">{titleSponsor.name}</h3>
                    <span className="text-xs text-primary font-semibold">
                      Official Global Cloud Infrastructure Partner
                    </span>
                  </div>
                </div>

                <p className="text-sm text-foreground-muted leading-relaxed">
                  {titleSponsor.description}
                </p>

                {titleSponsor.perks ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    {titleSponsor.perks.map((perk) => (
                      <div key={perk} className="flex items-center gap-2 text-xs text-foreground-muted">
                        <span className="material-symbols-outlined text-secondary text-[18px]">check_circle</span>
                        <span>{perk}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="shrink-0 p-6 bg-surface-container-low rounded-2xl border border-border flex flex-col items-center gap-3 text-center w-full lg:w-72">
                <span className="text-xs font-bold text-foreground-muted uppercase tracking-wider">
                  Partner Contribution
                </span>
                <span className="text-lg font-bold text-primary">
                  {titleSponsor.contribution}
                </span>
                <span className="text-xs text-foreground-muted">
                  Empowering 150 students with Vertex AI &amp; Cloud Run runtimes
                </span>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* TIER 2: Gold Sponsors */}
      <section className="w-full py-12 bg-white border-b border-border">
        <div className="max-w-(--container-max) mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#fbbc04] text-[24px]">stars</span>
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Gold Sponsors &amp; Developer Grants
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {goldSponsors.map((sponsor) => (
              <div
                key={sponsor.id}
                className="bg-surface-container-low p-6 sm:p-8 rounded-2xl border border-border shadow-xs flex flex-col justify-between gap-5"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-foreground">{sponsor.name}</h3>
                    <span className="px-3 py-0.5 rounded-full bg-[#fbbc04]/20 text-on-surface text-xs font-bold">
                      {sponsor.badge}
                    </span>
                  </div>
                  <p className="text-sm text-foreground-muted leading-relaxed">
                    {sponsor.description}
                  </p>
                  {sponsor.perks ? (
                    <ul className="flex flex-col gap-1.5 text-xs text-foreground-muted pt-1">
                      {sponsor.perks.map((p) => (
                        <li key={p} className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-secondary text-[16px]">check</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                <div className="pt-3 border-t border-border/60 text-xs font-bold text-primary flex items-center justify-between">
                  <span>{sponsor.contribution}</span>
                  <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TIER 3: Platform & Tooling Partners */}
      <section className="w-full py-12 bg-surface-container-low border-b border-border">
        <div className="max-w-(--container-max) mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[24px]">handshake</span>
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Technology &amp; Platform Partners
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {platformPartners.map((partner) => (
              <div
                key={partner.id}
                className="bg-white p-5 rounded-2xl border border-border shadow-xs flex flex-col justify-between gap-3"
              >
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-primary">{partner.badge}</span>
                  <h4 className="text-base font-bold text-foreground">{partner.name}</h4>
                  <p className="text-xs text-foreground-muted leading-relaxed">
                    {partner.description}
                  </p>
                </div>
                <div className="text-[11px] font-semibold text-secondary pt-2 border-t border-border/40">
                  {partner.contribution}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TIER 4: Collegiate & Ecosystem Partners */}
      {ecosystemPartners.length > 0 ? (
        <section className="w-full py-12 bg-white border-b border-border">
          <div className="max-w-(--container-max) mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[24px]">school</span>
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                Collegiate &amp; Ecosystem Partners
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ecosystemPartners.map((partner) => (
                <div
                  key={partner.id}
                  className="bg-surface-container-low p-5 rounded-2xl border border-border shadow-xs flex flex-col justify-between gap-2"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-secondary">{partner.badge}</span>
                    <h4 className="text-base font-bold text-foreground">{partner.name}</h4>
                    <p className="text-xs text-foreground-muted leading-relaxed">
                      {partner.description}
                    </p>
                  </div>
                  <div className="text-[11px] font-semibold text-foreground-muted pt-2 border-t border-border/40">
                    {partner.contribution}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Section 4: Budget Allocation Visualizer */}
      <section className="w-full py-12 bg-white border-b border-border">
        <div className="max-w-(--container-max) mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-surface-container-low p-6 sm:p-10 rounded-3xl border border-border flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="max-w-xl flex flex-col gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                100% Non-Profit Community Impact
              </span>
              <h2 className="text-2xl font-bold text-foreground">
                How Workshop Sponsorship Funds Are Allocated
              </h2>
              <p className="text-sm text-foreground-muted leading-relaxed">
                Every sponsorship dollar goes directly into collegiate empowerment — from cloud runtime credits and mentor honorariums to hot meals and hardware prototyping components.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full lg:w-96">
              <div className="p-4 rounded-xl bg-white border border-border flex flex-col gap-1">
                <span className="text-2xl font-bold text-primary">45%</span>
                <span className="text-xs text-foreground-muted font-medium">Cloud &amp; Tooling Credits</span>
              </div>
              <div className="p-4 rounded-xl bg-white border border-border flex flex-col gap-1">
                <span className="text-2xl font-bold text-secondary">25%</span>
                <span className="text-xs text-foreground-muted font-medium">Food, Meals &amp; Logistics</span>
              </div>
              <div className="p-4 rounded-xl bg-white border border-border flex flex-col gap-1">
                <span className="text-2xl font-bold text-[#fbbc04]">15%</span>
                <span className="text-xs text-foreground-muted font-medium">Swag Kits &amp; Hardware</span>
              </div>
              <div className="p-4 rounded-xl bg-white border border-border flex flex-col gap-1">
                <span className="text-2xl font-bold text-tertiary">15%</span>
                <span className="text-xs text-foreground-muted font-medium">Student Hackathon Grants</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Become a Partner CTA */}
      <section className="w-full py-16 bg-surface-container-low">
        <div className="max-w-(--container-max) mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center gap-4">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            Partner With Us
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Want to Sponsor DevCraft 2025 or Future GDG VCET Summits?
          </h2>
          <p className="text-sm text-foreground-muted max-w-xl">
            Connect with top engineering talent across departments, showcase your developer APIs, and foster open innovation at VCET.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
            <button
              type="button"
              onClick={() => setInquiryModalOpen(true)}
              className="inline-flex items-center gap-2 bg-primary text-on-primary px-8 py-3 rounded-full text-sm font-semibold shadow-sm hover:bg-primary-hover transition-all cursor-pointer"
            >
              <span>Become a Sponsor</span>
              <span className="material-symbols-outlined text-[18px]">mail</span>
            </button>
            <Link
              href={`/events/${event.slug}/register`}
              className="inline-flex items-center gap-2 bg-white text-foreground border border-border px-6 py-3 rounded-full text-sm font-semibold hover:bg-surface-container transition-all"
            >
              <span>Register as Attendee</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Inquiry Modal */}
      {inquiryModalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setInquiryModalOpen(false)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-3xl border border-border shadow-2xl p-6 sm:p-8 flex flex-col gap-5 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">Sponsorship Inquiry</h3>
              <button
                type="button"
                onClick={() => setInquiryModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container text-foreground-muted flex items-center justify-center hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {partnerSubmitted ? (
              <div className="p-4 rounded-xl bg-status-success/10 border border-status-success/30 text-status-success text-sm flex items-center gap-2 font-semibold">
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
                <span>Thank you! Our community lead will connect with your team within 24 hours.</span>
              </div>
            ) : (
              <form onSubmit={handleInquirySubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-foreground">Company / Organization</label>
                  <input
                    type="text"
                    required
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    placeholder="e.g. Acme Cloud Systems"
                    className="h-10 px-3 rounded-lg border border-border bg-surface-container-low text-sm focus:outline-hidden focus:border-primary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-foreground">Work Email</label>
                  <input
                    type="email"
                    required
                    value={partnerEmail}
                    onChange={(e) => setPartnerEmail(e.target.value)}
                    placeholder="partners@acme.com"
                    className="h-10 px-3 rounded-lg border border-border bg-surface-container-low text-sm focus:outline-hidden focus:border-primary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-foreground">Interest Tier</label>
                  <select
                    value={partnerTier}
                    onChange={(e) => setPartnerTier(e.target.value)}
                    className="h-10 px-3 rounded-lg border border-border bg-surface-container-low text-sm focus:outline-hidden focus:border-primary"
                  >
                    <option>Title Partner ($5,000)</option>
                    <option>Gold Tier ($1,500)</option>
                    <option>Tooling / Platform Credits Partner</option>
                    <option>Hackathon Prize Sponsor</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-foreground">Message</label>
                  <textarea
                    rows={3}
                    value={partnerMessage}
                    onChange={(e) => setPartnerMessage(e.target.value)}
                    placeholder="Tell us how you would like to support or engage with our student builders..."
                    className="p-3 rounded-lg border border-border bg-surface-container-low text-sm focus:outline-hidden focus:border-primary"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-full bg-primary text-on-primary text-sm font-semibold hover:bg-primary-hover transition-all mt-2"
                >
                  Send Partnership Inquiry
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

