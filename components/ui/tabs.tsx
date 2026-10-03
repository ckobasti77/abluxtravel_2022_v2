"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "./cn";

export type TabItem = {
  id: string;
  label: ReactNode;
  content: ReactNode;
  disabled?: boolean;
};

type TabsProps = {
  items: TabItem[];
  /** Accessible name of the tab list. */
  label: string;
  defaultValue?: string;
  value?: string;
  onChange?: (id: string) => void;
  className?: string;
};

/** WAI-ARIA tabs: roving tabindex, arrows/Home/End move and select. */
export function Tabs({ items, label, defaultValue, value, onChange, className }: TabsProps) {
  const baseId = useId().replace(/:/g, "");
  const firstEnabled = items.find((item) => !item.disabled)?.id ?? items[0]?.id;
  const [internal, setInternal] = useState(defaultValue ?? firstEnabled);
  const active = value ?? internal;
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const select = (id: string) => {
    if (value === undefined) setInternal(id);
    onChange?.(id);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const enabled = items.filter((item) => !item.disabled);
    const index = enabled.findIndex((item) => item.id === active);
    let next: TabItem | undefined;
    if (event.key === "ArrowRight") next = enabled[(index + 1) % enabled.length];
    else if (event.key === "ArrowLeft") next = enabled[(index - 1 + enabled.length) % enabled.length];
    else if (event.key === "Home") next = enabled[0];
    else if (event.key === "End") next = enabled[enabled.length - 1];
    if (!next) return;
    event.preventDefault();
    select(next.id);
    tabRefs.current[next.id]?.focus();
  };

  return (
    <div className={cn("ui-tabs", className)}>
      <div className="ui-tabs__list" role="tablist" aria-label={label} onKeyDown={onKeyDown}>
        {items.map((item) => {
          const selected = item.id === active;
          return (
            <button
              key={item.id}
              ref={(node) => {
                tabRefs.current[item.id] = node;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.id}`}
              aria-controls={`${baseId}-panel-${item.id}`}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              disabled={item.disabled}
              className="ui-tabs__tab"
              onClick={() => select(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`${baseId}-panel-${item.id}`}
          aria-labelledby={`${baseId}-tab-${item.id}`}
          hidden={item.id !== active}
          tabIndex={0}
          className="ui-tabs__panel"
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
