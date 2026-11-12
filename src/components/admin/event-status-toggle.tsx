"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface EventStatusToggleProps {
  eventSlug: string;
  initialIsOpen: boolean;
  compact?: boolean;
}

export function EventStatusToggle({
  eventSlug,
  initialIsOpen,
  compact = false,
}: EventStatusToggleProps) {
  const router = useRouter();
  const [prevInitial, setPrevInitial] = useState(initialIsOpen);
  const [isOpen, setIsOpen] = useState(initialIsOpen);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (initialIsOpen !== prevInitial) {
    setPrevInitial(initialIsOpen);
    setIsOpen(initialIsOpen);
  }

  async function handleToggle() {
    if (loading) return;
    const nextState = !isOpen;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/events/${encodeURIComponent(eventSlug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRegistrationOpen: nextState }),
      });

      const data = (await res.json().catch(() => ({}))) as { message?: string };

      if (!res.ok) {
        setError(data.message || "Failed to update registration status.");
        setLoading(false);
        return;
      }

      setIsOpen(nextState);
      setLoading(false);
      router.refresh();
    } catch {
      setError("Network error while updating status.");
      setLoading(false);
    }
  }

  const sizeClasses = compact
    ? "px-2.5 py-1 text-[11px] gap-1.5"
    : "px-3.5 py-1.5 text-xs gap-2";

  const stateClasses = isOpen
    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
    : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100";

  const dotClasses = isOpen ? "bg-emerald-500" : "bg-rose-500";

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        aria-pressed={isOpen}
        title={error || (isOpen ? "Click to close registration" : "Click to open registration")}
        className={`inline-flex items-center rounded-full border font-semibold transition-all whitespace-nowrap cursor-pointer disabled:opacity-60 ${sizeClasses} ${stateClasses}`}
      >
        {loading ? (
          <svg
            className="w-3 h-3 animate-spin shrink-0"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
        ) : (
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClasses}`} />
        )}
        <span>
          {loading
            ? "Updating..."
            : isOpen
              ? "Registration Open"
              : "Registration Closed"}
        </span>
      </button>

      {error ? (
        <span role="alert" className="text-[11px] font-medium text-rose-600">
          {error}
        </span>
      ) : null}
    </div>
  );
}
