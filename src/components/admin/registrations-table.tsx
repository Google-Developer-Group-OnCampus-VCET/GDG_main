"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import type { RegistrationRecord, RegistrationStatus } from "@/types";
import { downloadForGoogleSheets, copyForGoogleSheets, type ExportColumn } from "@/lib/sheets-export";

interface RegistrationsTableProps {
  initialRegistrations: RegistrationRecord[];
  eventSlug: string;
  role?: "admin" | "core" | "volunteer" | null;
}

export function RegistrationsTable({ initialRegistrations, eventSlug, role = null }: RegistrationsTableProps) {
  const [sessionRole, setSessionRole] = useState<"admin" | "core" | "volunteer" | null>(role);

  useEffect(() => {
    if (!role) {
      fetch("/api/admin/session")
        .then((res) => res.json())
        .then((data) => {
          if (data?.authenticated && data?.role) {
            setSessionRole(data.role);
          }
        })
        .catch(() => {});
    }
  }, [role]);

  const [registrations, setRegistrations] = useState<RegistrationRecord[]>(initialRegistrations);
  const [search, setSearch] = useState("");
  const [trackFilter, setTrackFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"confirmed" | "pending" | "waitlisted" | "removed" | "all">("confirmed");
  const [checkInFilter, setCheckInFilter] = useState("all");
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [emailingRef, setEmailingRef] = useState<string | null>(null);
  const [mutatingRef, setMutatingRef] = useState<string | null>(null);
  const [selectedRefs, setSelectedRefs] = useState<string[]>([]);
  const [bulkReviewing, setBulkReviewing] = useState(false);
  const [notifyOnDecision, setNotifyOnDecision] = useState(true);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  // Add Walk-in Attendee modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    college: "VCET",
    department: "Computer Engineering",
    yearOfStudy: "2nd Year (SE)",
    track: "4-Day All-Access",
    experienceLevel: "Beginner",
    notes: "",
  });
  const [addingSubmitting, setAddingSubmitting] = useState(false);

  // Edit Attendee modal state
  const [editingReg, setEditingReg] = useState<RegistrationRecord | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    college: "",
    department: "",
    yearOfStudy: "",
    track: "",
    status: "confirmed" as RegistrationStatus,
    notes: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  async function handleEmailPass(reg: RegistrationRecord) {
    setEmailingRef(reg.referenceId);
    try {
      const res = await fetch(`/api/events/${eventSlug}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send-pass", referenceId: reg.referenceId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionFeedback(`Official pass successfully emailed to ${reg.email}!`);
      } else {
        setActionFeedback(data.message || `Failed to email pass to ${reg.email}.`);
      }
    } catch {
      setActionFeedback("Network error emailing pass.");
    } finally {
      setEmailingRef(null);
      setTimeout(() => setActionFeedback(null), 3500);
    }
  }

  const totalConfirmed = registrations.filter((r) => !r.status || r.status === "confirmed").length;
  const totalPending = registrations.filter((r) => r.status === "pending").length;
  const totalWaitlisted = registrations.filter((r) => r.status === "waitlisted").length;
  const totalRemoved = registrations.filter(
    (r) => r.status === "cancelled" || r.status === "declined"
  ).length;
  const totalActive = totalConfirmed;

  const filtered = registrations.filter((r) => {
    const matchesSearch =
      search === "" ||
      r.fullName.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase()) ||
      r.referenceId.toLowerCase().includes(search.toLowerCase()) ||
      r.college.toLowerCase().includes(search.toLowerCase());

    const matchesTrack = trackFilter === "all" || (r.track || "General Admission") === trackFilter;

    let matchesStatus = true;
    if (statusFilter === "confirmed") {
      matchesStatus = !r.status || r.status === "confirmed";
    } else if (statusFilter === "pending") {
      matchesStatus = r.status === "pending";
    } else if (statusFilter === "waitlisted") {
      matchesStatus = r.status === "waitlisted";
    } else if (statusFilter === "removed") {
      matchesStatus = r.status === "cancelled" || r.status === "declined";
    }

    let matchesCheckIn = true;
    if (checkInFilter === "checked-in") {
      matchesCheckIn = Boolean(r.checkedIn || (r.checkedInDays && r.checkedInDays.length > 0));
    } else if (checkInFilter === "not-checked-in" || checkInFilter === "absent") {
      matchesCheckIn = !r.checkedIn && (!r.checkedInDays || r.checkedInDays.length === 0);
    } else if (checkInFilter.startsWith("day-")) {
      const dayNum = parseInt(checkInFilter.replace("day-", ""), 10);
      matchesCheckIn = Boolean(r.checkedInDays?.includes(dayNum) || (dayNum === 1 && r.checkedIn));
    } else if (checkInFilter === "all-days") {
      matchesCheckIn = Boolean(
        r.checkedInDays?.includes(1) &&
        r.checkedInDays?.includes(2) &&
        r.checkedInDays?.includes(3) &&
        r.checkedInDays?.includes(4)
      );
    }

    return matchesSearch && matchesTrack && matchesStatus && matchesCheckIn;
  });

  // Reset to page 1 whenever filters change
  const filteredKey = `${search}|${trackFilter}|${statusFilter}|${checkInFilter}`;
  const prevFilterKeyRef = useRef(filteredKey);
  if (prevFilterKeyRef.current !== filteredKey) {
    prevFilterKeyRef.current = filteredKey;
    if (page !== 1) setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const checkedInCount = registrations.filter(
    (r) => (!r.status || r.status === "confirmed") && (r.checkedIn || (r.checkedInDays && r.checkedInDays.length > 0))
  ).length;
  const fourDayCompleters = registrations.filter(
    (r) =>
      (!r.status || r.status === "confirmed") &&
      r.checkedInDays?.includes(1) &&
      r.checkedInDays?.includes(2) &&
      r.checkedInDays?.includes(3) &&
      r.checkedInDays?.includes(4)
  ).length;

  const availableTracks = Array.from(
    new Set(registrations.map((r) => r.track).filter(Boolean))
  );

  const exportColumns: ExportColumn<RegistrationRecord>[] = [
    { key: "referenceId", label: "Pass Reference ID" },
    { key: "fullName", label: "Full Name" },
    { key: "email", label: "Email Address" },
    { key: "phone", label: "Phone Number" },
    { key: "college", label: "College Name" },
    { key: "department", label: "Department" },
    { key: "yearOfStudy", label: "Year of Study" },
    { key: "track", label: "Track Selected" },
    { key: "experienceLevel", label: "Experience Level" },
    { key: "portfolioUrl", label: "Portfolio / GitHub" },
    { key: "status", label: "Registration Status" },
    {
      key: "checkedInDays",
      label: "Days Attended Count",
      format: (_, row) => String(row?.checkedInDays?.length ?? (row?.checkedIn ? 1 : 0)),
    },
    {
      key: "checkedInDays",
      label: "Attended Days List",
      format: (_, row) => (row?.checkedInDays?.length ? row.checkedInDays.join(", ") : row?.checkedIn ? "1" : "None"),
    },
    {
      key: "checkIns",
      label: "Day 1 Timestamp",
      format: (_, row) => row?.checkIns?.[1] || (row?.checkedIn ? row.checkedInAt : "") || "—",
    },
    {
      key: "checkIns",
      label: "Day 2 Timestamp",
      format: (_, row) => row?.checkIns?.[2] || "—",
    },
    {
      key: "checkIns",
      label: "Day 3 Timestamp",
      format: (_, row) => row?.checkIns?.[3] || "—",
    },
    {
      key: "checkIns",
      label: "Day 4 Timestamp",
      format: (_, row) => row?.checkIns?.[4] || "—",
    },
    {
      key: "checkedInDays",
      label: "Certification Eligible (>=3 Days)",
      format: (_, row) => ((row?.checkedInDays?.length ?? (row?.checkedIn ? 1 : 0)) >= 3 ? "YES" : "NO"),
    },
    { key: "createdAt", label: "Registered At" },
  ];

  function handleDownloadSheets() {
    downloadForGoogleSheets(
      `gdg_vcet_${eventSlug}_registrations_${new Date().toISOString().slice(0, 10)}`,
      filtered,
      exportColumns
    );
  }

  async function handleCopySheets() {
    const ok = await copyForGoogleSheets(filtered, exportColumns);
    if (ok) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    }
  }

  async function handleToggleCheckIn(reg: RegistrationRecord, day?: number) {
    const existingDays = reg.checkedInDays || (reg.checkedIn ? [1] : []);
    const targetDay = day ?? ([1, 2, 3, 4].find((d) => !existingDays.includes(d)) || 1);

    if (existingDays.includes(targetDay)) {
      setActionFeedback(`${reg.fullName} is already checked in for Day ${targetDay}.`);
      setTimeout(() => setActionFeedback(null), 3000);
      return;
    }

    try {
      const res = await fetch(`/api/events/${eventSlug}/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referenceId: reg.referenceId, day: targetDay }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const updatedDays = Array.from(new Set([...existingDays, targetDay])).sort((a, b) => a - b);
        const updatedCheckIns = {
          ...(reg.checkIns || {}),
          [targetDay]: data.registration?.checkIns?.[targetDay] || new Date().toLocaleString(),
        };

        setRegistrations((prev) =>
          prev.map((item) =>
            item.referenceId === reg.referenceId
              ? data.registration || {
                  ...item,
                  checkedIn: true,
                  checkedInAt: data.registration?.checkedInAt || item.checkedInAt,
                  checkedInDays: updatedDays,
                  checkIns: updatedCheckIns,
                }
              : item
          )
        );
        setActionFeedback(`Checked in ${reg.fullName} for Day ${targetDay}! (${updatedDays.length}/4 days)`);
        setTimeout(() => setActionFeedback(null), 3500);
      } else {
        setActionFeedback(data.message || `Failed to check in attendee for Day ${targetDay}.`);
        setTimeout(() => setActionFeedback(null), 3500);
      }
    } catch {
      setActionFeedback("Error processing check-in.");
      setTimeout(() => setActionFeedback(null), 3500);
    }
  }

  async function handleRevokeCheckIn(reg: RegistrationRecord, day: number) {
    if (sessionRole !== "admin") return;
    setMutatingRef(reg.referenceId);
    try {
      const res = await fetch(
        `/api/events/${eventSlug}/registrations/${encodeURIComponent(reg.referenceId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ undoCheckInDay: day }),
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setRegistrations((prev) =>
          prev.map((item) =>
            item.referenceId === reg.referenceId ? data.registration || item : item
          )
        );
        setActionFeedback(`Revoked Day ${day} check-in for ${reg.fullName}.`);
      } else {
        setActionFeedback(data.message || `Failed to undo Day ${day} check-in.`);
      }
    } catch {
      setActionFeedback("Error revoking check-in.");
    } finally {
      setMutatingRef(null);
      setTimeout(() => setActionFeedback(null), 3500);
    }
  }

  function openEditModal(reg: RegistrationRecord) {
    setEditingReg(reg);
    setEditForm({
      fullName: reg.fullName,
      email: reg.email,
      phone: reg.phone,
      college: reg.college,
      department: reg.department,
      yearOfStudy: reg.yearOfStudy,
      track: reg.track || "",
      status: reg.status,
      notes: reg.notes || "",
    });
  }

  async function handleSaveAttendeeEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingReg || sessionRole !== "admin") return;
    setSavingEdit(true);
    try {
      const res = await fetch(
        `/api/events/${eventSlug}/registrations/${encodeURIComponent(editingReg.referenceId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editForm),
        }
      );
      const data = await res.json();
      if (res.ok && data.success && data.registration) {
        setRegistrations((prev) =>
          prev.map((item) =>
            item.referenceId === editingReg.referenceId ? data.registration : item
          )
        );
        setEditingReg(null);
        setActionFeedback(`Updated attendee details for ${data.registration.fullName}.`);
      } else {
        setActionFeedback(data.message || "Failed to update attendee.");
      }
    } catch {
      setActionFeedback("Error updating attendee.");
    } finally {
      setSavingEdit(false);
      setTimeout(() => setActionFeedback(null), 3500);
    }
  }

  async function handleAddAttendee(e: React.FormEvent) {
    e.preventDefault();
    if (sessionRole !== "admin") return;
    setAddingSubmitting(true);
    try {
      const res = await fetch(`/api/events/${eventSlug}/registrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (res.ok && data.success && data.registration) {
        setRegistrations((prev) => [data.registration, ...prev]);
        setShowAddModal(false);
        setAddForm({
          fullName: "",
          email: "",
          phone: "",
          college: "VCET",
          department: "Computer Engineering",
          yearOfStudy: "2nd Year (SE)",
          track: "4-Day All-Access",
          experienceLevel: "Beginner",
          notes: "",
        });
        setActionFeedback(`Added ${data.registration.fullName} (${data.registration.referenceId})!`);
      } else {
        setActionFeedback(data.message || "Failed to add attendee.");
      }
    } catch {
      setActionFeedback("Error adding walk-in attendee.");
    } finally {
      setAddingSubmitting(false);
      setTimeout(() => setActionFeedback(null), 3500);
    }
  }

  async function handleReviewDecision(
    reg: RegistrationRecord,
    decision: "approve" | "decline" | "waitlist"
  ) {
    if (sessionRole !== "admin") return;
    setMutatingRef(reg.referenceId);
    try {
      const res = await fetch(
        `/api/events/${eventSlug}/registrations/${encodeURIComponent(reg.referenceId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decision,
            notify: decision === "approve" ? true : notifyOnDecision,
          }),
        }
      );
      const data = await res.json();
      if (res.ok && data.success && data.registration) {
        setRegistrations((prev) =>
          prev.map((item) =>
            item.referenceId === reg.referenceId ? data.registration : item
          )
        );
        setSelectedRefs((prev) => prev.filter((id) => id !== reg.referenceId));
        setActionFeedback(data.message || `Updated ${reg.fullName}.`);
      } else {
        setActionFeedback(data.message || "Failed to update approval status.");
      }
    } catch {
      setActionFeedback("Error processing host decision.");
    } finally {
      setMutatingRef(null);
      setTimeout(() => setActionFeedback(null), 4000);
    }
  }

  async function handleBulkReview(decision: "approve" | "decline" | "waitlist") {
    if (sessionRole !== "admin" || selectedRefs.length === 0) return;
    setBulkReviewing(true);
    try {
      const res = await fetch(`/api/events/${eventSlug}/registrations`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referenceIds: selectedRefs,
          decision,
          notify: decision === "approve" ? true : notifyOnDecision,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.registrations)) {
        const updatedMap = new Map<string, RegistrationRecord>(
          (data.registrations as RegistrationRecord[]).map((r) => [r.referenceId, r])
        );
        setRegistrations((prev) =>
          prev.map((item) => updatedMap.get(item.referenceId) ?? item)
        );
        setSelectedRefs([]);
        setActionFeedback(data.message || "Bulk review complete.");
      } else {
        setActionFeedback(data.message || "Bulk review failed.");
      }
    } catch {
      setActionFeedback("Error processing bulk review.");
    } finally {
      setBulkReviewing(false);
      setTimeout(() => setActionFeedback(null), 4500);
    }
  }

  function toggleSelectRef(referenceId: string) {
    setSelectedRefs((prev) =>
      prev.includes(referenceId)
        ? prev.filter((id) => id !== referenceId)
        : [...prev, referenceId]
    );
  }

  async function handleCancelOrDelete(
    reg: RegistrationRecord,
    action: "cancel" | "restore" | "hard"
  ) {
    if (sessionRole !== "admin") return;
    setMutatingRef(reg.referenceId);
    try {
      if (action === "restore") {
        const res = await fetch(
          `/api/events/${eventSlug}/registrations/${encodeURIComponent(reg.referenceId)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "confirmed" }),
          }
        );
        const data = await res.json();
        if (res.ok && data.success && data.registration) {
          setRegistrations((prev) =>
            prev.map((item) =>
              item.referenceId === reg.referenceId ? data.registration : item
            )
          );
          setActionFeedback(`Restored pass for ${reg.fullName}.`);
        } else {
          setActionFeedback(data.message || "Failed to restore pass.");
        }
      } else {
        const res = await fetch(
          `/api/events/${eventSlug}/registrations/${encodeURIComponent(reg.referenceId)}?mode=${action}`,
          { method: "DELETE" }
        );
        const data = await res.json();
        if (res.ok && data.success) {
          if (action === "hard") {
            setRegistrations((prev) =>
              prev.filter((item) => item.referenceId !== reg.referenceId)
            );
            setActionFeedback(`Permanently deleted pass ${reg.referenceId}.`);
          } else {
            setRegistrations((prev) =>
              prev.map((item) =>
                item.referenceId === reg.referenceId
                  ? { ...item, status: "cancelled" }
                  : item
              )
            );
            setActionFeedback(`Cancelled pass for ${reg.fullName}.`);
          }
        } else {
          setActionFeedback(data.message || "Failed to remove pass.");
        }
      }
    } catch {
      setActionFeedback("Error updating registration status.");
    } finally {
      setMutatingRef(null);
      setTimeout(() => setActionFeedback(null), 3500);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toast Feedback */}
      {actionFeedback ? (
        <div className="p-3.5 rounded-xl bg-blue-50 text-blue-900 text-xs font-semibold flex items-center justify-between border border-blue-200 shadow-xs">
          <span>{actionFeedback}</span>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="text-blue-500 hover:text-blue-700"
          >
            ✕
          </button>
        </div>
      ) : null}

      {/* Luma-style Queue & Status Tabs + Pending Banner */}
      {totalPending > 0 && statusFilter !== "pending" ? (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <span>
              <strong>{totalPending}</strong> registration request{totalPending === 1 ? "" : "s"} waiting in the{" "}
              <strong>Approval Queue</strong>.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setStatusFilter("pending")}
            className="px-3 py-1.5 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 transition-colors cursor-pointer"
          >
            Review Pending Queue →
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "confirmed" as const, label: `Confirmed (${totalConfirmed})` },
            { id: "pending" as const, label: `Pending Approval (${totalPending})`, highlight: totalPending > 0 },
            { id: "waitlisted" as const, label: `Waitlisted (${totalWaitlisted})` },
            { id: "removed" as const, label: `Declined / Cancelled (${totalRemoved})` },
            { id: "all" as const, label: `All (${registrations.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setStatusFilter(tab.id);
                setSelectedRefs([]);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                statusFilter === tab.id
                  ? "bg-primary text-on-primary border-primary shadow-2xs"
                  : tab.highlight
                    ? "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100"
                    : "bg-white text-foreground-muted border-border hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {sessionRole === "admin" && (statusFilter === "pending" || statusFilter === "waitlisted") ? (
          <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyOnDecision}
              onChange={(e) => setNotifyOnDecision(e.target.checked)}
              className="w-3.5 h-3.5 rounded"
            />
            <span>Email waitlist/decline updates (passes always email on approval)</span>
          </label>
        ) : null}
      </div>

      {/* Bulk Review Bar */}
      {sessionRole === "admin" && selectedRefs.length > 0 ? (
        <div className="p-3 rounded-2xl bg-slate-900 text-white text-xs flex flex-wrap items-center justify-between gap-3">
          <span className="font-semibold">
            {selectedRefs.length} applicant{selectedRefs.length === 1 ? "" : "s"} selected
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={bulkReviewing}
              onClick={() => handleBulkReview("approve")}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer disabled:opacity-50"
            >
              ✓ Approve Selected ({selectedRefs.length})
            </button>
            <button
              type="button"
              disabled={bulkReviewing}
              onClick={() => handleBulkReview("waitlist")}
              className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold cursor-pointer disabled:opacity-50"
            >
              Move to Waitlist
            </button>
            <button
              type="button"
              disabled={bulkReviewing}
              onClick={() => handleBulkReview("decline")}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer disabled:opacity-50"
            >
              ✕ Decline
            </button>
            <button
              type="button"
              onClick={() => setSelectedRefs([])}
              className="px-2.5 py-1.5 rounded-xl text-slate-300 hover:text-white cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      ) : null}

      {/* Simplified Filter & Export Toolbar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-border shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, pass ID, college..."
            className="w-full h-11 pl-9 pr-3 rounded-xl border border-border bg-slate-50/50 text-base sm:text-xs text-foreground placeholder:text-foreground-muted/60 focus:bg-white focus:border-primary focus:outline-hidden transition-all"
          />
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>

        {/* Filter Controls & Universal Export to Sheets */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2">
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
            {availableTracks.length > 1 ? (
              <select
                value={trackFilter}
                onChange={(e) => setTrackFilter(e.target.value)}
                className="h-11 px-3 rounded-xl border border-border bg-slate-50/50 text-base sm:text-xs text-foreground focus:bg-white focus:outline-hidden"
              >
                <option value="all">All Tracks</option>
                {availableTracks.map((trk) => (
                  <option key={trk} value={trk}>
                    {trk}
                  </option>
                ))}
              </select>
            ) : null}

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "confirmed" | "pending" | "waitlisted" | "removed" | "all")}
              className="h-11 px-3 rounded-xl border border-border bg-slate-50/50 text-base sm:text-xs text-foreground focus:bg-white focus:outline-hidden"
            >
              <option value="confirmed">Confirmed ({totalConfirmed})</option>
              <option value="pending">Pending Approval ({totalPending})</option>
              <option value="waitlisted">Waitlisted ({totalWaitlisted})</option>
              <option value="removed">Declined / Cancelled ({totalRemoved})</option>
              <option value="all">All Guests ({registrations.length})</option>
            </select>

            <select
              value={checkInFilter}
              onChange={(e) => setCheckInFilter(e.target.value)}
              className="h-11 px-3 rounded-xl border border-border bg-slate-50/50 text-base sm:text-xs text-foreground focus:bg-white focus:outline-hidden"
            >
              <option value="all">All Attendance</option>
              <option value="checked-in">Any Day Present</option>
              <option value="day-1">Day 1 Present (Dec 1)</option>
              <option value="day-2">Day 2 Present (Dec 2)</option>
              <option value="day-3">Day 3 Present (Dec 3)</option>
              <option value="day-4">Day 4 Present (Dec 4)</option>
              <option value="all-days">All 4 Days (100% Attendance)</option>
              <option value="not-checked-in">Absent (0 Days)</option>
            </select>
          </div>

          {/* Export to Google Sheets Actions */}
          <div className="inline-flex rounded-xl border border-emerald-300 bg-emerald-50/70 p-0.5 shrink-0 justify-between sm:justify-start">
            <button
              type="button"
              onClick={handleDownloadSheets}
              title="Download UTF-8 CSV formatted for Google Sheets & Excel"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-emerald-800 hover:bg-emerald-100 text-xs font-semibold transition-all cursor-pointer flex-1 sm:flex-initial justify-center"
            >
              <svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Export to Sheets</span>
            </button>

            <button
              type="button"
              onClick={handleCopySheets}
              title="Copy table to clipboard for instant paste (Ctrl+V) into any open Google Spreadsheet"
              className="inline-flex items-center px-2.5 py-2 rounded-lg text-emerald-700 hover:bg-emerald-100 text-xs font-medium border-l border-emerald-200 transition-all cursor-pointer"
            >
              {copySuccess ? (
                <span className="font-bold text-emerald-800">Copied!</span>
              ) : (
                <span>Copy TSV</span>
              )}
            </button>
          </div>

          {/* Quick Check-in Terminal Shortcut */}
          <Link
            href={`/admin/console/events/${eventSlug}/check-in`}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold transition-all shadow-2xs shrink-0"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span>Camera Check-in Terminal</span>
          </Link>

          {/* Add Attendee + Email Hub: ONLY for Master Admin */}
          {sessionRole === "admin" ? (
            <>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition-all shrink-0 cursor-pointer"
              >
                <span>+ Add Attendee</span>
              </button>
              <Link
                href={`/admin/console/events/${eventSlug}/email`}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 text-xs font-bold transition-all shrink-0"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <span>Email Hub &amp; Broadcast</span>
              </Link>
            </>
          ) : null}
        </div>
      </div>

      {/* Metrics Counter Strip */}
      <div className="flex flex-wrap items-center justify-between text-xs text-foreground-muted px-1 gap-2">
        <span>
          Showing <strong className="text-foreground">{paginated.length}</strong>
          {filtered.length > PAGE_SIZE && (
            <> of <strong className="text-foreground">{filtered.length}</strong></>
          )}{" "}in{" "}
          <strong className="text-foreground">{statusFilter}</strong> view
          <span className="text-foreground-muted ml-1.5 font-normal">
            ({totalActive} confirmed{totalPending > 0 ? ` · ${totalPending} pending` : ""}{totalWaitlisted > 0 ? ` · ${totalWaitlisted} waitlisted` : ""}{totalRemoved > 0 ? ` · ${totalRemoved} closed` : ""})
          </span>
        </span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block animate-pulse"></span>
            <span>{checkedInCount} Checked In ({Math.round((checkedInCount / (totalActive || 1)) * 100)}%)</span>
          </span>
          <span className="hidden sm:inline text-border">•</span>
          <span className="font-semibold text-primary">
            {fourDayCompleters} Completed All 4 Days
          </span>
        </div>
      </div>

      {/* High-Density Data Display (Cards on Mobile, Table on Desktop) */}
      <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
        {/* Mobile Attendee Card View */}
        <div className="md:hidden divide-y divide-border/60">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs">
              No attendees match the active filters.
            </div>
          ) : (
            paginated.map((reg) => {
              const attendedDays = reg.checkedInDays || (reg.checkedIn ? [1] : []);
              const nextMissingDay = [1, 2, 3, 4].find((d) => !attendedDays.includes(d));

              return (
                <div key={reg.id} className="p-3.5 flex flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900 text-sm">{reg.fullName}</span>
                      <span className="text-xs text-slate-500 font-mono">{reg.email}</span>
                    </div>
                    <span className="font-mono font-bold text-xs text-slate-800 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                      #{reg.referenceId}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{reg.department} · {reg.yearOfStudy}</span>
                    <span>•</span>
                    <span className="truncate max-w-[200px]">{reg.college}</span>
                  </div>

                  {/* 4-Day Attendance Pills */}
                  <div className="flex items-center justify-between pt-1 border-t border-border/50">
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4].map((d) => {
                        const isAttended = attendedDays.includes(d);
                        const time = reg.checkIns?.[d] || (d === 1 && reg.checkedIn ? reg.checkedInAt : undefined);
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => {
                              if (sessionRole === "core") return;
                              if (isAttended && sessionRole === "admin") {
                                void handleRevokeCheckIn(reg, d);
                              } else if (!isAttended) {
                                void handleToggleCheckIn(reg, d);
                              }
                            }}
                            title={
                              isAttended
                                ? sessionRole === "admin"
                                  ? `Day ${d}: ${time || "Present"} (Click to undo)`
                                  : `Day ${d}: ${time || "Present"}`
                                : sessionRole === "core"
                                  ? `Day ${d}: Absent`
                                  : `Check in for Day ${d}`
                            }
                            className={`px-2 py-1 rounded-md text-[11px] font-bold border transition-all ${
                              isAttended
                                ? `bg-emerald-50 text-emerald-800 border-emerald-200 ${sessionRole === "admin" ? "hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 cursor-pointer" : ""}`
                                : sessionRole === "core"
                                ? "bg-slate-50 text-slate-300 border-slate-200 cursor-default"
                                : "bg-slate-50 text-slate-400 border-slate-200 hover:border-emerald-500 hover:text-emerald-700 cursor-pointer"
                            }`}
                          >
                            D{d} {isAttended ? "✓" : sessionRole === "core" ? "—" : "+"}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {sessionRole === "admin" && reg.status !== "confirmed" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleReviewDecision(reg, "approve")}
                            disabled={mutatingRef === reg.referenceId}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer disabled:opacity-50 min-h-[36px]"
                          >
                            ✓ Approve
                          </button>
                          {reg.status !== "declined" ? (
                            <button
                              type="button"
                              onClick={() => handleReviewDecision(reg, "decline")}
                              disabled={mutatingRef === reg.referenceId}
                              className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100 cursor-pointer disabled:opacity-50 min-h-[36px]"
                            >
                              Decline
                            </button>
                          ) : null}
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleEmailPass(reg)}
                            disabled={emailingRef === reg.referenceId}
                            title={`Email pass & QR code to ${reg.email}`}
                            className="px-2.5 py-1.5 rounded-lg border border-border text-foreground-muted hover:text-primary hover:border-primary text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1 min-h-[36px]"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                              <polyline points="22,6 12,13 2,6" />
                            </svg>
                            <span>{emailingRef === reg.referenceId ? "Sending…" : "Email Pass"}</span>
                          </button>

                          {nextMissingDay ? (
                            <button
                              type="button"
                              onClick={() => handleToggleCheckIn(reg, nextMissingDay)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer min-h-[36px]"
                            >
                              Admit D{nextMissingDay}
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-200">
                              <svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              <span>4/4 Days</span>
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Data Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-slate-50 text-slate-600 font-bold text-[11px] uppercase tracking-wider">
              <tr>
                {sessionRole === "admin" ? (
                  <th className="py-2.5 pl-3.5 pr-1 w-8">
                    <input
                      type="checkbox"
                      aria-label="Select all visible registrations"
                      checked={filtered.length > 0 && filtered.every((r) => selectedRefs.includes(r.referenceId))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRefs(filtered.map((r) => r.referenceId));
                        } else {
                          setSelectedRefs([]);
                        }
                      }}
                      className="w-3.5 h-3.5 rounded"
                    />
                  </th>
                ) : null}
                <th className="py-2.5 px-3.5">Ref ID</th>
                <th className="py-2.5 px-3.5">Attendee</th>
                <th className="py-2.5 px-3.5">Academic</th>
                <th className="py-2.5 px-3.5">Track</th>
                <th className="py-2.5 px-3.5 text-center">Status</th>
                <th className="py-2.5 px-3.5 text-center">4-Day Attendance</th>
                <th className="py-2.5 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={sessionRole === "admin" ? 8 : 7} className="py-10 text-center text-slate-400">
                    No attendees match the active filters.
                  </td>
                </tr>
              ) : (
                paginated.map((reg) => {
                  const attendedDays = reg.checkedInDays || (reg.checkedIn ? [1] : []);
                  const nextMissingDay = [1, 2, 3, 4].find((d) => !attendedDays.includes(d));

                  return (
                    <tr key={reg.id} className="hover:bg-slate-50/70 transition-colors">
                      {sessionRole === "admin" ? (
                        <td className="py-2.5 pl-3.5 pr-1">
                          <input
                            type="checkbox"
                            aria-label={`Select ${reg.fullName}`}
                            checked={selectedRefs.includes(reg.referenceId)}
                            onChange={() => toggleSelectRef(reg.referenceId)}
                            className="w-3.5 h-3.5 rounded"
                          />
                        </td>
                      ) : null}
                      <td className="py-2.5 px-3.5 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {reg.referenceId}
                      </td>

                      <td className="py-2.5 px-3.5">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">{reg.fullName}</span>
                          <span className="text-[11px] text-slate-500 font-mono">{reg.email}</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3.5 max-w-xs">
                        <div className="flex flex-col truncate">
                          <span className="font-medium text-slate-800 text-[11px] truncate">{reg.college}</span>
                          <span className="text-[11px] text-slate-500">{reg.department} · {reg.yearOfStudy}</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-semibold border border-blue-100 inline-block">
                          {(reg.track || "").includes("Track A")
                            ? "Track A (Web/AI)"
                            : (reg.track || "").includes("Track B")
                              ? "Track B (Cloud/GCP)"
                              : reg.track || "General Admission"}
                        </span>
                      </td>

                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            reg.status === "pending"
                              ? "bg-amber-100 text-amber-900"
                              : reg.status === "waitlisted"
                                ? "bg-sky-100 text-sky-800"
                                : reg.status === "declined" || reg.status === "cancelled"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {reg.status}
                        </span>
                      </td>

                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {[1, 2, 3, 4].map((d) => {
                            const isAttended = attendedDays.includes(d);
                            const time = reg.checkIns?.[d] || (d === 1 && reg.checkedIn ? reg.checkedInAt : undefined);
                            return (
                              <button
                                key={d}
                                type="button"
                                onClick={() => {
                                  if (sessionRole === "core") return;
                                  if (isAttended && sessionRole === "admin") {
                                    void handleRevokeCheckIn(reg, d);
                                  } else if (!isAttended) {
                                    void handleToggleCheckIn(reg, d);
                                  }
                                }}
                                title={
                                  isAttended
                                    ? sessionRole === "admin"
                                      ? `Day ${d}: ${time || "Present"} (Click to undo)`
                                      : `Day ${d}: ${time || "Present"}`
                                    : sessionRole === "core"
                                      ? `Day ${d}: Absent`
                                      : `Click to Check In Day ${d}`
                                }
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-all ${
                                  isAttended
                                    ? `bg-emerald-50 text-emerald-800 border-emerald-200 ${sessionRole === "admin" ? "hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 cursor-pointer" : ""}`
                                    : sessionRole === "core"
                                    ? "bg-slate-50 text-slate-300 border-slate-200 cursor-default"
                                    : "bg-slate-50 text-slate-400 border-slate-200 hover:border-emerald-500 hover:text-emerald-700 cursor-pointer"
                                }`}
                              >
                                D{d} {isAttended ? "✓" : sessionRole === "core" ? "—" : "+"}
                              </button>
                            );
                          })}
                          <span className="text-[10px] text-foreground-muted ml-1 font-mono">
                            ({attendedDays.length}/4)
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {reg.status === "confirmed" ? (
                            <button
                              type="button"
                              onClick={() => handleEmailPass(reg)}
                              disabled={emailingRef === reg.referenceId}
                              title={`Email pass & QR code to ${reg.email}`}
                              className="p-1.5 rounded-lg border border-border bg-slate-50/50 text-foreground-muted hover:text-primary hover:border-primary transition-all cursor-pointer disabled:opacity-50"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                <polyline points="22,6 12,13 2,6" />
                              </svg>
                            </button>
                          ) : null}
                          {sessionRole === "admin" ? (
                            <>
                              {reg.status !== "confirmed" ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleReviewDecision(reg, "approve")}
                                    disabled={mutatingRef === reg.referenceId}
                                    title="Approve & email official QR pass"
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] font-bold cursor-pointer disabled:opacity-50"
                                  >
                                    ✓ Approve
                                  </button>
                                  {reg.status !== "waitlisted" ? (
                                    <button
                                      type="button"
                                      onClick={() => handleReviewDecision(reg, "waitlist")}
                                      disabled={mutatingRef === reg.referenceId}
                                      className="px-2 py-1 rounded-lg border border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100 text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                                    >
                                      Waitlist
                                    </button>
                                  ) : null}
                                  {reg.status !== "declined" ? (
                                    <button
                                      type="button"
                                      onClick={() => handleReviewDecision(reg, "decline")}
                                      disabled={mutatingRef === reg.referenceId}
                                      className="px-2 py-1 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                                    >
                                      Decline
                                    </button>
                                  ) : null}
                                </>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => openEditModal(reg)}
                                disabled={mutatingRef === reg.referenceId}
                                title={`Edit attendee ${reg.fullName}`}
                                className="px-2 py-1 rounded-lg border border-border bg-white text-slate-600 hover:text-primary hover:border-primary text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                              >
                                Edit
                              </button>
                              {reg.status === "confirmed" ? (
                                <button
                                  type="button"
                                  onClick={() => handleCancelOrDelete(reg, "cancel")}
                                  disabled={mutatingRef === reg.referenceId}
                                  title="Cancel pass"
                                  className="px-2 py-1 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-[11px] font-semibold hover:bg-amber-100 cursor-pointer disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Permanently delete ${reg.fullName} (${reg.referenceId})?`)) {
                                    void handleCancelOrDelete(reg, "hard");
                                  }
                                }}
                                disabled={mutatingRef === reg.referenceId}
                                title="Delete pass permanently"
                                className="px-2 py-1 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-[11px] font-semibold hover:bg-rose-100 cursor-pointer disabled:opacity-50"
                              >
                                Del
                              </button>
                            </>
                          ) : null}
                          {sessionRole === "core" ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold text-slate-400 bg-slate-100">
                              Read-Only
                            </span>
                          ) : reg.status === "confirmed" ? (
                            nextMissingDay ? (
                              <button
                                type="button"
                                onClick={() => handleToggleCheckIn(reg, nextMissingDay)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
                              >
                                Admit Day {nextMissingDay}
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                ✓ All 4 Days
                              </span>
                            )
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 px-1 mt-1">
          <span className="text-xs text-foreground-muted">
            Page <strong className="text-foreground">{page}</strong> of{" "}
            <strong className="text-foreground">{totalPages}</strong>
            {" "}·{" "}
            {filtered.length} total
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="px-2.5 py-1.5 rounded-xl border border-border text-xs font-medium text-foreground-muted hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              «
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-xl border border-border text-xs font-medium text-foreground-muted hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              ← Prev
            </button>
            {/* Page number pills — show up to 5 around current */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                item === "…" ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-xs text-foreground-muted">…</span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPage(item as number)}
                    className={`w-8 h-8 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      page === item
                        ? "bg-primary text-on-primary shadow-xs"
                        : "border border-border text-foreground-muted hover:bg-surface-container"
                    }`}
                  >
                    {item}
                  </button>
                )
              )}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-xl border border-border text-xs font-medium text-foreground-muted hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              Next →
            </button>
            <button
              type="button"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              className="px-2.5 py-1.5 rounded-xl border border-border text-xs font-medium text-foreground-muted hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              »
            </button>
          </div>
        </div>
      )}

      {/* Walk-in Attendee Add Modal */}
      {showAddModal ? (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-border shadow-xl max-w-lg w-full p-5 sm:p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">Add Walk-in / Manual Attendee</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                ✕
              </button>
            </div>
            <form onSubmit={handleAddAttendee} className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input required type="text" placeholder="Full Name *" value={addForm.fullName} onChange={(e) => setAddForm({ ...addForm, fullName: e.target.value })} className="h-10 px-3 rounded-xl border border-slate-300 text-xs" />
                <input required type="email" placeholder="Email *" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} className="h-10 px-3 rounded-xl border border-slate-300 text-xs" />
                <input type="text" placeholder="Phone" value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} className="h-10 px-3 rounded-xl border border-slate-300 text-xs" />
                <input type="text" placeholder="College" value={addForm.college} onChange={(e) => setAddForm({ ...addForm, college: e.target.value })} className="h-10 px-3 rounded-xl border border-slate-300 text-xs" />
                <input type="text" placeholder="Department" value={addForm.department} onChange={(e) => setAddForm({ ...addForm, department: e.target.value })} className="h-10 px-3 rounded-xl border border-slate-300 text-xs" />
                <input type="text" placeholder="Year of Study" value={addForm.yearOfStudy} onChange={(e) => setAddForm({ ...addForm, yearOfStudy: e.target.value })} className="h-10 px-3 rounded-xl border border-slate-300 text-xs" />
              </div>
              <input type="text" placeholder="Track (e.g. 4-Day All-Access)" value={addForm.track} onChange={(e) => setAddForm({ ...addForm, track: e.target.value })} className="h-10 px-3 rounded-xl border border-slate-300 text-xs" />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-xl border border-border text-xs font-semibold cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={addingSubmitting} className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold cursor-pointer disabled:opacity-60">
                  {addingSubmitting ? "Adding..." : "Add Attendee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Edit Attendee Modal */}
      {editingReg ? (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-border shadow-xl max-w-lg w-full p-5 sm:p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">
                Edit Attendee · {editingReg.referenceId}
              </h3>
              <button type="button" onClick={() => setEditingReg(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveAttendeeEdit} className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input required type="text" placeholder="Full Name" value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} className="h-10 px-3 rounded-xl border border-slate-300 text-xs" />
                <input required type="email" placeholder="Email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="h-10 px-3 rounded-xl border border-slate-300 text-xs" />
                <input type="text" placeholder="Phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="h-10 px-3 rounded-xl border border-slate-300 text-xs" />
                <input type="text" placeholder="College" value={editForm.college} onChange={(e) => setEditForm({ ...editForm, college: e.target.value })} className="h-10 px-3 rounded-xl border border-slate-300 text-xs" />
                <input type="text" placeholder="Department" value={editForm.department} onChange={(e) => setEditForm({ ...editForm, department: e.target.value })} className="h-10 px-3 rounded-xl border border-slate-300 text-xs" />
                <input type="text" placeholder="Year of Study" value={editForm.yearOfStudy} onChange={(e) => setEditForm({ ...editForm, yearOfStudy: e.target.value })} className="h-10 px-3 rounded-xl border border-slate-300 text-xs" />
                <input type="text" placeholder="Track" value={editForm.track} onChange={(e) => setEditForm({ ...editForm, track: e.target.value })} className="h-10 px-3 rounded-xl border border-slate-300 text-xs" />
                <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as RegistrationStatus })} className="h-10 px-3 rounded-xl border border-slate-300 text-xs bg-white">
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending Approval</option>
                  <option value="waitlisted">Waitlisted</option>
                  <option value="declined">Declined</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <textarea rows={2} placeholder="Admin Notes" value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} className="p-3 rounded-xl border border-slate-300 text-xs" />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingReg(null)} className="px-4 py-2 rounded-xl border border-border text-xs font-semibold cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={savingEdit} className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold cursor-pointer disabled:opacity-60">
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
