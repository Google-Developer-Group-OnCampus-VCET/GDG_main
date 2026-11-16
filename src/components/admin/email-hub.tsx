"use client";

import { useState } from "react";
import type { RegistrationRecord, EmailLog } from "@/types";

interface EmailHubProps {
  eventSlug: string;
  eventTitle: string;
  registrations: RegistrationRecord[];
  initialLogs: EmailLog[];
}

const EMAIL_TEMPLATES = [
  {
    name: "Pre-Event Prerequisites & Schedule",
    subject: "Zero to Hero: Dev to Cloud · Getting Ready for Day 1",
    message: `Dear Attendees,

We are excited to welcome you to Zero to Hero: Dev to Cloud starting this Tuesday, December 1, 2026!

Here is what you need to prepare:
1. Laptop & Charger (Linux, macOS, or Windows WSL2 recommended).
2. Git & Node.js 20+ installed on your system.
3. A free Google Cloud / Firebase account.
4. Your College ID Card for campus gate access.

Venue: VCET Seminar Hall & Computer Labs (4th Floor)
Reporting Time: 09:45 AM IST (Check-in starts promptly at 10:00 AM)

Your scannable entry pass is linked below. Please have it ready on your phone upon arrival.

Looking forward to building with you!
— GDG on Campus VCET Team`,
    ctaText: "View Workshop Agenda & Lab Guide",
    ctaUrl: "https://gdg-vcet.edu.in/events/dev-to-cloud/agenda",
  },
  {
    name: "Day 1 Morning Check-in Reminder",
    subject: "Day 1 Today: Web Architecture & Core Build · Dev to Cloud",
    message: `Good morning!

Day 1 of Dev to Cloud begins today at 10:00 AM in the VCET Seminar Hall.

Today's Schedule:
• 10:00 AM: Concept Primer: Anatomy of Modern Web Applications
• 10:45 AM: Guided Build: Workspace Setup & Core Screens
• 12:15 PM: Hands-on Lab: Database CRUD & AI Documents Table
• 01:30 PM: Git Checkpoint & Day 2 Preview (until 2:00 PM)

Have your digital pass QR code open for quick admission at the registration desk.

See you inside!
— GDG on Campus VCET Organizing Team`,
    ctaText: "Open Check-in Pass",
    ctaUrl: "https://gdg-vcet.edu.in/events/dev-to-cloud/register",
  },
  {
    name: "Day 2 AI & Vector Store Setup",
    subject: "Day 2 Tomorrow: Tool-Calling Agents & Vector Databases",
    message: `Great work on Day 1! Tomorrow we dive into Generative AI, Grounded RAG, and Autonomous Agents.

Before tomorrow's session:
• Ensure your Day 1 Git branch is pushed to GitHub.
• Review the sample embeddings schema in the workshop repo.

Reporting: 09:45 AM at VCET Computer Labs. Remember your entry pass is valid for all 4 days!

Keep building,
— GDG on Campus VCET`,
    ctaText: "Access Day 2 Lab Materials",
    ctaUrl: "https://gdg-vcet.edu.in/events/dev-to-cloud/agenda",
  },
  {
    name: "Day 4 Production Audit & Certificates",
    subject: "Day 4 Finale: Production Hardening & Certificate Awarding",
    message: `Congratulations on making it to the final day of Dev to Cloud!

Today we will conduct security audits, rate-limit evaluations, and token optimization on your Cloud Run applications.

Attendees with completed 4-day attendance will receive their official Google Developer Groups on Campus Certificate of Completion during today's closing ceremony.

See you at 10:00 AM sharp!
— GDG on Campus VCET Lead & Mentors`,
    ctaText: "Review 13-Point Security Checklist",
    ctaUrl: "https://gdg-vcet.edu.in/events/dev-to-cloud/agenda",
  },
];

