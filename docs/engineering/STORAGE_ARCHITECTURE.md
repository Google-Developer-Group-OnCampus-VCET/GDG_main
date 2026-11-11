# Firebase Storage Architecture

## Flow

All uploads go through `POST /api/admin/upload` (`src/app/api/admin/upload/route.ts`) — there
is no direct client-to-bucket upload path, so the server is always the authority on who may
write what.

1. Client sends `multipart/form-data` with `file`, `entity` (`events | speakers | sponsors |
   chapters | resources`), and optionally `isPublic`.
2. The route checks `requirePermission()` mapped from `entity` (see
   `RBAC_PERMISSION_MATRIX.md`) **before** touching the file.
3. `src/lib/firebase/storage.ts#uploadFile`:
   - `validateUpload()` checks size (5 MB images / 20 MB PDFs), declared MIME type against an
     allowlist, and the actual byte signature (PNG/JPEG/WebP/AVIF magic bytes, `%PDF-` header)
     — a `.png` extension with HTML/script content inside fails validation.
   - Builds a path as `{public-assets|private-assets}/{entity}/{crypto.randomUUID()}.{ext}` —
     the client's filename is never used for the stored object name.
   - Uploads via the Admin SDK (`bucket.file(path).save(...)`), calls `makePublic()` only for
     `public-assets`.
4. The route returns `{ path, url }`; the caller (e.g. `event-builder-form.tsx` via the shared
   `FileUploadField` component) stores that URL/path in the existing `image`/`photo`/`logo`
   column — the database never stores binary content, only the pointer.

## Why Admin SDK, not Security Rules, for writes

`storage.rules` denies all direct client writes unconditionally (`allow write: if false`
everywhere) — the Admin SDK bypasses rules entirely by design, which is exactly why the
permission check has to happen in the route handler (step 2 above) and not be delegated to
rules. Public assets are readable by anyone (`allow read: if true` under `public-assets/**`);
private assets (e.g. a non-public resource attachment) are denied to all direct client reads —
serving a private asset to an authorized admin would need a signed URL or a proxying route,
neither of which exists yet (no feature currently needs to serve a private file back out).

## Wired example vs. remaining forms

`event-builder-form.tsx`'s banner field is fully wired end-to-end through
`FileUploadField` (`src/components/admin/file-upload-field.tsx`) as the one proven vertical
slice. **Speaker photo, sponsor logo, chapter logo, and resource attachment fields still take
a plain text URL and were not wired to this component in this pass** — adopting it there is a
mechanical repeat (same component, different `entity` value), not a new pattern to design, but
it was not completed here. Flagged explicitly rather than claimed done.

## Lifecycle rule (replace/delete ordering)

Documented, not yet implemented in a UI flow: upload the new object first, update the DB row,
and only delete the previous object after the DB write succeeds — never delete an object a
record still points to, and clean up an orphaned just-uploaded object if the DB write fails.
`deleteFile()` exists and is idempotent (a 404 from the bucket is swallowed) but no manager
view calls it yet when replacing an image, since none of the remaining forms were wired (see
above).
