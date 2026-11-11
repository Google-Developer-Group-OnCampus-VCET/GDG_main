import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { hashPassword, hasPermission } from "./auth";
import {
  createEventAdmin,
  updateEventAdmin,
  duplicateEventAdmin,
  deleteEventAdmin,
  getEventBySlug,
  getCertificateById,
  issueCertificate,
  bulkIssueCertificates,
  updateCertificateStatus,
  getPublicResources,
  createResourceAdmin,
  deleteResourceAdmin,
  getChapterSettings,
  getPlatformAnalytics,
} from "./db";

describe("Administrative Operating System & Full-Stack Capabilities", () => {
  describe("1. Legacy Password Hashing & RBAC Matrix", () => {
    it("produces a salted scrypt hash distinct from the input, used only as an unusable NOT-NULL placeholder now that Firebase owns real authentication", () => {
      const raw = crypto.randomUUID();
      const hashed = hashPassword(raw);
      expect(hashed).toContain(":");
      expect(hashed).not.toBe(raw);
    });

    it("strictly enforces role-based access permissions across roles", () => {
      // Super admin has all permissions
      expect(hasPermission("super-admin", "manage_chapters")).toBe(true);
      expect(hasPermission("super-admin", "manage_settings")).toBe(true);

      // Chapter admin has full event and chapter management
      expect(hasPermission("chapter-admin", "manage_events")).toBe(true);
      expect(hasPermission("chapter-admin", "manage_team")).toBe(true);

      // Check-in volunteer only has attendance permission
      expect(hasPermission("check-in-volunteer", "manage_attendance")).toBe(true);
      expect(hasPermission("check-in-volunteer", "manage_events")).toBe(false);
      expect(hasPermission("check-in-volunteer", "manage_team")).toBe(false);
      expect(hasPermission("check-in-volunteer", "manage_settings")).toBe(false);
    });
  });

  describe("2. Event Lifecycle Management & Page Builder", () => {
    const testSlug = `test-hackathon-${Date.now()}`;

    it("creates, updates, duplicates, and deletes events", () => {
      // 1. Create event
      const createRes = createEventAdmin({
        slug: testSlug,
        title: "Test Campus Hackathon",
        category: "hackathon",
        visibility: "draft",
        capacity: 80,
        format: "in-person",
        location: "VCET Seminar Hall",
        topics: ["cloud", "ai-ml"],
      });
      expect(createRes.success).toBe(true);
      expect(createRes.event?.topics).toEqual(["cloud", "ai-ml"]);

      // 2. Query event — topics must round-trip through the DB, not come back as the old
      // hardcoded ["web", "cloud"] every event used to get regardless of what was saved.
      const fetched = getEventBySlug(testSlug);
      expect(fetched).not.toBeNull();
      expect(fetched?.title).toBe("Test Campus Hackathon");
      expect(fetched?.capacity).toBe(80);
      expect(fetched?.topics).toEqual(["cloud", "ai-ml"]);

      // 3. Update event
      const updated = updateEventAdmin(testSlug, { capacity: 100, visibility: "public", topics: ["android"] });
      expect(updated).toBe(true);
      expect(getEventBySlug(testSlug)?.capacity).toBe(100);
      expect(getEventBySlug(testSlug)?.topics).toEqual(["android"]);

      // 4. Duplicate event
      const dup = duplicateEventAdmin(testSlug);
      expect(dup.success).toBe(true);
      expect(dup.newSlug).toContain(`${testSlug}-copy`);

      // Clean up test events
      deleteEventAdmin(testSlug);
      if (dup.newSlug) deleteEventAdmin(dup.newSlug);

      expect(getEventBySlug(testSlug)).toBeNull();
    });
  });

  describe("3. Digital Certificates & Verification", () => {
    it("issues a verifiable certificate and verifies it by certificate ID", () => {
      const cert = issueCertificate({
        eventSlug: "devcraft-2025",
        eventTitle: "DevCraft 2025",
        recipientName: "Test Student",
        recipientEmail: "test.student@vcet.edu.in",
        referenceId: `GDG-TEST-${Date.now()}`,
        track: "Track A: Modern Web & Gemini AI",
      });

      expect(cert.certificateId).toBeDefined();

      // Look up by ID
      const verified = getCertificateById(cert.certificateId);
      expect(verified).not.toBeNull();
      expect(verified?.recipientName).toBe("Test Student");
      expect(verified?.status).toBe("issued");

      // Revoke certificate
      updateCertificateStatus(cert.certificateId, "revoked");
      const revoked = getCertificateById(cert.certificateId);
      expect(revoked?.status).toBe("revoked");
    });

    it("bulk-issues certificates to checked-in attendees", () => {
      const result = bulkIssueCertificates("devcraft-2025", true);
      expect(result.eventTitle).toBeDefined();
      expect(typeof result.count).toBe("number");
    });
  });

  describe("4. Community Resources Catalog", () => {
    it("creates, filters by public visibility, and deletes resources", () => {
      const res = createResourceAdmin({
        title: "Test Architecture Diagram",
        description: "Test diagram file",
        category: "docs",
        url: "https://github.com/gdg-vcet/test",
        isPublic: true,
      });

      expect(res.id).toBeDefined();

      const publicList = getPublicResources();
      expect(publicList.some((r) => r.title === "Test Architecture Diagram")).toBe(true);

      // Clean up
      deleteResourceAdmin(res.id);
    });
  });

  describe("5. Multi-Chapter Tenant Settings & Analytics", () => {
    it("retrieves chapter settings and isolates scoped queries", () => {
      const settings = getChapterSettings("gdg-vcet");
      expect(settings.id).toBe("gdg-vcet");
      expect(settings.name).toBe("GDG on Campus VCET");
      expect(settings.primaryColor).toBe("#1A73E8");

      const analytics = getPlatformAnalytics("gdg-vcet");
      expect(analytics.totalEvents).toBeGreaterThan(0);
      expect(analytics.totalRegistrations).toBeGreaterThanOrEqual(124);
      expect(analytics.departmentDistribution.length).toBeGreaterThan(0);
    });
  });
});