export function EmailHub({
  eventSlug,
  eventTitle,
  registrations,
  initialLogs,
}: EmailHubProps) {
  const [activeTab, setActiveTab] = useState<"broadcast" | "individual" | "history">("broadcast");
  const [logs, setLogs] = useState<EmailLog[]>(initialLogs);

  // Broadcast state
  const [audience, setAudience] = useState("all");
  const [subject, setSubject] = useState(EMAIL_TEMPLATES[0].subject);
  const [message, setMessage] = useState(EMAIL_TEMPLATES[0].message);
  const [ctaText, setCtaText] = useState(EMAIL_TEMPLATES[0].ctaText);
  const [ctaUrl, setCtaUrl] = useState(EMAIL_TEMPLATES[0].ctaUrl);
  const [includePassLink, setIncludePassLink] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<number>(0);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [broadcastFeedback, setBroadcastFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Individual pass sender state
  const [searchTerm, setSearchTerm] = useState("");
  const [sendingSingleRef, setSendingSingleRef] = useState<string | null>(null);
  const [singleFeedback, setSingleFeedback] = useState<{
    ref: string;
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Calculate target audience size
  const targetCount = registrations.filter((r) => {
    if (r.status === "cancelled") return false;
    if (audience === "all") return true;
    if (audience.startsWith("day-")) {
      const dayNum = parseInt(audience.replace("day-", ""), 10);
      return r.checkedInDays?.includes(dayNum) || (dayNum === 1 && r.checkedIn);
    }
    if (audience === "absent") {
      return !r.checkedIn && (!r.checkedInDays || r.checkedInDays.length === 0);
    }
    if (audience === "all-days") {
      return (r.checkedInDays?.length || 0) >= 4;
    }
    return true;
  }).length;

  function handleSelectTemplate(idx: number) {
    setSelectedTemplate(idx);
    const tmpl = EMAIL_TEMPLATES[idx];
    if (tmpl) {
      setSubject(tmpl.subject);
      setMessage(tmpl.message);
      setCtaText(tmpl.ctaText);
      setCtaUrl(tmpl.ctaUrl);
    }
  }

  async function handleSendBroadcast(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      alert("Please provide both subject and message.");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to broadcast this announcement to ${targetCount} recipients?`
      )
    ) {
      return;
    }

    setSendingBroadcast(true);
    setBroadcastFeedback(null);

    try {
      const res = await fetch(`/api/events/${eventSlug}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "broadcast",
          subject: subject.trim(),
          message: message.trim(),
          audience,
          includePassLink,
          ctaText: ctaText.trim() || undefined,
          ctaUrl: ctaUrl.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setBroadcastFeedback({
          type: "success",
          text: data.message || `Broadcast successfully sent to ${targetCount} attendees!`,
        });

        // Add to logs state
        const newLog: EmailLog = {
          id: String(Date.now()),
          eventSlug,
          type: "announcement",
          subject,
          recipientCount: targetCount,
          recipients: [],
          sentAt: new Date().toISOString(),
          status: data.simulated ? "simulated" : "sent",
          previewText: message.slice(0, 120),
        };
        setLogs((prev) => [newLog, ...prev]);
      } else {
        setBroadcastFeedback({
          type: "error",
          text: data.message || "Failed to broadcast email.",
        });
      }
    } catch {
      setBroadcastFeedback({
        type: "error",
        text: "Network error sending broadcast.",
      });
    } finally {
      setSendingBroadcast(false);
    }
  }

  async function handleSendSinglePass(reg: RegistrationRecord) {
    setSendingSingleRef(reg.referenceId);
    setSingleFeedback(null);

    try {
      const res = await fetch(`/api/events/${eventSlug}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send-pass",
          referenceId: reg.referenceId,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSingleFeedback({
          ref: reg.referenceId,
          type: "success",
          text: data.message || `Pass emailed to ${reg.email}!`,
        });

        const newLog: EmailLog = {
          id: String(Date.now()),
          eventSlug,
          type: "pass",
          subject: `Your Official Pass: ${eventTitle} · #${reg.referenceId}`,
          recipientCount: 1,
          recipients: [reg.email],
          sentAt: new Date().toISOString(),
          status: data.simulated ? "simulated" : "sent",
          previewText: `Pass for ${reg.fullName} (#${reg.referenceId})`,
        };
        setLogs((prev) => [newLog, ...prev]);
      } else {
        setSingleFeedback({
          ref: reg.referenceId,
          type: "error",
          text: data.message || `Failed to send pass to ${reg.email}.`,
        });
      }
    } catch {
      setSingleFeedback({
        ref: reg.referenceId,
        type: "error",
        text: "Network error sending email.",
      });
    } finally {
      setSendingSingleRef(null);
    }
  }

  const filteredRegistrations = registrations.filter((r) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.fullName.toLowerCase().includes(term) ||
      r.email.toLowerCase().includes(term) ||
      r.referenceId.toLowerCase().includes(term) ||
      r.college.toLowerCase().includes(term)
    );
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("broadcast")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "broadcast"
              ? "bg-primary text-white shadow-xs"
              : "bg-surface text-foreground-muted hover:text-foreground hover:bg-surface-container"
          }`}
        >
          Broadcast Announcements ({targetCount} Attendees)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("individual")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "individual"
              ? "bg-primary text-white shadow-xs"
              : "bg-surface text-foreground-muted hover:text-foreground hover:bg-surface-container"
          }`}
        >
          Individual Pass Resend
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "history"
              ? "bg-primary text-white shadow-xs"
              : "bg-surface text-foreground-muted hover:text-foreground hover:bg-surface-container"
          }`}
        >
          Dispatch History ({logs.length})
        </button>
      </div>

      {/* TAB 1: BROADCAST ANNOUNCEMENT */}
      {activeTab === "broadcast" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Form Column */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-border shadow-xs flex flex-col gap-5">
            <div>
              <h2 className="text-base font-bold text-foreground">
                Broadcast Announcement or Schedule Update
              </h2>
              <p className="text-xs text-foreground-muted mt-0.5">
                Send official emails to workshop attendees with optional entry pass QR link.
              </p>
            </div>

            {broadcastFeedback ? (
              <div
                className={`p-3.5 rounded-xl text-xs font-semibold border ${
                  broadcastFeedback.type === "success"
                    ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                    : "bg-rose-50 text-rose-900 border-rose-200"
                }`}
              >
                {broadcastFeedback.text}
              </div>
            ) : null}

            {/* Template Presets */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                Quick Template Presets
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {EMAIL_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectTemplate(idx)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                      selectedTemplate === idx
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-surface border-border text-foreground hover:bg-surface-container"
                    }`}
                  >
                    {tmpl.name}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSendBroadcast} className="flex flex-col gap-4">
              {/* Audience Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Target Audience
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    className="flex-1 h-11 px-3.5 rounded-xl border border-border bg-slate-50/50 text-base sm:text-sm text-foreground focus:bg-white focus:outline-hidden"
                  >
                    <option value="all">All Confirmed Attendees ({registrations.length})</option>
                    <option value="day-1">Day 1 Attendees (Dec 1)</option>
                    <option value="day-2">Day 2 Attendees (Dec 2)</option>
                    <option value="day-3">Day 3 Attendees (Dec 3)</option>
                    <option value="day-4">Day 4 Attendees (Dec 4)</option>
                    <option value="all-days">All 4 Days Completed (Perfect Attendance)</option>
                    <option value="absent">Pending Check-in (Absent So Far)</option>
                  </select>
                  <span className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold shrink-0">
                    {targetCount} Recipients
                  </span>
                </div>
              </div>

              {/* Subject */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Email Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Day 1 Starts Tomorrow at 10 AM · Dev to Cloud"
                  required
                  className="h-11 px-3.5 rounded-xl border border-border bg-slate-50/50 text-base sm:text-sm text-foreground focus:bg-white focus:outline-hidden font-medium"
                />
              </div>

              {/* Message */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Announcement Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={8}
                  placeholder="Write your announcement message here..."
                  required
                  className="p-3.5 rounded-xl border border-border bg-slate-50/50 text-base sm:text-sm text-foreground focus:bg-white focus:outline-hidden font-normal leading-relaxed resize-y"
                />
              </div>

              {/* CTA Link Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Action Button Label (Optional)
                  </label>
                  <input
                    type="text"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    placeholder="e.g. View Lab Guide"
                    className="h-11 px-3.5 rounded-xl border border-border bg-slate-50/50 text-base sm:text-sm text-foreground focus:bg-white focus:outline-hidden"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Action Button URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={ctaUrl}
                    onChange={(e) => setCtaUrl(e.target.value)}
                    placeholder="https://..."
                    className="h-11 px-3.5 rounded-xl border border-border bg-slate-50/50 text-base sm:text-sm text-foreground focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Pass Link Checkbox */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={includePassLink}
                  onChange={(e) => setIncludePassLink(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                />
                <span className="text-foreground">
                  Include each attendee&apos;s personal <strong>4-day pass link &amp; QR reference ID</strong> at the bottom of the email.
                </span>
              </label>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={sendingBroadcast || targetCount === 0}
                  className="w-full sm:w-auto h-12 px-6 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover active:scale-95 transition-all disabled:opacity-50 cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  <span>
                    {sendingBroadcast
                      ? "Dispatching Emails..."
                      : `Send Broadcast to ${targetCount} Attendees`}
                  </span>
                </button>
              </div>
            </form>
          </div>

          {/* Live Preview Column */}
          <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-border shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                Live Email Preview
              </span>
              <span className="text-[11px] text-foreground-muted">Branded HTML Template</span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs bg-slate-50/50">
              {/* Header Bar */}
              <div className="flex h-1.5 w-full">
                <div className="w-1/4 bg-[#4285F4]" />
                <div className="w-1/4 bg-[#EA4335]" />
                <div className="w-1/4 bg-[#FBBC04]" />
                <div className="w-1/4 bg-[#34A853]" />
              </div>

              <div className="p-4 flex flex-col gap-3">
                <div className="text-[10px] font-bold text-slate-500 uppercase">
                  {eventTitle} &bull; Announcement
                </div>
                <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                  {subject || "Email Subject Line"}
                </h3>
                <p className="text-xs font-semibold text-slate-800">
                  Dear John Doe,
                </p>
                <div className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed font-normal">
                  {message || "Announcement message body..."}
                </div>

                {ctaText && ctaUrl ? (
                  <div className="py-2 text-center">
                    <span className="inline-block px-4 py-2 rounded-lg bg-primary text-white font-bold text-xs shadow-xs">
                      {ctaText}
                    </span>
                  </div>
                ) : null}

                {includePassLink ? (
                  <div className="p-2.5 rounded-lg border border-slate-200 bg-white text-[11px] text-slate-600">
                    <span className="font-bold text-slate-900">Your Pass Reference ID:</span>{" "}
                    <span className="font-mono font-bold text-primary">#GDG-VCET-2026-0842</span>
                    <div className="text-primary font-medium underline mt-1">
                      View your official 4-day pass &amp; QR code &rarr;
                    </div>
                  </div>
                ) : null}

                <div className="pt-2 text-[10px] text-slate-400 border-t border-slate-200 text-center">
                  Google Developer Groups on Campus &middot; VCET Vasai
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* TAB 2: INDIVIDUAL PASS RESEND */}
      {activeTab === "individual" ? (
        <div className="bg-white p-6 rounded-2xl border border-border shadow-xs flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-foreground">
                Resend Official Entry Pass
              </h2>
              <p className="text-xs text-foreground-muted mt-0.5">
                Send or resend an attendee their official 4-day pass with QR code and reference ID.
              </p>
            </div>
            <div className="w-full sm:w-72">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name, email, or pass ID..."
                className="w-full h-10 px-3 rounded-xl border border-border bg-slate-50/50 text-base sm:text-xs text-foreground focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-slate-50 text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Pass Ref</th>
                  <th className="py-2.5 px-3">Attendee Name</th>
                  <th className="py-2.5 px-3">Email Address</th>
                  <th className="py-2.5 px-3">Track</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No attendees match your search.
                    </td>
                  </tr>
                ) : (
                  filteredRegistrations.map((reg) => {
                    const isSending = sendingSingleRef === reg.referenceId;
                    const feedback = singleFeedback?.ref === reg.referenceId ? singleFeedback : null;

                    return (
                      <tr key={reg.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                          {reg.referenceId}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {reg.fullName}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          {reg.email}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-100">
                            {(reg.track || "General").split(":")[0]}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          {feedback ? (
                            <span
                              className={`text-[11px] font-bold mr-2 ${
                                feedback.type === "success" ? "text-emerald-700" : "text-rose-600"
                              }`}
                            >
                              {feedback.text}
                            </span>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => handleSendSinglePass(reg)}
                            disabled={isSending}
                            className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-hover active:scale-95 transition-all disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="22" y1="2" x2="11" y2="13" />
                              <polygon points="22 2 15 22 11 13 2 9 22 2" />
                            </svg>
                            <span>{isSending ? "Sending..." : "Email Pass"}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* TAB 3: DISPATCH HISTORY */}
      {activeTab === "history" ? (
        <div className="bg-white p-6 rounded-2xl border border-border shadow-xs flex flex-col gap-4">
          <div>
            <h2 className="text-base font-bold text-foreground">
              Email Dispatch &amp; Broadcast History
            </h2>
            <p className="text-xs text-foreground-muted mt-0.5">
              Review previously sent pass emails and attendee announcements.
            </p>
          </div>

          {logs.length === 0 ? (
            <div className="py-12 text-center text-xs text-foreground-muted">
              No emails have been dispatched for this event yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-slate-50 text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Date &amp; Time</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Subject</th>
                    <th className="py-2.5 px-3 text-center">Recipients</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                        {new Date(log.sentAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            log.type === "pass"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {log.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">{log.subject}</span>
                          {log.previewText ? (
                            <span className="text-[11px] text-slate-500 truncate max-w-md">
                              {log.previewText}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                        {log.recipientCount}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            log.status === "sent"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : log.status === "simulated"
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : "bg-rose-50 text-rose-800 border border-rose-200"
                          }`}
                        >
                          {log.status === "simulated" ? "Simulated / Logged" : log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
