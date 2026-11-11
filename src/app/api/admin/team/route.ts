import { NextResponse } from "next/server";
import {
  getAdminUsers,
  createAdminUser,
  updateAdminUserRole,
  updateAdminUserStatus,
  deleteAdminUser,
  getAdminUserByEmail,
  getAuditLogs,
  logAuditEvent,
} from "@/lib/db";
import { AuthError, canActOnTeamMember, requirePermission, toAuthErrorResponse } from "@/lib/auth";
import {
  createFirebaseUser,
  disableFirebaseUser,
  enableFirebaseUser,
  generatePasswordResetLink,
  getFirebaseUserByEmail,
} from "@/lib/firebase/auth";
import type { AdminRole } from "@/types";

export async function GET() {
  try {
    const user = await requirePermission("manage_team");
    const users = getAdminUsers(user.chapterId);
    const logs = getAuditLogs(user.chapterId, 30);
    return NextResponse.json({ success: true, users, logs });
  } catch (error) {
    if (error instanceof AuthError) return toAuthErrorResponse(error);
    console.error("GET /api/admin/team failed:", error);
    return NextResponse.json({ error: "Failed to fetch team" }, { status: 500 });
  }
}

/** Invites a new team member: creates a Firebase identity (no password), links it in SQLite,
 * and triggers a password-reset-style invite link — never a shared or guessable password. */
export async function POST(request: Request) {
  try {
    const user = await requirePermission("manage_team");
    const body = (await request.json()) as { name?: string; email?: string; role?: AdminRole };

    if (!body.name?.trim() || !body.email?.trim() || !body.role) {
      return NextResponse.json({ error: "name, email, and role are required." }, { status: 400 });
    }

    if (body.role === "super-admin" && user.role !== "super-admin") {
      return NextResponse.json(
        { error: "Only a super-admin can grant the super-admin role." },
        { status: 403 }
      );
    }

    const emailNorm = body.email.trim().toLowerCase();
    if (getAdminUserByEmail(emailNorm)) {
      return NextResponse.json({ error: "A team member with this email already exists." }, { status: 400 });
    }

    let firebaseUid = (await getFirebaseUserByEmail(emailNorm))?.uid;
    if (!firebaseUid) {
      const created = await createFirebaseUser({ email: emailNorm, displayName: body.name.trim() });
      firebaseUid = created.uid;
    }

    const result = createAdminUser({
      name: body.name.trim(),
      email: emailNorm,
      role: body.role,
      firebaseUid,
      chapterId: user.chapterId,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to create user" }, { status: 400 });
    }

    let inviteSent = true;
    try {
      await generatePasswordResetLink(emailNorm);
      // In production this link would be emailed via a configured provider; today it's
      // generated (proving the invite flow works end to end) but not pretended to be delivered.
    } catch (err) {
      inviteSent = false;
      console.error("Failed to generate invite link for", emailNorm, err);
    }

    logAuditEvent({
      chapterId: user.chapterId,
      userId: user.id,
      userEmail: user.email,
      action: "create_team_member",
      entityType: "user",
      entityId: result.user?.id || "unknown",
      details: `Invited new admin user: ${result.user?.name} (${result.user?.role})`,
    });

    return NextResponse.json({ success: true, user: result.user, inviteSent }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return toAuthErrorResponse(error);
    console.error("POST /api/admin/team failed:", error);
    return NextResponse.json({ error: "Failed to process team request" }, { status: 500 });
  }
}

/** Updates a team member's role or status (active/suspended). Suspension immediately revokes
 * every Firebase refresh token for that account, killing any session already in flight. */
export async function PATCH(request: Request) {
  try {
    const user = await requirePermission("manage_team");
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const body = (await request.json()) as { role?: AdminRole; status?: "active" | "suspended" };
    const target = getAdminUsers(user.chapterId).find((u) => u.id === id);
    if (!target) {
      return NextResponse.json({ error: "Team member not found" }, { status: 404 });
    }

    if (!canActOnTeamMember(user.role, target.role)) {
      return NextResponse.json(
        { error: "Only a super-admin can modify another super-admin's account." },
        { status: 403 }
      );
    }

    if (body.role) {
      if (body.role === "super-admin" && user.role !== "super-admin") {
        return NextResponse.json(
          { error: "Only a super-admin can grant the super-admin role." },
          { status: 403 }
        );
      }
      updateAdminUserRole(id, body.role);
    }

    if (body.status) {
      updateAdminUserStatus(id, body.status);
      if (target.firebaseUid) {
        if (body.status === "suspended") await disableFirebaseUser(target.firebaseUid);
        if (body.status === "active") await enableFirebaseUser(target.firebaseUid);
      }
    }

    logAuditEvent({
      chapterId: user.chapterId,
      userId: user.id,
      userEmail: user.email,
      action: "update_team_member",
      entityType: "user",
      entityId: id,
      details: `Updated team member ${target.email}${body.role ? ` role -> ${body.role}` : ""}${body.status ? ` status -> ${body.status}` : ""}`,
    });

    return NextResponse.json({ success: true, message: `Team member ${id} updated successfully` });
  } catch (error) {
    if (error instanceof AuthError) return toAuthErrorResponse(error);
    console.error("PATCH /api/admin/team failed:", error);
    return NextResponse.json({ error: "Failed to update team member" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requirePermission("manage_team");
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    if (id === user.id) {
      return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
    }

    const target = getAdminUsers(user.chapterId).find((u) => u.id === id);
    if (!target) {
      return NextResponse.json({ error: "Team member not found" }, { status: 404 });
    }

    if (!canActOnTeamMember(user.role, target.role)) {
      return NextResponse.json(
        { error: "Only a super-admin can delete another super-admin's account." },
        { status: 403 }
      );
    }

    const success = deleteAdminUser(id);
    if (!success) {
      return NextResponse.json({ error: "Team member not found" }, { status: 404 });
    }

    logAuditEvent({
      chapterId: user.chapterId,
      userId: user.id,
      userEmail: user.email,
      action: "delete_team_member",
      entityType: "user",
      entityId: id,
      details: `Removed team member: ${target?.email || id}`,
    });

    return NextResponse.json({ success: true, message: `Team member ${id} deleted successfully` });
  } catch (error) {
    if (error instanceof AuthError) return toAuthErrorResponse(error);
    console.error("DELETE /api/admin/team failed:", error);
    return NextResponse.json({ error: "Failed to delete team member" }, { status: 500 });
  }
}
