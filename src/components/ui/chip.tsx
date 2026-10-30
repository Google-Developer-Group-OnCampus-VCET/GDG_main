import type { ButtonHTMLAttributes } from "react";

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

export function Chip({ selected = false, className = "", ...rest }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={[
        "h-9 rounded-full border px-4 text-sm font-medium transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-(--focus-ring) focus-visible:outline-offset-2",
        selected
          ? "border-primary bg-primary text-on-primary"
          : "border-border bg-white text-foreground hover:bg-surface-muted",
        className,
      ].join(" ")}
      {...rest}
    />
  );
}
