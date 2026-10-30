export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      {eyebrow ? (
        <p className="text-sm font-medium uppercase tracking-wide text-primary">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-[28px] font-medium leading-tight text-foreground sm:text-[34px]">
        {title}
      </h2>
      {description ? (
        <p className="max-w-2xl text-base leading-relaxed text-foreground-muted sm:text-lg">
          {description}
        </p>
      ) : null}
    </div>
  );
}
