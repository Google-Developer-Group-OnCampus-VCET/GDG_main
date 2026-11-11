"use client";

import { useState, useMemo } from "react";
import type { ChapterEvent, RegistrationRecord, RegistrationStatus, PaymentStatus } from "@/types";

interface Props {
  initialRegistrations: RegistrationRecord[];
  events: ChapterEvent[];
}

export function CentralRegistrationsView({ initialRegistrations, events }: Props) {
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>(initialRegistrations);
  const [search, setSearch] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedPayment, setSelectedPayment] = useState("all");
  const [selectedAttendance, setSelectedAttendance] = useState("all");
  const [activeModalReg, setActiveModalReg] = useState<RegistrationRecord | null>(null);
  const [internalNoteInput, setInternalNoteInput] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const filteredRegistrations = useMemo(() => {
    return registrations.filter((r) => {
      const matchEvent = selectedEvent === "all" || r.eventSlug === selectedEvent;
      const matchStatus = selectedStatus === "all" || r.status === selectedStatus;
      const matchPayment = selectedPayment === "all" || r.paymentStatus === selectedPayment;
      const matchAttendance =
        selectedAttendance === "all"
          ? true
          : selectedAttendance === "checked-in"
          ? r.checkedIn
          : !r.checkedIn;

      const q = search.toLowerCase().trim();
      const matchSearch =
        q === "" ||
        r.fullName.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.referenceId.toLowerCase().includes(q) ||
        r.college.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q);

      return matchEvent && matchStatus && matchPayment && matchAttendance && matchSearch;
    });
  }, [registrations, search, selectedEvent, selectedStatus, selectedPayment, selectedAttendance]);

  const handleUpdateStatus = async (id: string, newStatus: RegistrationStatus, note?: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/registrations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, internalNotes: note }),
      });

      if (res.ok) {
        setRegistrations((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: newStatus, internalNotes: note ?? r.internalNotes } : r))
        );
        if (activeModalReg?.id === id) {
          setActiveModalReg((prev) => (prev ? { ...prev, status: newStatus, internalNotes: note ?? prev.internalNotes } : null));
        }
      }
    } catch {
      alert("Error updating registration status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePayment = async (id: string, paymentStatus: PaymentStatus) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/registrations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus }),
      });

      if (res.ok) {
        setRegistrations((prev) =>
          prev.map((r) => (r.id === id ? { ...r, paymentStatus } : r))
        );
        if (activeModalReg?.id === id) {
          setActiveModalReg((prev) => (prev ? { ...prev, paymentStatus } : null));
        }
      }
    } catch {
      alert("Error updating payment verification status");
    } finally {
      setActionLoading(false);
    }
  };

  const getExportCsvUrl = () => {
    const params = new URLSearchParams();
    params.set("export", "csv");
    if (selectedEvent !== "all") params.set("eventSlug", selectedEvent);
    if (selectedStatus !== "all") params.set("status", selectedStatus);
    if (selectedPayment !== "all") params.set("paymentStatus", selectedPayment);
    if (search.trim()) params.set("search", search.trim());
    return `/api/admin/registrations?${params.toString()}`;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Centralized Registration Roster
          </h1>
          <p className="text-xs sm:text-sm text-foreground-muted mt-1">
            Review participant applications, verify payments, approve cohorts, and export attendance records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={getExportCsvUrl()}
            download
            className="px-4 py-2.5 rounded-xl bg-white border border-border text-foreground text-xs font-bold hover:bg-surface-container transition-colors shadow-xs flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white rounded-2xl border border-border p-4 shadow-xs flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-foreground-muted pointer-events-none">
              search
            </span>
            <input
              type="text"
              placeholder="Search attendee, pass ref..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-surface-container-lowest text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Event Filter */}
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="px-3 py-2 rounded-xl border border-border bg-surface-container-lowest text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="all">All Events ({events.length})</option>
            {events.map((e) => (
              <option key={e.slug} value={e.slug}>
                {e.title}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-xl border border-border bg-surface-container-lowest text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="all">All Application Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending Review</option>
            <option value="waitlisted">Waitlisted</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Payment Status Filter */}
          <select
            value={selectedPayment}
            onChange={(e) => setSelectedPayment(e.target.value)}
            className="px-3 py-2 rounded-xl border border-border bg-surface-container-lowest text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="all">All Payment Statuses</option>
            <option value="not-required">Not Required</option>
            <option value="submitted">Submitted for Verification</option>
            <option value="verified">Verified</option>
            <option value="rejected">Payment Rejected</option>
          </select>

          {/* Attendance Filter */}
          <select
            value={selectedAttendance}
            onChange={(e) => setSelectedAttendance(e.target.value)}
            className="px-3 py-2 rounded-xl border border-border bg-surface-container-lowest text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="all">All Attendance</option>
            <option value="checked-in">Checked In (At Venue)</option>
            <option value="not-checked-in">Not Checked In</option>
          </select>
        </div>

        <div className="flex items-center justify-between text-xs text-foreground-muted pt-2 border-t border-border/60">
          <span>
            Showing <span className="font-bold text-foreground">{filteredRegistrations.length}</span>{" "}
            of <span className="font-bold text-foreground">{registrations.length}</span> participants
          </span>
          {(search || selectedEvent !== "all" || selectedStatus !== "all" || selectedPayment !== "all" || selectedAttendance !== "all") && (
            <button
              onClick={() => {
                setSearch("");
                setSelectedEvent("all");
                setSelectedStatus("all");
                setSelectedPayment("all");
                setSelectedAttendance("all");
              }}
              className="text-primary font-semibold hover:underline"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-low border-b border-border text-[11px] text-foreground-muted uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Pass Ref</th>
                <th className="py-3 px-4">Participant</th>
                <th className="py-3 px-4">College &amp; Dept</th>
                <th className="py-3 px-4">Track</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Attendance</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredRegistrations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-foreground-muted">
                    No attendee records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredRegistrations.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-primary">
                      {r.referenceId}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-foreground">{r.fullName}</div>
                      <div className="text-[11px] text-foreground-muted">{r.email}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-foreground truncate max-w-[160px]">{r.college}</div>
                      <div className="text-[11px] text-foreground-muted">{r.department} · {r.yearOfStudy}</div>
                    </td>

                    <td className="py-3 px-4 text-foreground truncate max-w-[140px]">
                      {r.track.split(":")[0]}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          r.status === "confirmed"
                            ? "bg-primary-fixed text-on-primary-fixed"
                            : r.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : r.status === "waitlisted"
                            ? "bg-surface-container text-foreground-muted"
                            : "bg-red-100 text-status-error"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                          r.paymentStatus === "verified"
                            ? "bg-emerald-100 text-emerald-800"
                            : r.paymentStatus === "submitted"
                            ? "bg-yellow-100 text-yellow-800 font-bold"
                            : "text-foreground-muted"
                        }`}
                      >
                        {r.paymentStatus || "not-required"}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.checkedIn
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-surface-container-low text-foreground-muted"
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        <span>{r.checkedIn ? "Checked In" : "Pending"}</span>
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setActiveModalReg(r);
                          setInternalNoteInput(r.internalNotes || "");
                        }}
                        className="px-2.5 py-1 rounded-lg border border-border text-foreground hover:bg-surface-container transition-colors text-[11px] font-semibold"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Participant Details & Review Modal */}
      {activeModalReg && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-border max-w-xl w-full p-6 sm:p-8 shadow-xl flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-primary">
                  #{activeModalReg.referenceId}
                </span>
                <h2 className="text-xl font-bold text-foreground mt-0.5">
                  {activeModalReg.fullName}
                </h2>
                <p className="text-xs text-foreground-muted">{activeModalReg.email} · {activeModalReg.phone}</p>
              </div>

              <button
                onClick={() => setActiveModalReg(null)}
                className="p-1.5 rounded-xl border border-border text-foreground hover:bg-surface-container"
              >
                ✕
              </button>
            </div>

            {/* Academic & Track Profile */}
            <div className="p-4 rounded-2xl bg-surface-container-low border border-border/80 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-foreground-muted">College</span>
                <p className="font-semibold text-foreground">{activeModalReg.college}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-foreground-muted">Department</span>
                <p className="font-semibold text-foreground">{activeModalReg.department} ({activeModalReg.yearOfStudy})</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-foreground-muted">Selected Track</span>
                <p className="font-semibold text-foreground">{activeModalReg.track}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-foreground-muted">Experience Level</span>
                <p className="font-semibold text-foreground">{activeModalReg.experienceLevel}</p>
              </div>
            </div>

            {/* Internal Admin Notes */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-foreground">Internal Organizer Notes</label>
              <textarea
                rows={2}
                value={internalNoteInput}
                onChange={(e) => setInternalNoteInput(e.target.value)}
                placeholder="e.g. Approved fee waiver, seat allocated in Lab 402..."
                className="p-3 rounded-xl border border-border text-xs text-foreground bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <button
                onClick={() => handleUpdateStatus(activeModalReg.id, activeModalReg.status, internalNoteInput)}
                disabled={actionLoading}
                className="self-end px-3 py-1 rounded-lg bg-surface-container text-foreground text-xs font-semibold hover:bg-surface-container-high transition-colors"
              >
                Save Note
              </button>
            </div>

            {/* Payment Verification Action (if required) */}
            <div className="p-4 rounded-2xl border border-border flex flex-col gap-2">
              <span className="text-xs font-bold text-foreground">Payment Verification</span>
              <div className="flex items-center justify-between text-xs">
                <span>Status: <strong className="capitalize">{activeModalReg.paymentStatus || "not-required"}</strong></span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleUpdatePayment(activeModalReg.id, "verified")}
                    disabled={actionLoading}
                    className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition-colors"
                  >
                    Verify Payment
                  </button>
                  <button
                    onClick={() => handleUpdatePayment(activeModalReg.id, "rejected")}
                    disabled={actionLoading}
                    className="px-3 py-1 rounded-lg border border-red-200 text-status-error font-semibold text-xs hover:bg-red-50 transition-colors"
                  >
                    Reject Payment
                  </button>
                </div>
              </div>
            </div>

            {/* Status Change Buttons */}
            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              <span className="text-xs font-bold text-foreground">Update Application Status</span>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => handleUpdateStatus(activeModalReg.id, "confirmed", internalNoteInput)}
                  disabled={actionLoading}
                  className="py-2 px-3 rounded-xl bg-primary text-on-primary font-bold text-xs hover:bg-primary-hover transition-colors"
                >
                  Approve / Confirm
                </button>
                <button
                  onClick={() => handleUpdateStatus(activeModalReg.id, "waitlisted", internalNoteInput)}
                  disabled={actionLoading}
                  className="py-2 px-3 rounded-xl bg-surface-container text-foreground font-semibold text-xs hover:bg-surface-container-high transition-colors"
                >
                  Waitlist
                </button>
                <button
                  onClick={() => handleUpdateStatus(activeModalReg.id, "rejected", internalNoteInput)}
                  disabled={actionLoading}
                  className="py-2 px-3 rounded-xl border border-border text-status-error font-semibold text-xs hover:bg-red-50 transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleUpdateStatus(activeModalReg.id, "cancelled", internalNoteInput)}
                  disabled={actionLoading}
                  className="py-2 px-3 rounded-xl border border-border text-foreground-muted font-semibold text-xs hover:bg-surface-container transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

