"use client";

import { Plus } from "lucide-react";
import { Button } from "../ui";

type Breadcrumb = {
  label: string;
  href?: string;
};

type ActionButton = {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
};

type AdminPageHeaderProps = {
  /** Kept for older editors; the top bar now shows where you are. */
  breadcrumbs?: Breadcrumb[];
  title: string;
  subtitle?: string;
  actions?: ActionButton[];
};

/**
 * Section header of the older content editors inside the step 13 shell. The
 * page title (h1) lives in the top bar, so this is an h2 with the actions.
 */
export default function AdminPageHeader({ title, subtitle, actions }: AdminPageHeaderProps) {
  return (
    <header className="adm-intro">
      <div className="min-w-0">
        <h2 className="adm-panel__title">{title}</h2>
        {subtitle ? <p className="adm-intro__text mt-1">{subtitle}</p> : null}
      </div>

      {actions && actions.length > 0 ? (
        <div className="adm-intro__actions">
          {actions.map((action, i) => (
            <Button
              key={i}
              size="sm"
              variant={action.variant === "secondary" ? "secondary" : "primary"}
              iconStart={<Plus aria-hidden="true" strokeWidth={1.75} />}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ))}
        </div>
      ) : null}
    </header>
  );
}
