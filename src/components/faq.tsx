"use client";

import { useId, useState } from "react";

export interface FaqItem {
  question: string;
  answer: string;
}

export function Faq({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const baseId = useId();

  return (
    <div className="flex flex-col divide-y divide-border rounded-(--radius-md) border border-border bg-surface">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        const panelId = `${baseId}-panel-${index}`;
        const buttonId = `${baseId}-button-${index}`;
        return (
          <div key={item.question}>
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-[15px] font-medium text-foreground hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-(--focus-ring) focus-visible:outline-offset-2 sm:text-base"
              >
                <span>{item.question}</span>
                <span aria-hidden="true" className={`shrink-0 transition-transform duration-150 ${isOpen ? "rotate-45" : ""}`}>
                  +
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isOpen}
              className="px-5 pb-4 text-[15px] leading-relaxed text-foreground-muted"
            >
              {item.answer}
            </div>
          </div>
        );
      })}
    </div>
  );
}
