"use client";

import { useState } from "react";
import { downloadForGoogleSheets, copyForGoogleSheets } from "@/lib/sheets-export";
import type { ChapterEvent } from "@/types";
import type { EventStats } from "@/lib/db";

interface ConsoleOverviewExportProps {
  events: ChapterEvent[];
  workshopStats?: EventStats;
}

export function ConsoleOverviewExport({ events, workshopStats }: ConsoleOverviewExportProps) {
  const [copySuccess, setCopySuccess] = useState(false);
  const activeStats = workshopStats;

  const rows = events.map((e) => {
    const isWorkshop = Boolean(e.workshop) || e.slug === "dev-to-cloud";
    return {
      title: e.title,
      slug: e.slug,
      date: e.startsAt,
      format: e.format,
      location: e.location,
      status: isWorkshop && activeStats ? (activeStats.isOpen ? "Registration Open" : "Closed") : "Completed",
      registered: isWorkshop && activeStats ? activeStats.totalRegistered : "N/A",
      capacity: isWorkshop && activeStats ? activeStats.capacity : "N/A",
      checkedIn: isWorkshop && activeStats ? activeStats.checkedInCount : "N/A",
    };
  });

  const columns = [
    { key: "title", label: "Event Title" },
    { key: "slug", label: "Event Slug" },
    { key: "date", label: "Start Date" },
    { key: "format", label: "Format" },
    { key: "location", label: "Location" },
    { key: "status", label: "Status" },
    { key: "registered", label: "Total Registered" },
    { key: "capacity", label: "Capacity" },
    { key: "checkedIn", label: "Checked In" },
  ];

  function handleDownloadSheets() {
    downloadForGoogleSheets(
      `gdg_vcet_events_overview_${new Date().toISOString().slice(0, 10)}`,
      rows,
      columns
    );
  }

  async function handleCopySheets() {
    const ok = await copyForGoogleSheets(rows, columns);
    if (ok) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    }
  }

  return (
    <div className="inline-flex rounded-xl border border-emerald-300 bg-emerald-50/70 p-0.5 shrink-0 self-start sm:self-auto">
      <button
        type="button"
        onClick={handleDownloadSheets}
        title="Download full events and cohort overview CSV for Google Sheets"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-emerald-800 hover:bg-emerald-100 text-xs font-semibold transition-all cursor-pointer"
      >
        <svg
          className="w-3.5 h-3.5 text-emerald-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <span>Export Overview to Sheets</span>
      </button>

      <button
        type="button"
        onClick={handleCopySheets}
        title="Copy events table to clipboard for instant paste into Google Sheets"
        className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-emerald-700 hover:bg-emerald-100 text-xs font-medium border-l border-emerald-200 transition-all cursor-pointer"
      >
        {copySuccess ? (
          <span className="font-bold text-emerald-800">Copied!</span>
        ) : (
          <span>Copy TSV</span>
        )}
      </button>
    </div>
  );
}

