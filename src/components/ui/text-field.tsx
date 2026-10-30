import type { InputHTMLAttributes } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hideLabel?: boolean;
}

export function TextField({ label, hideLabel = false, id, className = "", ...rest }: TextFieldProps) {
  const inputId = id ?? `field-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className={hideLabel ? "sr-only" : "text-sm font-medium text-foreground"}>
        {label}
      </label>
      <input
        id={inputId}
        className={`h-11 rounded-(--radius-sm) border border-border bg-white px-4 text-[15px] text-foreground placeholder:text-foreground-muted focus-visible:outline-2 focus-visible:outline-(--focus-ring) focus-visible:outline-offset-2 ${className}`}
        {...rest}
      />
    </div>
  );
}
