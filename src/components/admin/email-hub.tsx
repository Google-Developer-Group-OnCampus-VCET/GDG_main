"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { generatePassPdfBytes } from "@/lib/pass-pdf";
import type {
  AgendaSession,
  EmailLog,
  RegistrationRecord,
  WorkshopSpeaker,
} from "@/types";

interface EmailHubProps {
  eventSlug: string;
  eventTitle: string;
  eventDatesText?: string;
  eventLocation?: string;
  workshopAgenda?: AgendaSession[];
  workshopSpeakers?: WorkshopSpeaker[];
  registrations: RegistrationRecord[];
  initialLogs: EmailLog[];
}

const SPEAKER_TEMPLATES = [
  {
    name: "Official Talk Confirmation",
    buildSubject: (eventTitle: string, talkTitle: string) =>
      `Confirmed Speaker Invite: ${talkTitle || "Your Talk"} · ${eventTitle}`,
    message: `Thank you for confirming your session with Google Developer Groups on Campus · VCET!

We are delighted to host you as an official speaker. Our student developer cohort is eagerly looking forward to learning from your insights and practical experience.

Please find your confirmed session details below. Kindly share your slide deck or repository links a day prior if you would like us to verify lab/display readiness beforehand, and let us know if you have any specific software or stage requirements.`,
    ctaText: "View Event Agenda",
  },
  {
    name: "Pre-Event Reminder & AV Check",
    buildSubject: (eventTitle: string, talkTitle: string) =>
      `Speaker Reminder & Venue Logistics: ${talkTitle || "Upcoming Session"} · ${eventTitle}`,
    message: `We are just around the corner from your session at VCET! This is a quick confirmation reminder with reporting and AV setup details.

Our organizing leads will greet you at the main gate/seminar hall entrance 30 minutes before your slot to assist with HDMI/USB-C display testing, microphone check, and refreshments.

Feel free to reply directly to this thread or reach out to vcet_gdg@vcet.edu.in once you are on your way.`,
    ctaText: "Review Schedule & Venue",
  },
  {
    name: "Post-Talk Thank You",
    buildSubject: (eventTitle: string, talkTitle: string) =>
      `Thank You for Speaking on "${talkTitle || "Your Session"}" · ${eventTitle}`,
    message: `Thank you so much for taking the time to inspire and mentor our student developers at VCET!

Your session received tremendous appreciation from the attendees, and we are truly grateful for your contribution to the campus tech community. If you would like us to share your slides or resources with attendees, feel free to reply with the links.`,
    ctaText: "Visit Event Recap Page",
  },
];

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
  {
    name: "1st Year Permission & Pass Notice",
    subject: "[Important Update] GDG Dev to Cloud Workshop: Registration Status for First Year Students",
    message: `Dear Attendee,

Thank you for your enthusiasm and proactive interest in registering for "Zero to Hero: Dev to Cloud", the 4-day flagship workshop organized by Google Developer Groups on Campus VCET (Dec 1 – Dec 4, 2026).

We are writing to communicate an important update regarding your registration.

Due to strict academic schedules, ongoing mandatory lecture and lab hours, and departmental attendance regulations, official institutional permission from the First Year Department could not be secured for first-year students to attend full-day sessions during college hours.

In compliance with college administration guidelines, we regret to inform you that we are required to revoke all workshop passes issued to First Year students for this edition. Your pass has been cancelled in the system, and entry will not be permitted at the gate check-in desk.

We sincerely apologize for this inconvenience. All workshop lecture slides, GitHub starter repositories, cloud codelabs, and project walkthroughs will be shared publicly after the event so you can learn self-paced. Furthermore, our team is designing weekend and evening sessions outside lecture hours specifically so First Year students can participate fully.

If you have any questions, feel free to reply directly to this email at vcet_gdg@vcet.edu.in.

Warm regards,
Organizing Team
Google Developer Groups on Campus VCET`,
    ctaText: "View Public Chapter Resources",
    ctaUrl: "https://gdg-vcet.edu.in/events/dev-to-cloud",
  },
];

