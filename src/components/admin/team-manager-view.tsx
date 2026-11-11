"use client";

import { useState } from "react";
import type { AdminUser, AdminRole, AuditLogRecord } from "@/types";
import { ROLE_PERMISSIONS } from "@/lib/auth/roles";

interface Props {
  initialUsers: AdminUser[];
  initialLogs: AuditLogRecord[];
}

export function TeamManagerView({ initialUsers, initialLogs }: Props) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [logs] = useState<AuditLogRecord[]>(initialLogs);
  const [activeTab, setActiveTab] = useState<"members" | "matrix" | "audit">("members");
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "event-manager" as AdminRole,
  });
  const [loading, setLoading] = useState(false);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok && data.user) {
        setUsers((prev) => [data.user, ...prev]);
        setShowModal(false);
        setFormData({ name: "", email: "", role: "event-manager" });
      } else {
        alert(data.error || "Failed to add team member");
      }
    } catch {
      alert("Error adding team member");
    } finally {
      setLoading(false);
    }
  };

  const roleBadges: Record<string, { bg: string; text: string }> = {
    "super-admin": { bg: "bg-purple-100", text: "text-purple-800" },
    "chapter-admin": { bg: "bg-primary-fixed", text: "text-on-primary-fixed" },
    "event-manager": { bg: "bg-secondary-fixed", text: "text-on-secondary-fixed" },
    "registration-manager": { bg: "bg-amber-100", text: "text-amber-800" },
    "check-in-volunteer": { bg: "bg-emerald-100", text: "text-emerald-800" },
    "content-manager": { bg: "bg-blue-100", text: "text-blue-800" },
    "analytics-viewer": { bg: "bg-gray-100", text: "text-gray-800" },
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Team &amp; Role-Based Access Control (RBAC)
          </h1>
          <p className="text-xs sm:text-sm text-foreground-muted mt-1">
            Manage chapter administrators, organizers, and volunteers with fine-grained security permissions.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-hover transition-colors shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[16px]">person_add</span>
          <span>Add Team Member</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          onClick={() => setActiveTab("members")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "members"
              ? "bg-primary text-on-primary shadow-xs"
              : "bg-surface-container-low text-foreground-muted hover:text-foreground"
          }`}
        >
          Active Team ({users.length})
        </button>
        <button
          onClick={() => setActiveTab("matrix")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "matrix"
              ? "bg-primary text-on-primary shadow-xs"
              : "bg-surface-container-low text-foreground-muted hover:text-foreground"
          }`}
        >
          RBAC Permissions Matrix
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "audit"
              ? "bg-primary text-on-primary shadow-xs"
              : "bg-surface-container-low text-foreground-muted hover:text-foreground"
          }`}
        >
          Security Audit Trail ({logs.length})
        </button>
      </div>

      {/* TAB 1: MEMBERS */}
      {activeTab === "members" && (
        <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-low border-b border-border text-[11px] text-foreground-muted uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Member Name</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {users.map((u) => {
                const style = roleBadges[u.role] || roleBadges["chapter-admin"];
                return (
                  <tr key={u.id} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-foreground">{u.name}</div>
                      <div className="text-[10px] text-foreground-muted font-mono">{u.id}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-foreground">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${style.bg} ${style.text}`}>
                        {u.role.replace("-", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] text-status-success font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-status-success"></span>
                        <span className="capitalize">{u.status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-foreground-muted">
                      {u.createdAt.split("T")[0]}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: RBAC MATRIX */}
      {activeTab === "matrix" && (
        <div className="bg-white rounded-2xl border border-border p-6 shadow-xs flex flex-col gap-4">
          <h2 className="text-base font-bold text-foreground">8-Tier Role Permissions Matrix</h2>
          <p className="text-xs text-foreground-muted">
            The platform enforces strict role-based access checks at both the API and UI layers.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-border/80">
              <thead className="bg-surface-container-low border-b border-border text-[11px] text-foreground-muted uppercase">
                <tr>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Allowed Permissions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {Object.entries(ROLE_PERMISSIONS).map(([role, perms]) => (
                  <tr key={role}>
                    <td className="py-3 px-3 font-bold text-foreground capitalize font-mono">
                      {role}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {perms.map((p) => (
                          <span
                            key={p}
                            className="px-2 py-0.5 rounded bg-surface-container-low text-[10px] font-mono text-foreground"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT TRAIL */}
      {activeTab === "audit" && (
        <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-low border-b border-border text-[11px] text-foreground-muted uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Operator</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity Type</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-surface-container-lowest">
                  <td className="py-2.5 px-4 font-mono text-[11px] text-foreground-muted">
                    {log.createdAt.replace("T", " ").substring(0, 19)}
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-foreground">
                    {log.userEmail}
                  </td>
                  <td className="py-2.5 px-4 font-mono font-bold text-primary">
                    {log.action}
                  </td>
                  <td className="py-2.5 px-4 uppercase text-[10px] font-bold text-foreground-muted">
                    {log.entityType}
                  </td>
                  <td className="py-2.5 px-4 text-foreground-muted truncate max-w-[280px]">
                    {log.details || log.entityId}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Member Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-border max-w-md w-full p-6 sm:p-8 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Add Chapter Organizer</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl border border-border text-foreground hover:bg-surface-container"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Priyanshu Dave"
                  className="px-3 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@vcet.edu.in"
                  className="px-3 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">Assigned Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as AdminRole })}
                  className="px-3 py-2 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest"
                >
                  <option value="chapter-admin">Chapter Admin (Full Chapter Control)</option>
                  <option value="event-manager">Event Manager (Events, Speakers & Agenda)</option>
                  <option value="registration-manager">Registration Manager (Roster & Approvals)</option>
                  <option value="check-in-volunteer">Check-in Volunteer (Scanner Only)</option>
                  <option value="content-manager">Content Manager (Announcements & Resources)</option>
                  <option value="analytics-viewer">Analytics Viewer (Read Only)</option>
                </select>
              </div>

              <p className="text-[11px] text-foreground-muted">
                Initial password will be set to <span className="font-mono font-bold">gdgvcet2025!</span>.
              </p>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-hover transition-colors shadow-xs"
              >
                {loading ? "Creating User..." : "Invite / Create Admin Account"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
