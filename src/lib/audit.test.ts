import { describe, it, expect, beforeEach } from "vitest";
import {
  logAuditEventAsync,
  getAuditLogsAsync,
  getDatabase,
  checkInAttendeeAsync,
  createRegistration,
} from "./db";
import { GET as getAuditLogsRoute } from "@/app/api/admin/audit-logs/route";
import { POST as checkInRoute } from "@/app/api/events/[slug]/check-in/route";
import { createAdminSessionToken, getAdminCookieOptions } from "./auth";
import type { AuditLogEntry } from "@/types";

describe("Security & Operations Audit Trail System", () => {
  const testSlug = "audit-test-event";

  beforeEach(async () => {
    // Clear test audit logs from SQLite
    const db = getDatabase();
    try {
      db.prepare("DELETE FROM audit_logs WHERE event_slug = 'audit-test-event'").run();
      db.prepare("DELETE FROM registrations WHERE event_slug = 'audit-test-event'").run();
      db.prepare("DELETE FROM events WHERE slug = 'audit-test-event'").run();
      db.prepare(`
        INSERT INTO events (id, slug, title, starts_at, capacity, is_registration_open)
        VALUES ('audit-test-id', 'audit-test-event', 'Audit Test Event', '2026-11-20T10:00:00Z', 200, 1)
      `).run();
    } catch {
      // ignore
    }
  });

  it("persists and retrieves audit log entries with timestamps and actors", async () => {
    const entry = await logAuditEventAsync({
      action: "AUTH_LOGIN",
      actorRole: "admin",
      actorIdentifier: "Master Admin",
      ipAddress: "192.168.1.10",
      eventSlug: "audit-test-event",
      details: { role: "admin", authMethod: "passcode" },
    });

    expect(entry.id).toBeDefined();
    expect(entry.timestamp).toBeDefined();
    expect(entry.action).toBe("AUTH_LOGIN");
    expect(entry.actorRole).toBe("admin");

    const logs = await getAuditLogsAsync({ eventSlug: "audit-test-event" });
    expect(logs.length).toBeGreaterThanOrEqual(1);

    const match = logs.find((l) => l.id === entry.id);
    expect(match).toBeDefined();
    expect(match?.actorIdentifier).toBe("Master Admin");
    expect(match?.details?.authMethod).toBe("passcode");
  });

  it("filters audit logs by action category", async () => {
    await logAuditEventAsync({
      action: "ATTENDEE_CHECK_IN",
      actorRole: "volunteer",
      actorIdentifier: "Volunteer Desk",
      eventSlug: "audit-test-event",
      details: { referenceId: "TEST-REF-001", day: 1 },
    });

    await logAuditEventAsync({
      action: "EVENT_UPDATE",
      actorRole: "admin",
      actorIdentifier: "Master Admin",
      eventSlug: "audit-test-event",
      details: { updatedFields: ["capacity"] },
    });

    const checkInLogs = await getAuditLogsAsync({
      eventSlug: "audit-test-event",
      action: "ATTENDEE_CHECK_IN",
    });

    expect(checkInLogs.every((l) => l.action === "ATTENDEE_CHECK_IN")).toBe(true);
    expect(checkInLogs.some((l) => l.details?.referenceId === "TEST-REF-001")).toBe(true);
  });

  it("records operator role during check-in API execution", async () => {
    // 1. Create a dummy registration
    const regResult = createRegistration(testSlug, {
      fullName: "Audit Attendee Test",
      email: `audit.attendee.${Date.now()}@vcet.edu.in`,
      phone: "+91 98765 43210",
      college: "VCET",
      department: "Computer Engineering",
      yearOfStudy: "TE (3rd Year)",
      track: "cloud-ops",
      experienceLevel: "intermediate",
      agreedToCoc: true,
    });

    expect(regResult.success).toBe(true);
    if (!regResult.success) return;

    const refId = regResult.registration.referenceId;

    // 2. Perform check-in via Volunteer session
    const volunteerToken = await createAdminSessionToken("volunteer");
    const cookieOpts = getAdminCookieOptions();

    const req = new Request(`http://localhost/api/events/${testSlug}/check-in`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `${cookieOpts.name}=${volunteerToken}`,
      },
      body: JSON.stringify({ referenceId: refId, day: 1 }),
    });

    const res = await checkInRoute(req, { params: Promise.resolve({ slug: testSlug }) });
    expect(res.status).toBe(200);

    // 3. Verify audit trail captured the check-in with Volunteer Desk role
    const logs = await getAuditLogsAsync({ eventSlug: testSlug, action: "ATTENDEE_CHECK_IN" });
    const checkInEntry = logs.find((l) => l.details?.referenceId === refId);

    expect(checkInEntry).toBeDefined();
    expect(checkInEntry?.actorRole).toBe("volunteer");
    expect(checkInEntry?.details?.attendeeName).toBe("Audit Attendee Test");
  });

  it("records duplicate scan blocked in audit trail when pass is rescanned on same day", async () => {
    const regResult = createRegistration(testSlug, {
      fullName: "Duplicate Audit Test",
      email: `duplicate.audit.${Date.now()}@vcet.edu.in`,
      phone: "+91 98765 43211",
      college: "VCET",
      department: "Information Technology",
      yearOfStudy: "BE (4th Year)",
      track: "ai-agents",
      experienceLevel: "advanced",
      agreedToCoc: true,
    });

    expect(regResult.success).toBe(true);
    if (!regResult.success) return;

    const refId = regResult.registration.referenceId;
    const volunteerToken = await createAdminSessionToken("volunteer");
    const cookieOpts = getAdminCookieOptions();

    // First check-in (Success)
    await checkInRoute(
      new Request(`http://localhost/api/events/${testSlug}/check-in`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `${cookieOpts.name}=${volunteerToken}`,
        },
        body: JSON.stringify({ referenceId: refId, day: 2 }),
      }),
      { params: Promise.resolve({ slug: testSlug }) }
    );

    // Second check-in on Day 2 (Duplicate Block)
    const duplicateRes = await checkInRoute(
      new Request(`http://localhost/api/events/${testSlug}/check-in`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `${cookieOpts.name}=${volunteerToken}`,
        },
        body: JSON.stringify({ referenceId: refId, day: 2 }),
      }),
      { params: Promise.resolve({ slug: testSlug }) }
    );

    expect(duplicateRes.status).toBe(409);

    // Verify duplicate attempt was logged to audit trail
    const logs = await getAuditLogsAsync({
      eventSlug: testSlug,
      action: "CHECK_IN_DUPLICATE_BLOCKED",
    });
    const blockEntry = logs.find((l) => l.details?.referenceId === refId);

    expect(blockEntry).toBeDefined();
    expect(blockEntry?.action).toBe("CHECK_IN_DUPLICATE_BLOCKED");
    expect(blockEntry?.details?.day).toBe(2);
  });

  it("enforces RBAC permissions on /api/admin/audit-logs", async () => {
    const cookieOpts = getAdminCookieOptions();

    // 1. Unauthenticated request -> 401
    const unauthReq = new Request("http://localhost/api/admin/audit-logs");
    const unauthRes = await getAuditLogsRoute(unauthReq);
    expect(unauthRes.status).toBe(401);

    // 2. Volunteer request -> 403 Forbidden
    const volToken = await createAdminSessionToken("volunteer");
    const volReq = new Request("http://localhost/api/admin/audit-logs", {
      headers: { Cookie: `${cookieOpts.name}=${volToken}` },
    });
    const volRes = await getAuditLogsRoute(volReq);
    expect(volRes.status).toBe(403);

    // 3. Core Member request -> 200 OK
    const coreToken = await createAdminSessionToken("core");
    const coreReq = new Request("http://localhost/api/admin/audit-logs", {
      headers: { Cookie: `${cookieOpts.name}=${coreToken}` },
    });
    const coreRes = await getAuditLogsRoute(coreReq);
    expect(coreRes.status).toBe(200);

    // 4. Master Admin request -> 200 OK
    const adminToken = await createAdminSessionToken("admin");
    const adminReq = new Request("http://localhost/api/admin/audit-logs", {
      headers: { Cookie: `${cookieOpts.name}=${adminToken}` },
    });
    const adminRes = await getAuditLogsRoute(adminReq);
    expect(adminRes.status).toBe(200);

    const data = await adminRes.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.logs)).toBe(true);
  });
});
