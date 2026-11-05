import crypto from "node:crypto";
import type { AdminRole, AdminUser } from "@/types";
import { getDatabase } from "@/lib/db";
export { ROLE_PERMISSIONS, hasPermission } from "./roles";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, combined: string): boolean {
  try {
    const [salt, key] = combined.split(":");
    if (!salt || !key) return false;
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(key, "hex"), Buffer.from(hash, "hex"));
  } catch {
    return false;
  }
}

export function createSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function createSession(userId: string): { token: string; expiresAt: string } {
  const db = getDatabase();
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  db.prepare(`
    INSERT INTO sessions (token, user_id, expires_at)
    VALUES (?, ?, ?)
  `).run(token, userId, expiresAt);

  return { token, expiresAt };
}

export function validateSession(token: string): { user: AdminUser; expiresAt: string } | null {
  if (!token) return null;
  const db = getDatabase();

  const sessionRow = db.prepare(`
    SELECT s.token, s.expires_at, u.id, u.chapter_id, u.name, u.email, u.role, u.avatar, u.status, u.created_at
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND u.status = 'active'
  `).get(token) as Record<string, unknown> | undefined;

  if (!sessionRow) return null;

  const expiresAt = sessionRow.expires_at as string;
  if (new Date(expiresAt).getTime() < Date.now()) {
    // Session expired, delete it
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }

  const user: AdminUser = {
    id: sessionRow.id as string,
    chapterId: sessionRow.chapter_id as string,
    name: sessionRow.name as string,
    email: sessionRow.email as string,
    role: sessionRow.role as AdminRole,
    avatar: (sessionRow.avatar as string) || undefined,
    status: sessionRow.status as "active" | "invited" | "suspended",
    createdAt: sessionRow.created_at as string,
  };

  return { user, expiresAt };
}

export function destroySession(token: string): void {
  if (!token) return;
  const db = getDatabase();
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}
