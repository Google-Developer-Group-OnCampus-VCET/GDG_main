import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { TextField } from "@/components/ui/text-field";
import { EmptyState } from "@/components/ui/empty-state";
import { Faq } from "@/components/faq";

export const metadata: Metadata = {
  title: "UI preview",
  robots: { index: false, follow: false },
};

export default function UiPreviewPage() {
  return (
    <div className="mx-auto flex max-w-(--container-max) flex-col gap-16 px-5 py-16 sm:px-8 lg:px-10">
      <div>
        <p className="text-sm font-medium text-status-warning">Development only — not linked from navigation, excluded from indexing.</p>
        <h1 className="mt-2 text-[34px] font-medium text-foreground">Component reference</h1>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-medium text-foreground">Typography</h2>
        <h1 className="text-[48px] font-medium leading-tight text-foreground">Heading / hero</h1>
        <h2 className="text-[32px] font-medium leading-tight text-foreground">Heading / section</h2>
        <p className="text-lg leading-relaxed text-foreground-muted">Body large — 18px</p>
        <p className="text-base leading-relaxed text-foreground-muted">Body — 16px</p>
        <p className="text-sm font-medium uppercase tracking-wide text-primary">Label / eyebrow</p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-medium text-foreground">Semantic colors</h2>
        <div className="flex flex-wrap gap-4">
          {[
            ["background", "bg-background border border-border"],
            ["surface-muted", "bg-surface-muted"],
            ["foreground", "bg-foreground"],
            ["foreground-muted", "bg-foreground-muted"],
            ["border", "bg-border"],
            ["primary", "bg-primary"],
            ["primary-decorative", "bg-primary-decorative"],
            ["status-error", "bg-status-error"],
            ["status-success", "bg-status-success"],
            ["status-warning", "bg-status-warning"],
          ].map(([label, cls]) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div className={`h-16 w-16 rounded-(--radius-sm) ${cls}`} />
              <p className="text-xs text-foreground-muted">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-medium text-foreground">Buttons</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-medium text-foreground">Chips</h2>
        <div className="flex flex-wrap gap-3">
          <Chip>Web</Chip>
          <Chip selected>AI / ML</Chip>
          <Chip>Cloud</Chip>
          <Chip>Android</Chip>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-medium text-foreground">Cards</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <p className="font-medium text-foreground">Card title</p>
            <p className="mt-2 text-sm text-foreground-muted">Supporting copy inside a card.</p>
          </Card>
          <Card>
            <p className="font-medium text-foreground">Card title</p>
            <p className="mt-2 text-sm text-foreground-muted">Supporting copy inside a card.</p>
          </Card>
          <Card>
            <p className="font-medium text-foreground">Card title</p>
            <p className="mt-2 text-sm text-foreground-muted">Supporting copy inside a card.</p>
          </Card>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-medium text-foreground">Fields</h2>
        <div className="max-w-sm">
          <TextField label="Search events" placeholder="Search by keyword" />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-medium text-foreground">Empty state</h2>
        <EmptyState title="Nothing here yet" description="An example of the empty-state pattern used across the site." />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-medium text-foreground">FAQ / accordion</h2>
        <Faq
          items={[
            { question: "Example question one", answer: "Example answer one." },
            { question: "Example question two", answer: "Example answer two." },
          ]}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-medium text-foreground">Focus states</h2>
        <p className="text-sm text-foreground-muted">Tab through the controls above to verify visible focus rings.</p>
      </section>
    </div>
  );
}