export function EmailHub({
  eventSlug,
  eventTitle,
  eventDatesText = "Dec 1–4, 2026",
  eventLocation = "Vidyavardhini's College of Engineering and Technology, Vasai",
  workshopAgenda = [],
  workshopSpeakers = [],
  registrations: initialRegistrations,
  initialLogs,
}: EmailHubProps) {
  const router = useRouter();
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>(initialRegistrations);
  const [activeTab, setActiveTab] = useState<"broadcast" | "speaker" | "individual" | "history">(
    "broadcast"
  );
  const [logs, setLogs] = useState<EmailLog[]>(initialLogs);

  // Broadcast state
  const [audience, setAudience] = useState("all");
  const [selectedIndividual, setSelectedIndividual] = useState<RegistrationRecord | null>(null);
  const [subject, setSubject] = useState(EMAIL_TEMPLATES[0].subject);
  const [message, setMessage] = useState(EMAIL_TEMPLATES[0].message);
  const [ctaText, setCtaText] = useState(EMAIL_TEMPLATES[0].ctaText);
  const [ctaUrl, setCtaUrl] = useState(EMAIL_TEMPLATES[0].ctaUrl);
  const [includePassLink, setIncludePassLink] = useState(false);
  const [attachPassPdf, setAttachPassPdf] = useState(false);
  const [revokePasses, setRevokePasses] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<number>(0);
  const [recipientSearchTerm, setRecipientSearchTerm] = useState("");
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
  const [previewPassReg, setPreviewPassReg] = useState<RegistrationRecord | null>(null);
  const [previewQrDataUrl, setPreviewQrDataUrl] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  async function handleOpenPassPreview(reg: RegistrationRecord) {
    setPreviewPassReg(reg);
    setPreviewQrDataUrl(null);
    try {
      const url = await QRCode.toDataURL(reg.referenceId, {
        width: 260,
        margin: 1,
        color: { dark: "#1A1B1E", light: "#FFFFFF" },
      });
      setPreviewQrDataUrl(url);
    } catch {
      setPreviewQrDataUrl(null);
    }
  }

  async function handleDownloadPreviewPdf() {
    if (!previewPassReg) return;
    setDownloadingPdf(true);
    try {
      const bytes = await generatePassPdfBytes({
        eventTitle,
        datesText: eventDatesText,
        venueText: eventLocation,
        registration: previewPassReg,
      });
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `GDG-VCET-Pass-${previewPassReg.referenceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingPdf(false);
    }
  }

  // Speaker confirmation state
  const [speakerTemplateIdx, setSpeakerTemplateIdx] = useState(0);
  const [speakerName, setSpeakerName] = useState("");
  const [speakerEmail, setSpeakerEmail] = useState("");
  const [speakerRole, setSpeakerRole] = useState("");
  const [speakerCcEmail, setSpeakerCcEmail] = useState("");
  const [talkTitle, setTalkTitle] = useState("");
  const [sessionFormat, setSessionFormat] = useState("Technical Session");
  const [sessionSlot, setSessionSlot] = useState(eventDatesText);
  const [speakerVenue, setSpeakerVenue] = useState(eventLocation);
  const [speakerSubject, setSpeakerSubject] = useState(
    SPEAKER_TEMPLATES[0].buildSubject(eventTitle, "")
  );
  const [speakerSubjectCustomized, setSpeakerSubjectCustomized] = useState(false);
  const [speakerMessage, setSpeakerMessage] = useState(SPEAKER_TEMPLATES[0].message);
  const [speakerCtaText, setSpeakerCtaText] = useState(SPEAKER_TEMPLATES[0].ctaText);
  const [speakerCtaUrl, setSpeakerCtaUrl] = useState(
    `https://gdg-vcet.vercel.app/events/${eventSlug}/agenda`
  );
  const [sendingSpeakerMail, setSendingSpeakerMail] = useState(false);
  const [speakerFeedback, setSpeakerFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const speakerAgendaOptions = useMemo(
    () => workshopAgenda.filter((session) => session.track !== "break"),
    [workshopAgenda]
  );

  const confirmedSpeakerLogs = useMemo(
    () => logs.filter((entry) => entry.type === "speaker"),
    [logs]
  );

  // Target audience recipients
  const targetRecipients = useMemo(() => {
    return registrations.filter((r) => {
      if (r.status === "cancelled" && !revokePasses) return false;
      if (audience.startsWith("ref-")) {
        return r.referenceId === audience.replace("ref-", "");
      }
      if (audience === "individual" && selectedIndividual) {
        return r.referenceId === selectedIndividual.referenceId;
      }
      if (audience === "all") return true;
      if (audience === "year-1" || audience === "1st-year") {
        return r.yearOfStudy === "1st Year" || r.yearOfStudy?.includes("1");
      }
      if (audience === "year-2" || audience === "2nd-year") {
        return r.yearOfStudy === "2nd Year" || r.yearOfStudy?.includes("2");
      }
      if (audience === "year-3" || audience === "3rd-year") {
        return r.yearOfStudy === "3rd Year" || r.yearOfStudy?.includes("3");
      }
      if (audience === "year-4" || audience === "4th-year") {
        return r.yearOfStudy === "4th Year" || r.yearOfStudy?.includes("4");
      }
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
    });
  }, [registrations, audience, selectedIndividual, revokePasses]);

  const filteredRecipients = useMemo(() => {
    if (!recipientSearchTerm.trim()) return targetRecipients;
    const q = recipientSearchTerm.toLowerCase().trim();
    return targetRecipients.filter(
      (r) =>
        r.fullName.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.referenceId.toLowerCase().includes(q) ||
        (r.department && r.department.toLowerCase().includes(q))
    );
  }, [targetRecipients, recipientSearchTerm]);

  const targetCount = targetRecipients.length;

  function handleComposeToIndividual(reg: RegistrationRecord) {
    setSelectedIndividual(reg);
    setAudience(`ref-${reg.referenceId}`);
    setActiveTab("broadcast");

    // If 1st year attendee, auto-load revocation notice preset
    if (reg.yearOfStudy?.includes("1") || reg.yearOfStudy?.toLowerCase().includes("first")) {
      const tmpl = EMAIL_TEMPLATES.find((t) => t.name.includes("1st Year"));
      if (tmpl) {
        setSubject(tmpl.subject);
        setMessage(tmpl.message);
        setCtaText(tmpl.ctaText);
        setCtaUrl(tmpl.ctaUrl);
        setIncludePassLink(false);
        setRevokePasses(true);
      }
    }
  }

  function handleSelectTemplate(idx: number) {
    setSelectedTemplate(idx);
    const tmpl = EMAIL_TEMPLATES[idx];
    if (tmpl) {
      setSubject(tmpl.subject);
      setMessage(tmpl.message);
      setCtaText(tmpl.ctaText);
      setCtaUrl(tmpl.ctaUrl);

      if (tmpl.name.includes("1st Year")) {
        setAudience("year-1");
        setIncludePassLink(false);
        setRevokePasses(true);
      }
    }
  }

  async function handleSendBroadcast(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      alert("Please provide both subject and message.");
      return;
    }

    const confirmMessage = revokePasses
      ? `⚠️ CAUTION: Pass Revocation & Seat Release Active!\n\nAre you sure you want to broadcast this update to ${targetCount} recipients?\n\nThis will permanently CANCEL their passes in the database, synchronize the Firestore counter, and instantly release their seats for other students.`
      : `Are you sure you want to broadcast this announcement to ${targetCount} recipients?`;

    if (!confirm(confirmMessage)) {
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
          attachPassPdf,
          revokePasses,
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

        // If passes were revoked, update registration statuses in state immediately
        if (data.revokedReferenceIds && data.revokedReferenceIds.length > 0) {
          const revokedSet = new Set(
            data.revokedReferenceIds.map((id: string) => id.toUpperCase())
          );
          setRegistrations((prev) =>
            prev.map((r) =>
              revokedSet.has(r.referenceId.toUpperCase())
                ? { ...r, status: "cancelled" }
                : r
            )
          );
          router.refresh();
        }

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

  function handleSelectSpeakerTemplate(idx: number) {
    setSpeakerTemplateIdx(idx);
    const tmpl = SPEAKER_TEMPLATES[idx];
    if (!tmpl) return;
    setSpeakerSubject(tmpl.buildSubject(eventTitle, talkTitle.trim()));
    setSpeakerSubjectCustomized(false);
    setSpeakerMessage(tmpl.message);
    setSpeakerCtaText(tmpl.ctaText);
  }

  function handleTalkTitleChange(nextTitle: string) {
    setTalkTitle(nextTitle);
    if (!speakerSubjectCustomized) {
      const tmpl = SPEAKER_TEMPLATES[speakerTemplateIdx] ?? SPEAKER_TEMPLATES[0];
      setSpeakerSubject(tmpl.buildSubject(eventTitle, nextTitle.trim()));
    }
  }

  function handlePrefillFromSession(session: AgendaSession) {
    const nextTalk = session.title;
    setTalkTitle(nextTalk);
    setSessionSlot(`Day ${session.day} · ${session.time}`);
    setSessionFormat(
      session.trackLabel ||
        (session.track === "lab"
          ? "Hands-on Workshop"
          : session.track === "keynote"
            ? "Keynote Session"
            : "Technical Session")
    );
    if (session.location) {
      setSpeakerVenue(session.location);
    }
    if (session.speaker && !session.speaker.toLowerCase().includes("tbd")) {
      setSpeakerName(session.speaker);
    }
    if (session.speakerRole && !session.speakerRole.toLowerCase().includes("tbd")) {
      setSpeakerRole(session.speakerRole);
    }
    if (!speakerSubjectCustomized) {
      const tmpl = SPEAKER_TEMPLATES[speakerTemplateIdx] ?? SPEAKER_TEMPLATES[0];
      setSpeakerSubject(tmpl.buildSubject(eventTitle, nextTalk));
    }
  }

  function handlePrefillFromSpeakerProfile(sp: WorkshopSpeaker) {
    setSpeakerName(sp.name);
    setSpeakerRole(
      [sp.role, sp.organization].filter((v) => Boolean(v && v.trim())).join(" · ")
    );
    if (sp.topicTitle) {
      handleTalkTitleChange(sp.topicTitle);
    }
    setSessionFormat(
      sp.category === "keynote"
        ? "Keynote Session"
        : sp.category === "hands-on"
          ? "Hands-on Workshop"
          : "Technical Session"
    );
  }

  async function handleSendSpeakerConfirmation(e: React.FormEvent) {
    e.preventDefault();
    if (
      !speakerName.trim() ||
      !speakerEmail.trim() ||
      !talkTitle.trim() ||
      !speakerSubject.trim() ||
      !speakerMessage.trim()
    ) {
      setSpeakerFeedback({
        type: "error",
        text: "Please complete speaker name, email, confirmed talk title, subject, and message.",
      });
      return;
    }

    if (
      !confirm(
        `Send official Speaker Confirmation email to ${speakerName.trim()} (${speakerEmail.trim()}) for "${talkTitle.trim()}"?`
      )
    ) {
      return;
    }

    setSendingSpeakerMail(true);
    setSpeakerFeedback(null);

    try {
      const res = await fetch(`/api/events/${eventSlug}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "speaker-confirmation",
          speakerName: speakerName.trim(),
          speakerEmail: speakerEmail.trim(),
          speakerRole: speakerRole.trim() || undefined,
          ccEmail: speakerCcEmail.trim() || undefined,
          talkTitle: talkTitle.trim(),
          sessionFormat: sessionFormat.trim() || "Technical Session",
          sessionSlot: sessionSlot.trim() || eventDatesText,
          venue: speakerVenue.trim() || eventLocation,
          subject: speakerSubject.trim(),
          message: speakerMessage.trim(),
          ctaText: speakerCtaText.trim() || undefined,
          ctaUrl: speakerCtaUrl.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSpeakerFeedback({
          type: "success",
          text:
            data.message ||
            `Speaker confirmation emailed to ${speakerName.trim()} (${speakerEmail.trim()})!`,
        });

        const newLog: EmailLog = data.log ?? {
          id: String(Date.now()),
          eventSlug,
          type: "speaker",
          subject: speakerSubject.trim(),
          recipientCount: speakerCcEmail.trim() ? 2 : 1,
          recipients: speakerCcEmail.trim()
            ? [speakerEmail.trim(), speakerCcEmail.trim()]
            : [speakerEmail.trim()],
          sentAt: new Date().toISOString(),
          status: data.simulated ? "simulated" : "sent",
          previewText: `${speakerName.trim()} · ${talkTitle.trim()}`,
        };
        setLogs((prev) => [newLog, ...prev]);
      } else {
        setSpeakerFeedback({
          type: "error",
          text: data.message || "Failed to send speaker confirmation email.",
        });
      }
    } catch {
      setSpeakerFeedback({
        type: "error",
        text: "Network error sending speaker confirmation email.",
      });
    } finally {
      setSendingSpeakerMail(false);
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
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${activeTab === "broadcast"
            ? "bg-primary text-white shadow-xs"
            : "bg-surface text-foreground-muted hover:text-foreground hover:bg-surface-container"
            }`}
        >
          Broadcast Announcements ({targetCount} Attendees)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("speaker")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${activeTab === "speaker"
            ? "bg-emerald-600 text-white shadow-xs"
            : "bg-surface text-foreground-muted hover:text-foreground hover:bg-surface-container"
            }`}
        >
          Speaker Confirmation{confirmedSpeakerLogs.length > 0 ? ` (${confirmedSpeakerLogs.length})` : ""}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("individual")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${activeTab === "individual"
            ? "bg-primary text-white shadow-xs"
            : "bg-surface text-foreground-muted hover:text-foreground hover:bg-surface-container"
            }`}
        >
          Individual Pass Resend
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${activeTab === "history"
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
                className={`p-3.5 rounded-xl text-xs font-semibold border ${broadcastFeedback.type === "success"
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
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${selectedTemplate === idx
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
                    <optgroup label="Entire Cohort">
                      <option value="all">All Confirmed Attendees ({registrations.filter(r => r.status !== 'cancelled').length})</option>
                    </optgroup>
                    <optgroup label="Single Individual">
                      {selectedIndividual ? (
                        <option value={`ref-${selectedIndividual.referenceId}`}>
                          Selected: {selectedIndividual.fullName} ({selectedIndividual.email})
                        </option>
                      ) : null}
                      <option value="individual">Search &amp; Pick Individual Attendee…</option>
                    </optgroup>
                    <optgroup label="Academic Year Cohort">
                      <option value="year-1">First Year Students (1st Year)</option>
                      <option value="year-2">Second Year Students (2nd Year)</option>
                      <option value="year-3">Third Year Students (3rd Year)</option>
                      <option value="year-4">Final Year Students (4th Year)</option>
                    </optgroup>
                    <optgroup label="Daily Workshop Attendance">
                      <option value="day-1">Day 1 Attendees (Dec 1)</option>
                      <option value="day-2">Day 2 Attendees (Dec 2)</option>
                      <option value="day-3">Day 3 Attendees (Dec 3)</option>
                      <option value="day-4">Day 4 Attendees (Dec 4)</option>
                      <option value="all-days">All 4 Days Completed (Perfect Attendance)</option>
                      <option value="absent">Pending Check-in (Absent So Far)</option>
                    </optgroup>
                  </select>
                  <span className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold shrink-0">
                    {targetCount} Recipients
                  </span>
                </div>

                {audience === "individual" ? (
                  <div className="mt-2 p-3 bg-surface-container-low rounded-xl border border-border flex flex-col gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      Search attendee by name, email, or pass ID:
                    </span>
                    <input
                      type="text"
                      placeholder="Type name, email, or pass ref to select..."
                      onChange={(e) => {
                        const q = e.target.value.toLowerCase().trim();
                        if (!q) return;
                        const match = registrations.find(
                          (r) =>
                            r.fullName.toLowerCase().includes(q) ||
                            r.email.toLowerCase().includes(q) ||
                            r.referenceId.toLowerCase().includes(q)
                        );
                        if (match) {
                          setSelectedIndividual(match);
                        }
                      }}
                      className="h-10 px-3 rounded-lg border border-border bg-white text-xs text-foreground focus:outline-hidden"
                    />
                    {selectedIndividual ? (
                      <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900">
                        <div>
                          <span>Targeting: <strong>{selectedIndividual.fullName}</strong> ({selectedIndividual.email})</span>
                          <span className="ml-2 px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 font-mono text-[10px]">
                            {selectedIndividual.yearOfStudy} &bull; {selectedIndividual.department}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedIndividual(null)}
                          className="text-xs font-bold text-blue-700 hover:underline"
                        >
                          Clear
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
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

              {/* Attach Attendee Pass (QR + PDF) Checkbox */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-blue-200 bg-blue-50/60 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={attachPassPdf}
                  onChange={(e) => setAttachPassPdf(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                />
                <span className="text-blue-950">
                  <strong>Attach Attendee Pass (QR Code + PDF)</strong> — embeds a scannable check-in QR pass card in the email and attaches the official Pass PDF with their updated Confirmed ID.
                </span>
              </label>

              {/* Revoke Pass Option */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-rose-200 bg-rose-50/50 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={revokePasses}
                  onChange={(e) => setRevokePasses(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <span className="text-rose-950">
                  <strong>Automatically mark targeted attendees as Cancelled</strong> in the database and audit trail.
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

          {/* Target Audience Recipient Directory */}
          <div className="lg:col-span-12 bg-white p-6 rounded-2xl border border-border shadow-xs flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-foreground">
                    Target Audience Recipient Directory
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                    {targetRecipients.length} Recipients
                  </span>
                </div>
                <p className="text-xs text-foreground-muted mt-0.5">
                  Live preview of verified attendees who will receive this broadcast dispatch.
                </p>
              </div>

              {/* Quick Filter */}
              <div className="w-full sm:w-72">
                <input
                  type="text"
                  value={recipientSearchTerm}
                  onChange={(e) => setRecipientSearchTerm(e.target.value)}
                  placeholder="Filter by name, pass ID, or email..."
                  className="w-full h-9 px-3 rounded-xl border border-border bg-slate-50 text-xs text-foreground focus:bg-white focus:outline-hidden font-medium"
                />
              </div>
            </div>

            {/* Revocation Warning Alert if checked */}
            {revokePasses ? (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-950 flex items-start gap-3 shadow-xs">
                <span className="text-rose-600 font-bold text-base shrink-0 mt-0.5">⚠️</span>
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-rose-900">
                    Active Pass Cancellation &amp; Immediate Seat Release Enabled:
                  </span>
                  <span className="text-rose-800 leading-relaxed">
                    Broadcasting this announcement will permanently mark all listed active passes as <code className="bg-rose-100 text-rose-900 px-1 py-0.5 rounded font-mono font-bold">cancelled</code> in the database, recalculate the live seat counter in Firestore, and instantly return their seats to the public registration pool.
                  </span>
                </div>
              </div>
            ) : null}

            {/* Recipient Directory Table */}
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-slate-50 text-slate-700 font-bold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Attendee</th>
                    <th className="py-2.5 px-3">Email Address</th>
                    <th className="py-2.5 px-3">Academic Year</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">DB Status</th>
                    <th className="py-2.5 px-3">Projected Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredRecipients.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-foreground-muted">
                        No attendees match the selected audience filter &quot;{audience}&quot;.
                      </td>
                    </tr>
                  ) : (
                    filteredRecipients.map((rec) => (
                      <tr
                        key={rec.referenceId}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          rec.status === "cancelled" ? "opacity-60 bg-slate-50/40" : ""
                        }`}
                      >
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-foreground">{rec.fullName}</div>
                          <div className="font-mono text-[11px] text-primary">{rec.referenceId}</div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-foreground-muted">
                          {rec.email}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              rec.yearOfStudy?.includes("1") || rec.yearOfStudy?.toLowerCase().includes("first")
                                ? "bg-amber-100 text-amber-900"
                                : rec.yearOfStudy?.includes("2") || rec.yearOfStudy?.toLowerCase().includes("second")
                                ? "bg-blue-100 text-blue-900"
                                : rec.yearOfStudy?.includes("3") || rec.yearOfStudy?.toLowerCase().includes("third")
                                ? "bg-purple-100 text-purple-900"
                                : "bg-slate-100 text-slate-800"
                            }`}
                          >
                            {rec.yearOfStudy || "Year N/A"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-foreground-muted text-[11px]">
                          {rec.department || "VCET"}
                        </td>
                        <td className="py-2.5 px-3">
                          {rec.status === "cancelled" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                              Cancelled in DB
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Active Pass
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {revokePasses && rec.status !== "cancelled" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200">
                              <span>❌</span> Cancel Pass &amp; Release Seat
                            </span>
                          ) : rec.status === "cancelled" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                              <span>ℹ️</span> Already Cancelled
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                              <span>📩</span> Deliver Broadcast
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {/* TAB 2: SPEAKER TALK CONFIRMATION */}
      {activeTab === "speaker" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Compose Speaker Email Column */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-border shadow-xs flex flex-col gap-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-foreground">
                    Speaker Talk Confirmation &amp; Logistics
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold uppercase tracking-wide">
                    Speaker Mode
                  </span>
                </div>
                <p className="text-xs text-foreground-muted mt-0.5">
                  Send an official confirmation card with talk title, time slot, venue, and AV checklist after a speaker confirms their talk.
                </p>
              </div>
            </div>

            {speakerFeedback ? (
              <div
                className={`p-3.5 rounded-xl text-xs font-semibold border ${
                  speakerFeedback.type === "success"
                    ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                    : "bg-rose-50 text-rose-900 border-rose-200"
                }`}
              >
                {speakerFeedback.text}
              </div>
            ) : null}

            {/* Speaker Presets */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                Speaker Mail Presets
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {SPEAKER_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={tmpl.name}
                    type="button"
                    onClick={() => handleSelectSpeakerTemplate(idx)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                      speakerTemplateIdx === idx
                        ? "bg-emerald-50 border-emerald-500 text-emerald-900"
                        : "bg-surface border-border text-foreground hover:bg-surface-container"
                    }`}
                  >
                    {tmpl.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Prefill from Event Schedule / Roster */}
            {speakerAgendaOptions.length > 0 || workshopSpeakers.length > 0 ? (
              <div className="p-3.5 rounded-xl border border-border bg-surface-container-low/60 flex flex-col gap-2">
                <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                  Quick Pre-fill from Event Schedule
                </span>
                {workshopSpeakers.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {workshopSpeakers.map((sp) => (
                      <button
                        key={sp.id}
                        type="button"
                        onClick={() => handlePrefillFromSpeakerProfile(sp)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-border text-[11px] font-semibold text-foreground hover:border-emerald-400 hover:bg-emerald-50/60 transition-colors cursor-pointer"
                      >
                        👤 {sp.name}
                      </button>
                    ))}
                  </div>
                ) : null}
                {speakerAgendaOptions.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {speakerAgendaOptions.slice(0, 8).map((session) => (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => handlePrefillFromSession(session)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-border text-[11px] font-medium text-foreground-muted hover:text-foreground hover:border-primary/50 transition-colors cursor-pointer"
                      >
                        Day {session.day} · {session.title.slice(0, 34)}
                        {session.title.length > 34 ? "…" : ""}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <form onSubmit={handleSendSpeakerConfirmation} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Speaker Name *
                  </label>
                  <input
                    type="text"
                    value={speakerName}
                    onChange={(e) => setSpeakerName(e.target.value)}
                    placeholder="e.g. Aarav Mehta"
                    required
                    className="h-11 px-3.5 rounded-xl border border-border bg-slate-50/50 text-base sm:text-sm text-foreground focus:bg-white focus:outline-hidden font-medium"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Speaker Email *
                  </label>
                  <input
                    type="email"
                    value={speakerEmail}
                    onChange={(e) => setSpeakerEmail(e.target.value)}
                    placeholder="speaker@company.com"
                    required
                    className="h-11 px-3.5 rounded-xl border border-border bg-slate-50/50 text-base sm:text-sm text-foreground focus:bg-white focus:outline-hidden font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Role &amp; Organization (Optional)
                  </label>
                  <input
                    type="text"
                    value={speakerRole}
                    onChange={(e) => setSpeakerRole(e.target.value)}
                    placeholder="e.g. Cloud Engineer · Google"
                    className="h-11 px-3.5 rounded-xl border border-border bg-slate-50/50 text-base sm:text-sm text-foreground focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                    CC Co-Speaker / Faculty (Optional)
                  </label>
                  <input
                    type="email"
                    value={speakerCcEmail}
                    onChange={(e) => setSpeakerCcEmail(e.target.value)}
                    placeholder="coordinator@vcet.edu.in"
                    className="h-11 px-3.5 rounded-xl border border-border bg-slate-50/50 text-base sm:text-sm text-foreground focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Confirmed Talk / Session Title *
                  </label>
                  <input
                    type="text"
                    value={talkTitle}
                    onChange={(e) => handleTalkTitleChange(e.target.value)}
                    placeholder="e.g. Deploying AI Agents on Cloud Run"
                    required
                    className="h-11 px-3.5 rounded-xl border border-border bg-slate-50/50 text-base sm:text-sm text-foreground focus:bg-white focus:outline-hidden font-medium"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Session Format
                  </label>
                  <select
                    value={sessionFormat}
                    onChange={(e) => setSessionFormat(e.target.value)}
                    className="h-11 px-3 rounded-xl border border-border bg-slate-50/50 text-base sm:text-sm text-foreground focus:bg-white focus:outline-hidden"
                  >
                    <option value="Technical Session">Technical Session</option>
                    <option value="Hands-on Workshop">Hands-on Workshop</option>
                    <option value="Keynote Session">Keynote Session</option>
                    <option value="Panel / Fireside Chat">Panel / Fireside Chat</option>
                    <option value="Guest Lecture">Guest Lecture</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Date &amp; Time Slot
                  </label>
                  <input
                    type="text"
                    value={sessionSlot}
                    onChange={(e) => setSessionSlot(e.target.value)}
                    placeholder="e.g. Day 2 · Dec 2, 2026 · 10:30 AM – 12:00 PM IST"
                    className="h-11 px-3.5 rounded-xl border border-border bg-slate-50/50 text-base sm:text-sm text-foreground focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Venue / Room
                  </label>
                  <input
                    type="text"
                    value={speakerVenue}
                    onChange={(e) => setSpeakerVenue(e.target.value)}
                    placeholder="VCET Seminar Hall, Vasai"
                    className="h-11 px-3.5 rounded-xl border border-border bg-slate-50/50 text-base sm:text-sm text-foreground focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Email Subject *
                </label>
                <input
                  type="text"
                  value={speakerSubject}
                  onChange={(e) => {
                    setSpeakerSubject(e.target.value);
                    setSpeakerSubjectCustomized(true);
                  }}
                  required
                  className="h-11 px-3.5 rounded-xl border border-border bg-slate-50/50 text-base sm:text-sm text-foreground focus:bg-white focus:outline-hidden font-medium"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Confirmation Message *
                </label>
                <textarea
                  value={speakerMessage}
                  onChange={(e) => setSpeakerMessage(e.target.value)}
                  rows={6}
                  required
                  className="p-3.5 rounded-xl border border-border bg-slate-50/50 text-base sm:text-sm text-foreground focus:bg-white focus:outline-hidden font-normal leading-relaxed resize-y"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Action Button Label (Optional)
                  </label>
                  <input
                    type="text"
                    value={speakerCtaText}
                    onChange={(e) => setSpeakerCtaText(e.target.value)}
                    placeholder="e.g. View Event Agenda"
                    className="h-11 px-3.5 rounded-xl border border-border bg-slate-50/50 text-base sm:text-sm text-foreground focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Action Button URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={speakerCtaUrl}
                    onChange={(e) => setSpeakerCtaUrl(e.target.value)}
                    placeholder="https://..."
                    className="h-11 px-3.5 rounded-xl border border-border bg-slate-50/50 text-base sm:text-sm text-foreground focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={sendingSpeakerMail}
                  className="w-full sm:w-auto h-12 px-6 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50 cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  <span>
                    {sendingSpeakerMail
                      ? "Sending Confirmation..."
                      : "Send Speaker Confirmation Mail"}
                  </span>
                </button>
              </div>
            </form>
          </div>

          {/* Live Speaker Preview Column */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Live Speaker Mail Preview
                </span>
                <span className="text-[11px] text-emerald-700 font-semibold">
                  Speaker Card HTML
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs bg-slate-50/50">
                <div className="flex h-1.5 w-full">
                  <div className="w-1/4 bg-[#4285F4]" />
                  <div className="w-1/4 bg-[#EA4335]" />
                  <div className="w-1/4 bg-[#FBBC04]" />
                  <div className="w-1/4 bg-[#34A853]" />
                </div>

                <div className="p-4 flex flex-col gap-3">
                  <div className="inline-block self-start px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-800 uppercase">
                    {eventTitle} &bull; Speaker Confirmation
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                    {speakerSubject || "Speaker Confirmation Subject"}
                  </h3>
                  <p className="text-xs font-semibold text-slate-800">
                    Dear {speakerName.trim() || "Speaker Name"},
                  </p>
                  <div className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                    {speakerMessage || "Confirmation details..."}
                  </div>

                  {/* Session Brief Preview Card */}
                  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden text-[11px]">
                    <div className="px-3 py-2 bg-blue-50 border-b border-blue-100 text-[10px] font-extrabold text-blue-700 uppercase tracking-wider">
                      Confirmed Talk &amp; Session Brief
                    </div>
                    <div className="divide-y divide-slate-100">
                      <div className="px-3 py-2 flex justify-between gap-2">
                        <span className="text-slate-500 font-semibold">Session</span>
                        <span className="text-slate-900 font-bold text-right">
                          {talkTitle.trim() || "Talk Title"}
                        </span>
                      </div>
                      <div className="px-3 py-2 flex justify-between gap-2">
                        <span className="text-slate-500 font-semibold">Speaker</span>
                        <span className="text-slate-900 font-bold text-right">
                          {speakerName.trim() || "Speaker"}
                          {speakerRole.trim() ? ` (${speakerRole.trim()})` : ""}
                        </span>
                      </div>
                      <div className="px-3 py-2 flex justify-between gap-2">
                        <span className="text-slate-500 font-semibold">Format</span>
                        <span className="text-slate-900 font-semibold text-right">
                          {sessionFormat}
                        </span>
                      </div>
                      <div className="px-3 py-2 flex justify-between gap-2">
                        <span className="text-slate-500 font-semibold">Date &amp; Time</span>
                        <span className="text-slate-900 font-semibold text-right">
                          {sessionSlot || eventDatesText}
                        </span>
                      </div>
                      <div className="px-3 py-2 flex justify-between gap-2">
                        <span className="text-slate-500 font-semibold">Venue</span>
                        <span className="text-slate-900 font-semibold text-right">
                          {speakerVenue || eventLocation}
                        </span>
                      </div>
                    </div>
                  </div>

                  {speakerCtaText && speakerCtaUrl ? (
                    <div className="py-1 text-center">
                      <span className="inline-block px-4 py-2 rounded-lg bg-primary text-white font-bold text-xs shadow-xs">
                        {speakerCtaText}
                      </span>
                    </div>
                  ) : null}

                  <div className="pt-2 text-[10px] text-slate-400 border-t border-slate-200 text-center">
                    Google Developer Groups on Campus &middot; VCET Vasai
                  </div>
                </div>
              </div>
            </div>

            {confirmedSpeakerLogs.length > 0 ? (
              <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Sent Speaker Confirmations ({confirmedSpeakerLogs.length})
                  </span>
                </div>
                <div className="divide-y divide-border/60">
                  {confirmedSpeakerLogs.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="py-2.5 flex items-start justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground truncate">
                          {entry.previewText || entry.subject}
                        </div>
                        <div className="font-mono text-[11px] text-foreground-muted truncate">
                          {entry.recipients.join(", ")}
                        </div>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold uppercase">
                        {entry.status === "simulated" ? "Simulated" : entry.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* TAB 3: INDIVIDUAL PASS RESEND */}
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
                              className={`text-[11px] font-bold mr-2 ${feedback.type === "success" ? "text-emerald-700" : "text-rose-600"
                                }`}
                            >
                              {feedback.text}
                            </span>
                          ) : null}
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleComposeToIndividual(reg)}
                              className="px-2.5 py-1.5 rounded-lg bg-surface-container text-foreground hover:bg-surface-container-high text-xs font-semibold border border-border transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                              title={`Compose custom email or revocation notice to ${reg.fullName}`}
                            >
                              <span className="material-symbols-outlined text-[14px] text-primary">edit_note</span>
                              <span>Compose</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenPassPreview(reg)}
                              className="p-1.5 rounded-lg bg-white text-foreground hover:text-primary hover:border-primary text-xs font-semibold border border-border transition-all cursor-pointer inline-flex items-center justify-center shadow-2xs"
                              title={`Preview QR Pass for ${reg.fullName} (${reg.referenceId})`}
                              aria-label={`View QR Pass for ${reg.fullName}`}
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="7" height="7" rx="1" />
                                <rect x="14" y="3" width="7" height="7" rx="1" />
                                <rect x="3" y="14" width="7" height="7" rx="1" />
                                <path d="M14 14h3v3h-3z" />
                                <path d="M17 17h4v4h-4z" />
                                <path d="M14 20h1" />
                                <path d="M20 14v1" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSendSinglePass(reg)}
                              disabled={isSending}
                              className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-hover active:scale-95 transition-all disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="22" y1="2" x2="11" y2="13" />
                                <polygon points="22 2 15 22 11 13 2 9 22 2" />
                              </svg>
                              <span>{isSending ? "Sending..." : "Email Pass"}</span>
                            </button>
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
                              : log.type === "speaker"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
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
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${log.status === "sent"
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

      {/* Pass Preview Modal */}
      {previewPassReg ? (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px] flex items-center justify-center p-4"
          onClick={() => setPreviewPassReg(null)}
        >
          <div
            className="bg-white rounded-2xl border border-border shadow-2xl max-w-xl w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Google 4-color bar */}
            <div className="h-2 w-full grid grid-cols-4">
              <div className="bg-[#4285F4]" />
              <div className="bg-[#EA4335]" />
              <div className="bg-[#FBBC04]" />
              <div className="bg-[#34A853]" />
            </div>

            <div className="p-6 flex flex-col gap-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">
                    GDG on Campus VCET · Confirmed 4-Day Workshop Pass
                  </span>
                  <h3 className="text-xl font-bold text-foreground mt-1">
                    {eventTitle}
                  </h3>
                  <p className="text-xs text-foreground-muted mt-0.5">
                    {eventDatesText} · {eventLocation}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewPassReg(null)}
                  className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-container cursor-pointer"
                  aria-label="Close pass preview"
                >
                  ✕
                </button>
              </div>

              <div className="border-t border-border pt-5 flex flex-col sm:flex-row items-center sm:items-stretch justify-between gap-5">
                <div className="flex-1 flex flex-col gap-3 w-full">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
                      Confirmed Pass ID
                    </div>
                    <div className="mt-1 inline-flex px-3 py-1 rounded-lg bg-blue-50 border border-blue-200 font-mono text-sm font-extrabold text-primary">
                      #{previewPassReg.referenceId}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
                      Attendee
                    </div>
                    <div className="text-sm font-bold text-foreground">
                      {previewPassReg.fullName}
                    </div>
                    <div className="text-xs text-foreground-muted font-mono">
                      {previewPassReg.email}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
                      College &amp; Track
                    </div>
                    <div className="text-xs font-medium text-foreground">
                      {previewPassReg.college || "—"}
                    </div>
                    <div className="text-xs text-foreground-muted mt-0.5">
                      {[previewPassReg.department, previewPassReg.yearOfStudy]
                        .filter(Boolean)
                        .join(" · ") || "—"}{" "}
                      · <span className="font-semibold text-primary">{previewPassReg.track || "4-Day All-Access"}</span>
                    </div>
                  </div>
                </div>

                {/* QR Code Card */}
                <div className="shrink-0 flex flex-col items-center justify-center p-3.5 rounded-xl border border-border bg-surface-container-low/50">
                  {previewQrDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- QR data URL generated client-side
                    <img
                      src={previewQrDataUrl}
                      alt={`QR Code for ${previewPassReg.referenceId}`}
                      className="w-36 h-36 rounded-lg bg-white p-1 border border-border/60"
                    />
                  ) : (
                    <div className="w-36 h-36 flex items-center justify-center text-xs text-foreground-muted">
                      Generating QR…
                    </div>
                  )}
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mt-2">
                    Valid For All 4 Days
                  </span>
                </div>
              </div>

              <div className="border-t border-border pt-4 flex flex-wrap items-center justify-between gap-3">
                <span className="text-[11px] text-foreground-muted">
                  Scan this QR code at the Check-in Terminal to verify check-in.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewPassReg(null)}
                    className="px-3.5 py-2 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-surface-container cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadPreviewPdf}
                    disabled={downloadingPdf}
                    className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <span>{downloadingPdf ? "Generating PDF…" : "↓ Download Pass PDF"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
