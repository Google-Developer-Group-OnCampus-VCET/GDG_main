import { NextResponse } from "next/server";
import { logAuditEvent } from "@/lib/db";
import { AuthError, hasPermission, requireAuth, toAuthErrorResponse } from "@/lib/auth";
import { uploadFile, type UploadEntity } from "@/lib/firebase/storage";

const ENTITY_PERMISSIONS: Record<UploadEntity, string> = {
  events: "manage_events",
  speakers: "manage_speakers",
  sponsors: "manage_sponsors",
  chapters: "manage_settings",
  resources: "manage_resources",
};

const ENTITY_KIND: Record<UploadEntity, "image" | "document"> = {
  events: "image",
  speakers: "image",
  sponsors: "image",
  chapters: "image",
  resources: "document",
};

function isUploadEntity(value: string): value is UploadEntity {
  return value in ENTITY_PERMISSIONS;
}

export async function POST(request: Request) {
  try {
    // Require at least a valid session before buffering the request body — an
    // unauthenticated caller shouldn't be able to force the server to parse/hold
    // an uploaded file in memory. The fine-grained, per-entity permission check
    // still happens below once we know which entity was requested.
    const user = await requireAuth();

    const formData = await request.formData();
    const file = formData.get("file");
    const entity = formData.get("entity");
    const isPublicField = formData.get("isPublic");

    if (!(file instanceof File) || typeof entity !== "string" || !isUploadEntity(entity)) {
      return NextResponse.json({ error: "A file and a valid entity type are required." }, { status: 400 });
    }

    if (!hasPermission(user.role, ENTITY_PERMISSIONS[entity])) {
      throw new AuthError(403, `Missing required permission: ${ENTITY_PERMISSIONS[entity]}`);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const kind = ENTITY_KIND[entity];
    const isPublic = kind === "image" ? true : isPublicField !== "false";

    const result = await uploadFile({
      buffer,
      mimeType: file.type,
      entity,
      isPublic,
      kind,
    });

    logAuditEvent({
      chapterId: user.chapterId,
      userId: user.id,
      userEmail: user.email,
      action: "upload_file",
      entityType: entity,
      entityId: result.path,
      details: `Uploaded ${kind} for ${entity} (${file.type}, ${buffer.byteLength} bytes)`,
    });

    return NextResponse.json({ success: true, path: result.path, url: result.publicUrl });
  } catch (error) {
    if (error instanceof AuthError) return toAuthErrorResponse(error);
    const message = error instanceof Error ? error.message : "Upload failed.";
    console.error("POST /api/admin/upload failed:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
