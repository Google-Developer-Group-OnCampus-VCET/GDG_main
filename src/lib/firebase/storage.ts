import "server-only";

import crypto from "node:crypto";
import { getFirebaseAdminStorage } from "./admin";
import { firebaseClientConfig } from "./config";

export type UploadEntity = "events" | "speakers" | "sponsors" | "chapters" | "resources";

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

const ALLOWED_DOCUMENT_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

export interface UploadValidationError {
  code: "TOO_LARGE" | "UNSUPPORTED_TYPE" | "SIGNATURE_MISMATCH";
  message: string;
}

/** Validates size + declared MIME type + (for images) the actual file signature. */
export function validateUpload(
  buffer: Buffer,
  declaredMimeType: string,
  kind: "image" | "document"
): UploadValidationError | null {
  const allowed = kind === "image" ? ALLOWED_IMAGE_TYPES : ALLOWED_DOCUMENT_TYPES;
  const maxBytes = kind === "image" ? MAX_IMAGE_BYTES : MAX_DOCUMENT_BYTES;

  if (!(declaredMimeType in allowed)) {
    return { code: "UNSUPPORTED_TYPE", message: `Unsupported file type: ${declaredMimeType}` };
  }

  if (buffer.length > maxBytes) {
    return {
      code: "TOO_LARGE",
      message: `File exceeds the ${Math.round(maxBytes / (1024 * 1024))} MB limit.`,
    };
  }

  if (kind === "image" && !matchesImageSignature(buffer, declaredMimeType)) {
    return { code: "SIGNATURE_MISMATCH", message: "File content does not match its declared type." };
  }

  if (kind === "document" && declaredMimeType === "application/pdf" && !startsWithPdfHeader(buffer)) {
    return { code: "SIGNATURE_MISMATCH", message: "File content does not match its declared type." };
  }

  return null;
}

function startsWithPdfHeader(buffer: Buffer): boolean {
  return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
}

function matchesImageSignature(buffer: Buffer, mimeType: string): boolean {
  const bytes = buffer.subarray(0, 12);
  switch (mimeType) {
    case "image/jpeg":
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/png":
      return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case "image/webp":
      return bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
    case "image/avif":
      // AVIF is an ISO-BMFF container; signature lives in the "ftyp" box, not at byte 0.
      return bytes.subarray(4, 8).toString("ascii") === "ftyp";
    default:
      return false;
  }
}

function buildObjectPath(entity: UploadEntity, isPublic: boolean, extension: string): string {
  const prefix = isPublic ? "public-assets" : "private-assets";
  const filename = `${crypto.randomUUID()}.${extension}`;
  return `${prefix}/${entity}/${filename}`;
}

export interface UploadResult {
  path: string;
  publicUrl: string | null;
}

/**
 * Uploads a validated buffer to Firebase Storage under a structured, UUID-named path.
 * The caller (an API route) is responsible for checking session + permission before this
 * is ever reached — this function does not re-check authorization itself.
 */
export async function uploadFile(params: {
  buffer: Buffer;
  mimeType: string;
  entity: UploadEntity;
  isPublic: boolean;
  kind: "image" | "document";
}): Promise<UploadResult> {
  const validationError = validateUpload(params.buffer, params.mimeType, params.kind);
  if (validationError) {
    throw new Error(validationError.message);
  }

  const extension =
    (params.kind === "image" ? ALLOWED_IMAGE_TYPES : ALLOWED_DOCUMENT_TYPES)[params.mimeType];
  const path = buildObjectPath(params.entity, params.isPublic, extension);

  const bucket = getFirebaseAdminStorage().bucket();
  const file = bucket.file(path);
  await file.save(params.buffer, {
    contentType: params.mimeType,
    metadata: { cacheControl: "public, max-age=31536000, immutable" },
  });

  if (params.isPublic) {
    await file.makePublic();
  }

  const publicUrl = params.isPublic
    ? `https://storage.googleapis.com/${firebaseClientConfig.storageBucket}/${path}`
    : null;

  return { path, publicUrl };
}

/** Deletes an object by its stored path. Safe to call on an already-missing object. */
export async function deleteFile(path: string): Promise<void> {
  const bucket = getFirebaseAdminStorage().bucket();
  try {
    await bucket.file(path).delete();
  } catch (error) {
    const code = (error as { code?: number })?.code;
    if (code !== 404) throw error;
  }
}
