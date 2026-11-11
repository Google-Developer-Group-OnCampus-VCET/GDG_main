import { describe, expect, it } from "vitest";
import { AuthError, canActOnTeamMember, hasPermission, sessionMaxAgeMs, toAuthErrorResponse } from "./index";

describe("AuthError / toAuthErrorResponse", () => {
  it("converts a 401 AuthError into a 401 JSON response", async () => {
    const res = toAuthErrorResponse(new AuthError(401, "Authentication required."));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Authentication required.");
  });

  it("converts a 403 AuthError into a 403 JSON response", async () => {
    const res = toAuthErrorResponse(new AuthError(403, "Missing required permission: manage_events"));
    expect(res.status).toBe(403);
  });

  it("rethrows anything that isn't an AuthError", () => {
    expect(() => toAuthErrorResponse(new Error("boom"))).toThrow("boom");
  });
});

describe("sessionMaxAgeMs", () => {
  it("defaults to 5 days when SESSION_MAX_AGE_DAYS is unset", () => {
    const original = process.env.SESSION_MAX_AGE_DAYS;
    delete process.env.SESSION_MAX_AGE_DAYS;
    expect(sessionMaxAgeMs()).toBe(5 * 24 * 60 * 60 * 1000);
    if (original !== undefined) process.env.SESSION_MAX_AGE_DAYS = original;
  });

  it("respects SESSION_MAX_AGE_DAYS when set", () => {
    const original = process.env.SESSION_MAX_AGE_DAYS;
    process.env.SESSION_MAX_AGE_DAYS = "2";
    expect(sessionMaxAgeMs()).toBe(2 * 24 * 60 * 60 * 1000);
    if (original !== undefined) {
      process.env.SESSION_MAX_AGE_DAYS = original;
    } else {
      delete process.env.SESSION_MAX_AGE_DAYS;
    }
  });
});

describe("hasPermission", () => {
  it("grants every permission to a role holding 'all'", () => {
    expect(hasPermission("super-admin", "manage_team")).toBe(true);
    expect(hasPermission("super-admin", "anything_not_in_the_list")).toBe(true);
  });

  it("scopes a check-in volunteer to attendance only", () => {
    expect(hasPermission("check-in-volunteer", "manage_attendance")).toBe(true);
    expect(hasPermission("check-in-volunteer", "manage_team")).toBe(false);
    expect(hasPermission("check-in-volunteer", "manage_settings")).toBe(false);
  });

  it("scopes an analytics viewer to read-only analytics", () => {
    expect(hasPermission("analytics-viewer", "view_analytics")).toBe(true);
    expect(hasPermission("analytics-viewer", "manage_events")).toBe(false);
  });
});

describe("canActOnTeamMember", () => {
  it("blocks a chapter-admin from acting on an existing super-admin", () => {
    expect(canActOnTeamMember("chapter-admin", "super-admin")).toBe(false);
  });

  it("blocks any non-super-admin role from acting on a super-admin", () => {
    expect(canActOnTeamMember("core-team", "super-admin")).toBe(false);
    expect(canActOnTeamMember("event-manager", "super-admin")).toBe(false);
  });

  it("allows a super-admin to act on another super-admin", () => {
    expect(canActOnTeamMember("super-admin", "super-admin")).toBe(true);
  });

  it("allows a chapter-admin to act on ordinary team members", () => {
    expect(canActOnTeamMember("chapter-admin", "core-team")).toBe(true);
    expect(canActOnTeamMember("chapter-admin", "event-manager")).toBe(true);
    expect(canActOnTeamMember("chapter-admin", "check-in-volunteer")).toBe(true);
  });
});
