"use client";

import { useRef, useState } from "react";
import type { UploadEntity } from "@/lib/firebase/storage";

interface FileUploadFieldProps {
  label: string;
  entity: UploadEntity;
  value: string;
  onChange: (urlOrPath: string) => void;
  accept?: string;
}

/**
 * Uploads through POST /api/admin/upload (session + permission checked server-side),
 * then stores the returned public URL (or storage path, for private assets) in the
 * field the caller is managing. This is the one wired example of the Firebase Storage
 * upload flow — speaker photo / sponsor logo / chapter logo / resource attachment fields
 * should adopt this same component rather than re-implementing upload logic per form.
 */
export function FileUploadField({ label, entity, value, onChange, accept = "image/*" }: FileUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("entity", entity);

      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed.");
        return;
      }

      onChange(data.url || data.path);
    } catch {
      setError("Network error during upload.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-foreground">{label}</label>

      {value ? (
        <div className="flex items-center gap-3">
          {accept.startsWith("image") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-12 w-12 rounded-lg object-cover border border-border" />
          ) : (
            <span className="text-xs text-foreground-muted truncate max-w-[200px]">{value}</span>
          )}
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-xs text-status-error hover:underline"
          >
            Remove
          </button>
        </div>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={uploading}
        onChange={handleFileSelected}
        className="text-xs text-foreground-muted file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border file:border-border file:bg-surface-container-low file:text-xs file:font-semibold disabled:opacity-50"
      />

      {uploading ? <span className="text-[11px] text-foreground-muted">Uploading…</span> : null}
      {error ? <span className="text-[11px] text-status-error">{error}</span> : null}
    </div>
  );
}
