import React from "react";
import { GoogleBrandBar, GoogleLoaderBadge } from "./event-skeletons";

/**
 * Skeleton loader for the Admin Console and Admin subpages.
 */
export function AdminPageSkeleton({ label = "Loading Admin Console…" }: { label?: string }) {
  return (
    <div className="w-full min-h-[60vh] bg-surface flex flex-col" aria-busy="true" aria-label={label}>
      <GoogleBrandBar />

      <div className="mx-auto max-w-(--container-max) px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full flex flex-col gap-8">
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div className="space-y-2">
            <div className="h-8 w-56 rounded-xl bg-slate-200/90 animate-pulse" />
            <div className="h-4 w-72 rounded bg-slate-100 animate-pulse" />
          </div>
          <GoogleLoaderBadge label={label} />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-white p-5 space-y-3 shadow-2xs animate-pulse">
              <div className="h-3.5 w-24 rounded bg-slate-100" />
              <div className="h-7 w-16 rounded bg-slate-200/90" />
              <div className="h-3 w-28 rounded bg-slate-100" />
            </div>
          ))}
        </div>

        {/* Content Table / Cards Placeholder */}
        <div className="rounded-2xl border border-border bg-white p-6 shadow-2xs space-y-4 animate-pulse">
          <div className="h-5 w-40 rounded bg-slate-200/80 mb-2" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 w-full rounded-xl bg-surface-container-low border border-border/40" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
