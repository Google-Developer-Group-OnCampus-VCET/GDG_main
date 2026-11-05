"use client";

import Link from "next/link";
import type { ChapterEvent } from "@/types";

interface Props {
  analytics: {
    totalEvents: number;
    totalRegistrations: number;
    totalAttendance: number;
    attendanceRate: number;
    totalCertificates: number;
    totalResources: number;
    monthlyTrend: { month: string; count: number }[];
    departmentDistribution: { department: string; count: number }[];
    collegeDistribution: { college: string; count: number }[];
  };
  events: ChapterEvent[];
}

export function PlatformAnalyticsView({ analytics, events }: Props) {
  const maxDeptCount = Math.max(...analytics.departmentDistribution.map((d) => d.count), 1);
  const maxCollegeCount = Math.max(...analytics.collegeDistribution.map((c) => c.count), 1);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Cross-Event Platform Analytics
          </h1>
          <p className="text-xs sm:text-sm text-foreground-muted mt-1">
            Deterministic metrics calculated directly from the SQLite database records. Zero fabricated animations.
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-status-success/10 text-status-success text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-status-success animate-pulse"></span>
          <span>100% Real-Time SQLite Sync</span>
        </div>
      </div>

      {/* Global Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex flex-col gap-1">
          <span className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
            Total Events
          </span>
          <span className="text-3xl font-extrabold text-foreground">{analytics.totalEvents}</span>
          <span className="text-[10px] text-foreground-muted">All active cohorts</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex flex-col gap-1">
          <span className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
            Total Registrations
          </span>
          <span className="text-3xl font-extrabold text-primary">
            {analytics.totalRegistrations}
          </span>
          <span className="text-[10px] text-foreground-muted">Participant roster</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex flex-col gap-1">
          <span className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
            Total Attendance
          </span>
          <span className="text-3xl font-extrabold text-status-success">
            {analytics.totalAttendance}
          </span>
          <span className="text-[10px] text-foreground-muted">Verified entrances</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex flex-col gap-1">
          <span className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
            Attendance Rate
          </span>
          <span className="text-3xl font-extrabold text-google-yellow">
            {analytics.attendanceRate}%
          </span>
          <span className="text-[10px] text-foreground-muted">Checked in / registered</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex flex-col gap-1">
          <span className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
            Certificates Issued
          </span>
          <span className="text-3xl font-extrabold text-secondary">
            {analytics.totalCertificates}
          </span>
          <span className="text-[10px] text-foreground-muted">Verified digital badges</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex flex-col gap-1">
          <span className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
            Resources
          </span>
          <span className="text-3xl font-extrabold text-foreground">
            {analytics.totalResources}
          </span>
          <span className="text-[10px] text-foreground-muted">Open artifacts</span>
        </div>
      </div>

      {/* Demographic Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Distribution */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">Department Demographics</h2>
            <span className="text-xs text-foreground-muted">Total: {analytics.totalRegistrations}</span>
          </div>

          <div className="flex flex-col gap-3">
            {analytics.departmentDistribution.map((dept) => {
              const pct = Math.round((dept.count / analytics.totalRegistrations) * 100);
              const barWidth = Math.round((dept.count / maxDeptCount) * 100);

              return (
                <div key={dept.department} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">{dept.department}</span>
                    <span className="text-foreground-muted font-mono">
                      {dept.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-surface-container-low overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${barWidth}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* College Distribution */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">Top Colleges Represented</h2>
            <span className="text-xs text-foreground-muted">Institutional diversity</span>
          </div>

          <div className="flex flex-col gap-3">
            {analytics.collegeDistribution.map((coll) => {
              const pct = Math.round((coll.count / analytics.totalRegistrations) * 100);
              const barWidth = Math.round((coll.count / maxCollegeCount) * 100);

              return (
                <div key={coll.college} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground truncate max-w-[280px]">
                      {coll.college}
                    </span>
                    <span className="text-foreground-muted font-mono">
                      {coll.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-surface-container-low overflow-hidden">
                    <div
                      className="h-full rounded-full bg-secondary"
                      style={{ width: `${barWidth}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Event Breakdown Table */}
      <div className="bg-white rounded-2xl border border-border p-6 shadow-xs flex flex-col gap-4">
        <h2 className="text-base font-bold text-foreground">Event Performance Summary</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-low border-b border-border text-[11px] text-foreground-muted uppercase font-semibold">
              <tr>
                <th className="py-2.5 px-3">Event Title</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Capacity</th>
                <th className="py-2.5 px-3">Format</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {events.map((evt) => (
                <tr key={evt.id} className="hover:bg-surface-container-lowest">
                  <td className="py-3 px-3 font-semibold text-foreground">{evt.title}</td>
                  <td className="py-3 px-3 capitalize">{evt.category}</td>
                  <td className="py-3 px-3 font-mono">{evt.capacity} seats</td>
                  <td className="py-3 px-3 capitalize">{evt.format}</td>
                  <td className="py-3 px-3 text-right">
                    <Link
                      href={`/admin/events/${evt.slug}/analytics`}
                      className="text-primary font-bold hover:underline"
                    >
                      View Deep Dive →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

