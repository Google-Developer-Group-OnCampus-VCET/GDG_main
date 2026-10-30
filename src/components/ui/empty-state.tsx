import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-(--radius-md) border border-dashed border-border bg-surface-muted px-6 py-12 text-center">
      <p className="text-lg font-medium text-foreground">{title}</p>
      <p className="max-w-md text-[15px] text-foreground-muted">{description}</p>
      {action}
    </div>
  );
}
