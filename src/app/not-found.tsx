import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-(--container-max) flex-col items-start gap-4 px-5 py-24 sm:px-8 lg:px-10">
      <p className="text-sm font-medium uppercase tracking-wide text-primary">404</p>
      <h1 className="text-[32px] font-medium text-foreground">Page not found</h1>
      <p className="max-w-md text-[15px] leading-relaxed text-foreground-muted">
        The page you&rsquo;re looking for doesn&rsquo;t exist, or may have moved.
      </p>
      <Button href="/">Back to home</Button>
    </div>
  );
}
