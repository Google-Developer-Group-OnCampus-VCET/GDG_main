import Link from "next/link";
import {
  getAllEventsAdmin,
  getAllRegistrationsAdmin,
  getPlatformAnalytics,
  getAuditLogs,
} from "@/lib/db";
import { events as staticEvents } from "@/content/events";
import { requireAuth } from "@/lib/auth";

export const metadata = {
  title: "Overview Dashboard · GDG on Campus VCET Admin",
};

export default async function AdminOverviewPage() {
  const user = await requireAuth();
  const analytics = getPlatformAnalytics(user.chapterId);
  const events = getAllEventsAdmin(user.chapterId);
  const recentRegistrations = getAllRegistrationsAdmin().slice(0, 6);
  const auditLogs = getAuditLogs(user.chapterId, 6);

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 gap-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Chapter Operations &amp; Control Center
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
              GDG VCET
            </span>
          </div>
          <p className="text-xs sm:text-sm text-foreground-muted mt-1">
            Real-time management for developer workshops, student registrations, check-in terminals, and chapter analytics.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/events/new"
            className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-hover transition-colors shadow-xs flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Create New Event</span>
          </Link>
          <Link
            href="/admin/attendance"
            className="px-4 py-2 rounded-xl bg-white border border-border text-foreground text-xs font-bold hover:bg-surface-container transition-colors shadow-xs flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
            <span>QR Scanner Hub</span>
          </Link>
        </div>
      </div>

      {/* Global Real Database Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-border shadow-xs flex flex-col gap-1">
          <span className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
            Total Events
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-foreground">
            {events.length}
          </span>
          <span className="text-[10px] text-foreground-muted">
            {staticEvents.length} total in chapter catalog
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-border shadow-xs flex flex-col gap-1">
          <span className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
            Registrations
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-primary">
            {analytics.totalRegistrations}
          </span>
          <span className="text-[10px] text-foreground-muted">Live participant records</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-border shadow-xs flex flex-col gap-1">
          <span className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
            Total Attendance
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-status-success">
            {analytics.totalAttendance}
          </span>
          <span className="text-[10px] text-foreground-muted">Verified QR entrance badges</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-border shadow-xs flex flex-col gap-1">
          <span className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
            Attendance Rate
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-google-yellow">
            {analytics.attendanceRate}%
          </span>
          <span className="text-[10px] text-foreground-muted">Checked-in conversion</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-border shadow-xs flex flex-col gap-1">
          <span className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
            Certificates
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-secondary">
            {analytics.totalCertificates}
          </span>
          <span className="text-[10px] text-foreground-muted">Verifiable digital credentials</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-border shadow-xs flex flex-col gap-1">
          <span className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
            Resources
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-foreground">
            {analytics.totalResources}
          </span>
          <span className="text-[10px] text-foreground-muted">Published artifacts &amp; slides</span>
        </div>
      </div>

      {/* Quick Operations Launchpad */}
      <div className="bg-white rounded-2xl border border-border p-5 shadow-xs flex flex-col gap-3">
        <span className="text-xs font-bold text-foreground uppercase tracking-wider">
          Quick Operations Launchpad
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Link
            href="/admin/events/new"
            className="p-3 rounded-xl bg-surface-container-low hover:bg-surface-container hover:border-primary/40 border border-transparent transition-all flex flex-col items-center text-center gap-1.5 group"
          >
            <div className="w-8 h-8 rounded-lg bg-primary-fixed text-on-primary-fixed flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
            </div>
            <span className="text-xs font-bold text-foreground">New Event</span>
            <span className="text-[10px] text-foreground-muted">Builder &amp; Form</span>
          </Link>

          <Link
            href="/admin/registrations"
            className="p-3 rounded-xl bg-surface-container-low hover:bg-surface-container hover:border-primary/40 border border-transparent transition-all flex flex-col items-center text-center gap-1.5 group"
          >
            <div className="w-8 h-8 rounded-lg bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
            </div>
            <span className="text-xs font-bold text-foreground">Roster Table</span>
            <span className="text-[10px] text-foreground-muted">Approve &amp; Export</span>
          </Link>

          <Link
            href="/admin/attendance"
            className="p-3 rounded-xl bg-surface-container-low hover:bg-surface-container hover:border-primary/40 border border-transparent transition-all flex flex-col items-center text-center gap-1.5 group"
          >
            <div className="w-8 h-8 rounded-lg bg-status-success/15 text-status-success flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
            </div>
            <span className="text-xs font-bold text-foreground">QR Scanner</span>
            <span className="text-[10px] text-foreground-muted">Live Entrance</span>
          </Link>

          <Link
            href="/admin/certificates"
            className="p-3 rounded-xl bg-surface-container-low hover:bg-surface-container hover:border-primary/40 border border-transparent transition-all flex flex-col items-center text-center gap-1.5 group"
          >
            <div className="w-8 h-8 rounded-lg bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
            </div>
            <span className="text-xs font-bold text-foreground">Certificates</span>
            <span className="text-[10px] text-foreground-muted">1-Click Bulk Issue</span>
          </Link>

          <Link
            href="/admin/announcements"
            className="p-3 rounded-xl bg-surface-container-low hover:bg-surface-container hover:border-primary/40 border border-transparent transition-all flex flex-col items-center text-center gap-1.5 group"
          >
            <div className="w-8 h-8 rounded-lg bg-yellow-100 text-yellow-800 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">campaign</span>
            </div>
            <span className="text-xs font-bold text-foreground">Broadcast</span>
            <span className="text-[10px] text-foreground-muted">Cohort Updates</span>
          </Link>

          <Link
            href="/admin/analytics"
            className="p-3 rounded-xl bg-surface-container-low hover:bg-surface-container hover:border-primary/40 border border-transparent transition-all flex flex-col items-center text-center gap-1.5 group"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">insights</span>
            </div>
            <span className="text-xs font-bold text-foreground">Analytics</span>
            <span className="text-[10px] text-foreground-muted">Demographics</span>
          </Link>
        </div>
      </div>

      {/* Main Grid: Active Events & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Active Events (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-white rounded-2xl border border-border p-6 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground">Chapter Events</h2>
                <p className="text-xs text-foreground-muted">Active, upcoming and draft event records</p>
              </div>
              <Link
                href="/admin/events"
                className="text-xs font-bold text-primary hover:underline"
              >
                View All Events →
              </Link>
            </div>

            <div className="flex flex-col gap-3">
              {events.map((evt) => (
                <div
                  key={evt.id}
                  className="p-4 rounded-xl border border-border bg-surface-container-lowest hover:border-primary/40 transition-all flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-[10px] font-bold uppercase">
                          {evt.category}
                        </span>
                        <span className="text-[10px] text-foreground-muted capitalize">
                          {evt.format} · {evt.visibility}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-foreground mt-1">
                        {evt.title}
                      </h3>
                      <p className="text-[11px] text-foreground-muted mt-0.5">
                        {evt.startsAt} · {evt.location || "VCET Auditorium"}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Link
                        href="/admin/registrations"
                        title="View Roster"
                        className="p-1.5 rounded-lg border border-border hover:bg-surface-container text-foreground"
                      >
                        <span className="material-symbols-outlined text-[16px]">group</span>
                      </Link>
                      <Link
                        href="/admin/attendance"
                        title="Check-in Terminal"
                        className="p-1.5 rounded-lg border border-border hover:bg-surface-container text-foreground"
                      >
                        <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
                      </Link>
                      <Link
                        href={`/admin/events/${evt.slug}/edit`}
                        title="Edit Event"
                        className="p-1.5 rounded-lg border border-border hover:bg-surface-container text-foreground"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </Link>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-foreground-muted">
                    <span>
                      Capacity: <span className="font-bold text-foreground">{evt.capacity}</span> seats
                    </span>
                    <span className="flex items-center gap-1 text-primary font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                      <span>{evt.isRegistrationOpen ? "Registration Open" : "Closed"}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Registrations Table */}
          <div className="bg-white rounded-2xl border border-border p-6 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground">Recent Registrations</h2>
                <p className="text-xs text-foreground-muted">Latest participant sign-ups across cohorts</p>
              </div>
              <Link
                href="/admin/registrations"
                className="text-xs font-bold text-primary hover:underline"
              >
                Manage All →
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-[11px] text-foreground-muted">
                    <th className="pb-2 font-semibold">Pass Ref</th>
                    <th className="pb-2 font-semibold">Participant</th>
                    <th className="pb-2 font-semibold">Track</th>
                    <th className="pb-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {recentRegistrations.map((reg) => (
                    <tr key={reg.id} className="hover:bg-surface-container-lowest">
                      <td className="py-2.5 font-mono text-[11px] font-bold text-primary">
                        {reg.referenceId}
                      </td>
                      <td className="py-2.5">
                        <div className="font-semibold text-foreground">{reg.fullName}</div>
                        <div className="text-[10px] text-foreground-muted">{reg.college}</div>
                      </td>
                      <td className="py-2.5 text-[11px] text-foreground-muted truncate max-w-[140px]">
                        {reg.track.split(":")[0]}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                            reg.checkedIn
                              ? "bg-emerald-100 text-emerald-800"
                              : reg.status === "confirmed"
                              ? "bg-primary-fixed text-on-primary-fixed"
                              : "bg-surface-container text-foreground-muted"
                          }`}
                        >
                          {reg.checkedIn ? "Checked In" : reg.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Audit Logs & System Health (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Security & Audit Logs Stream */}
          <div className="bg-white rounded-2xl border border-border p-6 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-primary">history</span>
                <h2 className="text-base font-bold text-foreground">Audit Log Activity</h2>
              </div>
              <span className="text-[11px] font-mono text-foreground-muted">Chapter Log</span>
            </div>

            <div className="flex flex-col gap-3">
              {auditLogs.length === 0 ? (
                <p className="text-xs text-foreground-muted py-4 text-center">
                  No administrative actions logged yet.
                </p>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-surface-container-low border border-border/60 flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground capitalize">
                        {log.action.replace("_", " ")}
                      </span>
                      <span className="text-[10px] font-mono text-foreground-muted">
                        {log.createdAt.split("T")[0]}
                      </span>
                    </div>
                    <p className="text-[11px] text-foreground-muted truncate">
                      {log.details || `${log.entityType}: ${log.entityId}`}
                    </p>
                    <span className="text-[10px] text-primary font-medium">
                      By: {log.userEmail}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Database & Multi-Chapter Tenancy Card */}
          <div className="bg-white rounded-2xl border border-border p-6 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">Multi-Chapter Architecture</h2>
              <span className="px-2 py-0.5 rounded-full bg-status-success/10 text-status-success text-[10px] font-bold">
                Scoped Active
              </span>
            </div>

            <p className="text-xs text-foreground-muted leading-relaxed">
              Platform is running in single-database, tenant-isolated mode with <span className="font-mono font-bold text-foreground">chapter_id = &apos;gdg-vcet&apos;</span>. All event queries, registrations, certificates, and team permissions are strictly chapter-scoped.
            </p>

            <div className="p-3.5 rounded-xl bg-surface-container-low border border-border/80 flex flex-col gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-foreground-muted">Current Chapter:</span>
                <span className="font-bold text-foreground">GDG on Campus VCET</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground-muted">Institution:</span>
                <span className="font-bold text-foreground">VCET, Vasai</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground-muted">Database Engine:</span>
                <span className="font-mono text-[11px] text-foreground">Node 24 native SQLite (WAL)</span>
              </div>
            </div>

            <Link
              href="/admin/settings"
              className="mt-1 text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              <span>Manage Chapter Tenant Settings</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
