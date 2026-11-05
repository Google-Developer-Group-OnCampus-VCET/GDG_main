"use client";

import { useState, useMemo } from "react";
import type { CommunityResource } from "@/types";

interface ResourcesViewProps {
  initialResources: CommunityResource[];
}

const CATEGORIES = [
  { id: "all", label: "All Resources" },
  { id: "slides", label: "Slide Decks" },
  { id: "code", label: "Code Repos" },
  { id: "docs", label: "Documentation" },
  { id: "video", label: "Recordings" },
  { id: "tools", label: "Tools & Templates" },
];

export function ResourcesView({ initialResources }: ResourcesViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredResources = useMemo(() => {
    return initialResources.filter((res) => {
      const matchesCategory =
        selectedCategory === "all" || res.category === selectedCategory;

      const matchesSearch =
        searchQuery.trim() === "" ||
        res.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        res.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        res.author?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        res.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesCategory && matchesSearch;
    });
  }, [initialResources, selectedCategory, searchQuery]);

  return (
    <div className="flex flex-col gap-8">
      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-border shadow-xs">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-primary text-on-primary shadow-xs"
                    : "bg-surface-container-low text-foreground-muted hover:text-foreground hover:bg-surface-container"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-foreground-muted pointer-events-none">
            search
          </span>
          <input
            type="text"
            placeholder="Search slides, repo name, topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-full border border-border bg-surface-container-lowest text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-foreground-muted">
          Showing <span className="font-bold text-foreground">{filteredResources.length}</span>{" "}
          {filteredResources.length === 1 ? "resource" : "resources"}
        </p>
      </div>

      {/* Grid of Resources */}
      {filteredResources.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-border p-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-foreground-muted">
            <span className="material-symbols-outlined text-[24px]">folder_off</span>
          </div>
          <h3 className="text-base font-bold text-foreground">No resources match your filter</h3>
          <p className="text-xs text-foreground-muted max-w-sm">
            Try adjusting your search keywords or switch to another category filter.
          </p>
          <button
            onClick={() => {
              setSelectedCategory("all");
              setSearchQuery("");
            }}
            className="mt-2 text-xs font-semibold text-primary hover:underline"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((res) => {
            const categoryColors: Record<string, { bg: string; icon: string }> = {
              slides: { bg: "bg-tertiary-fixed text-on-tertiary-fixed", icon: "slideshow" },
              code: { bg: "bg-primary-fixed text-on-primary-fixed", icon: "code" },
              docs: { bg: "bg-secondary-fixed text-on-secondary-fixed", icon: "description" },
              video: { bg: "bg-error-container text-on-error-container", icon: "videocam" },
              tools: { bg: "bg-surface-container-high text-foreground", icon: "build" },
            };

            const style = categoryColors[res.category] || categoryColors.docs;

            return (
              <div
                key={res.id}
                className="bg-white rounded-2xl border border-border shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-6 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${style.bg}`}
                    >
                      <span className="material-symbols-outlined text-[14px]">{style.icon}</span>
                      <span className="capitalize">{res.category}</span>
                    </span>
                    {res.fileSize && (
                      <span className="text-[11px] font-mono text-foreground-muted">
                        {res.fileSize}
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {res.title}
                    </h3>
                    <p className="mt-2 text-xs text-foreground-muted leading-relaxed line-clamp-3">
                      {res.description}
                    </p>
                  </div>

                  {res.tags && res.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {res.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md bg-surface-container-low text-[10px] font-medium text-foreground-muted"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="px-6 py-4 bg-surface-container-lowest border-t border-border/60 flex items-center justify-between">
                  <span className="text-[11px] text-foreground-muted">
                    By <span className="font-semibold text-foreground">{res.author || "GDG VCET"}</span>
                  </span>

                  <a
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-hover group/link"
                  >
                    <span>Access Resource</span>
                    <span className="material-symbols-outlined text-[14px] group-hover/link:translate-x-0.5 transition-transform">
                      arrow_outward
                    </span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
