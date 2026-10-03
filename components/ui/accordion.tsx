"use client";

import { ChevronDown } from "lucide-react";
import { useId, type ReactNode } from "react";
import { cn } from "./cn";

export type AccordionItem = {
  id: string;
  title: ReactNode;
  content: ReactNode;
  defaultOpen?: boolean;
  disabled?: boolean;
};

type AccordionProps = {
  items: AccordionItem[];
  /** Only one item open at a time (native exclusive <details name>). */
  exclusive?: boolean;
  className?: string;
};

/** Native <details>/<summary>: keyboard and screen reader support, works without JavaScript. */
export function Accordion({ items, exclusive = false, className }: AccordionProps) {
  const groupId = `accordion-${useId().replace(/:/g, "")}`;
  const group = exclusive ? groupId : undefined;
  return (
    <div className={cn("ui-accordion", className)}>
      {items.map((item) =>
        item.disabled ? (
          <div key={item.id} className="ui-accordion__item" aria-disabled="true">
            <div className="ui-accordion__summary">
              <span>{item.title}</span>
              <ChevronDown aria-hidden="true" strokeWidth={1.5} />
            </div>
          </div>
        ) : (
          <details key={item.id} className="ui-accordion__item" open={item.defaultOpen} name={group}>
            <summary className="ui-accordion__summary">
              <span>{item.title}</span>
              <ChevronDown aria-hidden="true" strokeWidth={1.5} />
            </summary>
            <div className="ui-accordion__content">{item.content}</div>
          </details>
        ),
      )}
    </div>
  );
}
