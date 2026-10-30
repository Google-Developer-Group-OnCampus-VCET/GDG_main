const LOGO_SRC = "/GDG-Lockup-1Line-Black_vMWBFT9.svg";
// Intrinsic SVG viewBox is 3003x300 (~10:1). The white cutouts in the mark
// are drawn as literal white shapes, not a transparent hole, so this asset
// only reads correctly on a white background.
const LOGO_RATIO = 3003 / 300;

export function GdgLogo({ className = "h-6" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static trusted SVG, no optimization needed
    <img
      src={LOGO_SRC}
      alt="Google Developer Groups"
      width={Math.round(24 * LOGO_RATIO)}
      height={24}
      className={`w-auto ${className}`}
    />
  );
}
