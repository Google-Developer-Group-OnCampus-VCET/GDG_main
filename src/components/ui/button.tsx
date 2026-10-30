import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-(--radius-sm) font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-(--focus-ring) focus-visible:outline-offset-2 disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover",
  secondary:
    "bg-white text-primary border border-border hover:bg-surface-muted",
  ghost: "text-primary hover:bg-surface-muted",
};

const sizes: Record<Size, string> = {
  md: "h-11 px-5 text-[15px]",
  lg: "h-12 px-6 text-base",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
}

function classes(variant: Variant = "primary", size: Size = "md", className = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${className}`.trim();
}

type ButtonAsLink = CommonProps & { href: string } & Omit<
    ComponentPropsWithoutRef<typeof Link>,
    "href" | "className" | "children"
  >;

type ButtonAsButton = CommonProps &
  Omit<ComponentPropsWithoutRef<"button">, "className" | "children"> & {
    href?: undefined;
  };

export function Button(props: ButtonAsLink | ButtonAsButton) {
  if ("href" in props && props.href) {
    const { href, variant, size, children, className, ...rest } = props;
    return (
      <Link href={href} className={classes(variant, size, className)} {...rest}>
        {children}
      </Link>
    );
  }

  const { variant, size, children, className, type, ...rest } =
    props as ButtonAsButton;
  return (
    <button type={type ?? "button"} className={classes(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}
