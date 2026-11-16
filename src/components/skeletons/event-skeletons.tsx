import React from "react";

/**
 * Animated Google 4-color progress bar.
 * Sits gracefully at the top of loading sections.
 */
export function GoogleBrandBar({ className = "" }: { className?: string }) {
  return (
    <div
      className={`w-full h-1 bg-surface-container overflow-hidden relative ${className}`}
      role="progressbar"
      aria-label="Loading content"
    >
      <div className="absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853] rounded-full animate-loader-slide" />
    </div>
  );
}

/**
 * Compact Google-branded status indicator with 4 animated bouncing color dots.
 */
export function GoogleLoaderBadge({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white border border-border shadow-2xs text-xs font-medium text-foreground-muted">
      <span className="flex items-center gap-1 shrink-0" aria-hidden="true">
        <span className="w-2 h-2 rounded-full bg-[#4285F4] animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2 h-2 rounded-full bg-[#EA4335] animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2 h-2 rounded-full bg-[#FBBC05] animate-bounce" />
        <span className="w-2 h-2 rounded-full bg-[#34A853] animate-bounce [animation-delay:0.15s]" />
      </span>
      <span>{label}</span>
    </div>
  );
}

/**
 * Skeleton for the sticky EventSubNav bar.
 */
export function EventSubNavSkeleton() {
  return (
    <div className="sticky top-16 z-30 border-b border-border bg-white/95 backdrop-blur-md shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
      <div className="mx-auto flex h-14 sm:h-16 max-w-(--container-max) items-center justify-between px-3 sm:px-6 lg:px-8">
        {/* Left title placeholder */}
        <div className="flex flex-col gap-1.5 shrink-0 min-w-0 pr-2">
          <div className="h-4 w-36 sm:w-48 rounded-md bg-slate-200/80 animate-pulse" />
          <div className="h-2.5 w-20 rounded bg-slate-100 animate-pulse" />
        </div>

        {/* Center desktop tabs */}
        <div className="hidden lg:flex items-center gap-1 bg-surface-container-low px-2 py-1 rounded-full border border-border/50">
          <div className="h-7 w-20 rounded-full bg-slate-200/70 animate-pulse" />
          <div className="h-7 w-24 rounded-full bg-slate-200/70 animate-pulse" />
          <div className="h-7 w-16 rounded-full bg-slate-200/70 animate-pulse" />
          <div className="h-7 w-20 rounded-full bg-slate-200/70 animate-pulse" />
        </div>

        {/* Right CTA */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="hidden sm:block h-7 w-32 rounded-full bg-surface-container-high animate-pulse" />
          <div className="h-8 w-24 rounded-full bg-primary/20 animate-pulse" />
        </div>
      </div>

      {/* Mobile tabs row */}
      <div className="lg:hidden flex overflow-x-auto px-4 py-2 gap-2 border-t border-border/40 bg-surface-container-low/40">
        <div className="h-6 w-18 rounded-full bg-slate-200/70 shrink-0 animate-pulse" />
        <div className="h-6 w-22 rounded-full bg-slate-200/70 shrink-0 animate-pulse" />
        <div className="h-6 w-16 rounded-full bg-slate-200/70 shrink-0 animate-pulse" />
        <div className="h-6 w-18 rounded-full bg-slate-200/70 shrink-0 animate-pulse" />
      </div>
    </div>
  );
}

/**
 * Skeleton for single Event Card (used in grids).
 */
export function EventCardSkeleton() {
  return (
    <div className="rounded-(--radius-md) border border-border bg-surface p-6 flex flex-col gap-4 animate-pulse">
      {/* Image placeholder */}
      <div className="-mx-6 -mt-6 aspect-[4/3] bg-slate-200/80 rounded-t-(--radius-md)" />

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        <div className="h-6 w-24 rounded-full bg-slate-200/70" />
        <div className="h-6 w-16 rounded-full bg-slate-100" />
      </div>

      {/* Title */}
      <div className="space-y-2 mt-1">
        <div className="h-5 w-4/5 rounded-md bg-slate-200/90" />
        <div className="h-5 w-1/2 rounded-md bg-slate-200/80" />
      </div>

      {/* Date & Location */}
      <div className="space-y-2 mt-2">
        <div className="h-4 w-3/4 rounded bg-slate-100" />
        <div className="h-4 w-2/3 rounded bg-slate-100" />
      </div>

      {/* Button */}
      <div className="h-10 w-full rounded-full bg-slate-200/70 mt-2" />
    </div>
  );
}

/**
 * Grid of Event Card Skeletons (used in Home and Events sections).
 */
export function EventCardsGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton for the Registration page (/events/[slug]/register).
 * Exactly matches the 2-column hero + fast mobile-native registration form.
 */
export function EventRegistrationSkeleton() {
  return (
    <div className="flex flex-col w-full bg-surface" aria-busy="true" aria-label="Loading registration form">
      {/* Top Google progress bar */}
      <GoogleBrandBar />

      {/* Simulated SubNav */}
      <EventSubNavSkeleton />

      {/* Hero Section */}
      <section className="relative w-full overflow-hidden border-b border-border bg-gradient-to-b from-white via-surface-container-low to-surface py-10 lg:py-14">
        <div className="max-w-(--container-max) mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column */}
            <div className="lg:col-span-7 flex flex-col gap-4 text-left">
              {/* Badge */}
              <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-full border border-border shadow-2xs w-fit">
                <span className="flex items-center gap-1" aria-hidden="true">
                  <span className="w-2 h-2 rounded-full bg-[#4285F4]" />
                  <span className="w-2 h-2 rounded-full bg-[#EA4335]" />
                  <span className="w-2 h-2 rounded-full bg-[#FBBC05]" />
                  <span className="w-2 h-2 rounded-full bg-[#34A853]" />
                </span>
                <span className="text-xs font-semibold text-foreground-muted">Official Registration</span>
              </div>

              {/* Title */}
              <div className="space-y-2.5">
                <div className="h-8 sm:h-11 w-4/5 rounded-xl bg-slate-200/90 animate-pulse" />
                <div className="h-7 sm:h-9 w-3/5 rounded-xl bg-slate-200/80 animate-pulse" />
              </div>

              {/* Subheading */}
              <div className="space-y-2 max-w-xl">
                <div className="h-4 w-full rounded bg-slate-100 animate-pulse" />
                <div className="h-4 w-3/4 rounded bg-slate-100 animate-pulse" />
              </div>

              {/* Metadata Pill Row */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <div className="h-8 w-32 rounded-full bg-surface-container animate-pulse" />
                <div className="h-8 w-28 rounded-full bg-surface-container animate-pulse" />
                <div className="h-8 w-36 rounded-full bg-surface-container animate-pulse" />
              </div>

              {/* Action Button Placeholder */}
              <div className="flex items-center gap-3 pt-2">
                <div className="h-11 w-48 rounded-full bg-primary/20 animate-pulse" />
              </div>
            </div>

            {/* Right Pass Card Preview Placeholder */}
            <div className="lg:col-span-5 flex justify-center w-full">
              <div className="w-full max-w-sm bg-white rounded-3xl border border-border/80 shadow-xs p-5 flex flex-col justify-between min-h-[220px] animate-pulse">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  </div>
                  <div className="h-4 w-20 rounded bg-slate-100" />
                </div>
                <div className="space-y-2 py-4 text-center flex flex-col items-center">
                  <div className="h-3 w-28 rounded bg-primary/20" />
                  <div className="h-5 w-44 rounded bg-slate-200/90" />
                  <div className="h-3 w-32 rounded bg-slate-100" />
                </div>
                <div className="h-8 w-full rounded-xl bg-surface-container" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section className="w-full py-8 sm:py-14 bg-surface-container-low border-b border-border">
        <div className="max-w-xl mx-auto px-3 sm:px-6">
          <div className="flex flex-col gap-5 sm:gap-6">
            {/* Header with animated loader badge */}
            <div className="text-center flex flex-col items-center gap-2.5">
              <GoogleLoaderBadge label="Loading registration portal…" />
              <div className="h-7 sm:h-8 w-56 rounded-xl bg-slate-200/90 animate-pulse mt-1" />
              <div className="h-4 w-72 rounded-md bg-slate-100 animate-pulse" />
            </div>

            {/* Form Card Skeleton */}
            <div className="bg-white rounded-3xl border border-border/80 p-5 sm:p-7 shadow-xs space-y-5 animate-pulse">
              {/* Full Name */}
              <div className="space-y-2">
                <div className="h-4 w-24 rounded bg-slate-200/80" />
                <div className="h-11 w-full rounded-2xl bg-surface-container-low border border-border/50" />
              </div>

              {/* Email & Phone Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="h-4 w-28 rounded bg-slate-200/80" />
                  <div className="h-11 w-full rounded-2xl bg-surface-container-low border border-border/50" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-24 rounded bg-slate-200/80" />
                  <div className="h-11 w-full rounded-2xl bg-surface-container-low border border-border/50" />
                </div>
              </div>

              {/* College */}
              <div className="space-y-2">
                <div className="h-4 w-32 rounded bg-slate-200/80" />
                <div className="h-11 w-full rounded-2xl bg-surface-container-low border border-border/50" />
              </div>

              {/* Department & Year Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="h-4 w-24 rounded bg-slate-200/80" />
                  <div className="h-11 w-full rounded-2xl bg-surface-container-low border border-border/50" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-24 rounded bg-slate-200/80" />
                  <div className="h-11 w-full rounded-2xl bg-surface-container-low border border-border/50" />
                </div>
              </div>

              {/* Experience Level */}
              <div className="space-y-2 pt-1">
                <div className="h-4 w-32 rounded bg-slate-200/80" />
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-10 rounded-xl bg-surface-container-low border border-border/50" />
                  <div className="h-10 rounded-xl bg-surface-container-low border border-border/50" />
                  <div className="h-10 rounded-xl bg-surface-container-low border border-border/50" />
                </div>
              </div>

              {/* Checkbox */}
              <div className="flex items-center gap-3 pt-2">
                <div className="w-5 h-5 rounded-md bg-surface-container border border-border/70 shrink-0" />
                <div className="h-4 w-4/5 rounded bg-slate-100" />
              </div>

              {/* Submit Button */}
              <div className="h-12 w-full rounded-2xl bg-primary/25 border border-primary/20 flex items-center justify-center gap-2 mt-3">
                <span className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span className="text-xs font-semibold text-primary">Preparing Pass Generator...</span>
              </div>

              <div className="h-3 w-44 mx-auto rounded bg-slate-100" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * Skeleton for Event Details / Overview (/events/[slug]).
 */
export function EventDetailSkeleton() {
  return (
    <div className="flex flex-col w-full bg-surface" aria-busy="true" aria-label="Loading event details">
      <GoogleBrandBar />
      <EventSubNavSkeleton />

      {/* Hero */}
      <section className="w-full border-b border-border bg-gradient-to-b from-white to-surface py-10 lg:py-14">
        <div className="max-w-(--container-max) mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 max-w-3xl">
            <div className="flex items-center gap-2">
              <div className="h-6 w-28 rounded-full bg-primary/10 animate-pulse" />
              <div className="h-6 w-20 rounded-full bg-slate-100 animate-pulse" />
            </div>

            <div className="space-y-3">
              <div className="h-9 sm:h-12 w-full max-w-xl rounded-xl bg-slate-200/90 animate-pulse" />
              <div className="h-8 sm:h-10 w-2/3 rounded-xl bg-slate-200/80 animate-pulse" />
            </div>

            <div className="space-y-2 mt-1">
              <div className="h-4 w-full rounded bg-slate-100 animate-pulse" />
              <div className="h-4 w-4/5 rounded bg-slate-100 animate-pulse" />
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <div className="h-8 w-36 rounded-full bg-surface-container animate-pulse" />
              <div className="h-8 w-28 rounded-full bg-surface-container animate-pulse" />
              <div className="h-8 w-28 rounded-full bg-surface-container animate-pulse" />
            </div>

            <div className="flex items-center gap-3 pt-3">
              <div className="h-11 w-36 rounded-full bg-primary/25 animate-pulse" />
              <div className="h-11 w-28 rounded-full bg-slate-100 animate-pulse" />
            </div>
          </div>
        </div>
      </section>

      {/* Pillars / Content preview */}
      <section className="w-full py-12 max-w-(--container-max) mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8">
          <div className="space-y-2">
            <div className="h-4 w-28 rounded bg-primary/20 animate-pulse" />
            <div className="h-7 w-64 rounded-lg bg-slate-200/80 animate-pulse" />
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-36 rounded-2xl border border-border bg-white p-5 space-y-3 shadow-2xs animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-slate-100" />
                <div className="h-5 w-3/4 rounded bg-slate-200/80" />
                <div className="h-3 w-full rounded bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * Skeleton for Event Agenda (/events/[slug]/agenda).
 */
export function EventAgendaSkeleton() {
  return (
    <div className="flex flex-col w-full bg-surface" aria-busy="true" aria-label="Loading agenda">
      <GoogleBrandBar />
      <EventSubNavSkeleton />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 w-full">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="h-8 w-44 rounded-lg bg-slate-200/90 animate-pulse" />
              <div className="h-4 w-64 rounded bg-slate-100 animate-pulse" />
            </div>
            <div className="h-10 w-48 rounded-full bg-surface-container animate-pulse" />
          </div>

          {/* Timeline cards */}
          <div className="space-y-4 pt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border bg-white p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-20 rounded-full bg-primary/10" />
                    <div className="h-6 w-24 rounded-full bg-slate-100" />
                  </div>
                  <div className="h-5 w-3/4 rounded bg-slate-200/80" />
                  <div className="h-4 w-5/6 rounded bg-slate-100" />
                </div>
                <div className="h-8 w-32 rounded-full bg-surface-container shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for Event Speakers (/events/[slug]/speakers).
 */
export function EventSpeakersSkeleton() {
  return (
    <div className="flex flex-col w-full bg-surface" aria-busy="true" aria-label="Loading speakers">
      <GoogleBrandBar />
      <EventSubNavSkeleton />

      <div className="max-w-(--container-max) mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 w-full">
        <div className="flex flex-col gap-8">
          <div className="space-y-2 text-center max-w-xl mx-auto">
            <div className="h-8 w-48 rounded-lg bg-slate-200/90 mx-auto animate-pulse" />
            <div className="h-4 w-72 rounded bg-slate-100 mx-auto animate-pulse" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border bg-white p-6 shadow-2xs flex flex-col items-center text-center gap-4 animate-pulse"
              >
                <div className="w-24 h-24 rounded-full bg-slate-200/80" />
                <div className="space-y-1.5 w-full flex flex-col items-center">
                  <div className="h-5 w-36 rounded bg-slate-200/90" />
                  <div className="h-3.5 w-28 rounded bg-slate-100" />
                </div>
                <div className="h-6 w-32 rounded-full bg-primary/10" />
                <div className="space-y-1.5 w-full">
                  <div className="h-3 w-full rounded bg-slate-100" />
                  <div className="h-3 w-4/5 mx-auto rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for Event Sponsors (/events/[slug]/sponsors).
 */
export function EventSponsorsSkeleton() {
  return (
    <div className="flex flex-col w-full bg-surface" aria-busy="true" aria-label="Loading sponsors">
      <GoogleBrandBar />
      <EventSubNavSkeleton />

      <div className="max-w-(--container-max) mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 w-full">
        <div className="flex flex-col gap-10">
          <div className="space-y-2 text-center max-w-xl mx-auto">
            <div className="h-8 w-56 rounded-lg bg-slate-200/90 mx-auto animate-pulse" />
            <div className="h-4 w-80 rounded bg-slate-100 mx-auto animate-pulse" />
          </div>

          <div className="space-y-4">
            <div className="h-5 w-32 rounded bg-slate-200/80 animate-pulse" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 rounded-2xl border border-border bg-white p-6 shadow-2xs flex items-center justify-center animate-pulse">
                  <div className="h-8 w-24 rounded bg-slate-200/70" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for the Events Listing page (/events).
 */
export function EventsExplorerSkeleton() {
  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:gap-12 w-full animate-pulse" aria-busy="true" aria-label="Loading events catalog">
      {/* Sidebar Filter Skeleton */}
      <aside className="flex flex-col gap-6 lg:w-72 lg:shrink-0">
        <div className="h-11 w-full rounded-xl bg-surface-container-low border border-border p-1 flex gap-1">
          <div className="flex-1 rounded-lg bg-white shadow-2xs" />
          <div className="flex-1 rounded-lg bg-transparent" />
        </div>

        <div className="h-11 w-full rounded-xl bg-surface-container-low border border-border/60" />

        <div className="space-y-2 pt-2">
          <div className="h-4 w-20 rounded bg-slate-200/80" />
          <div className="flex flex-wrap gap-2">
            <div className="h-7 w-16 rounded-full bg-slate-100" />
            <div className="h-7 w-20 rounded-full bg-slate-100" />
            <div className="h-7 w-24 rounded-full bg-slate-100" />
            <div className="h-7 w-18 rounded-full bg-slate-100" />
          </div>
        </div>
      </aside>

      {/* Main Grid Skeleton */}
      <main className="flex-1">
        <EventCardsGridSkeleton count={6} />
      </main>
    </div>
  );
}
