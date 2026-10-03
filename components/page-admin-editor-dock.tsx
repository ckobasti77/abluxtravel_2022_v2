"use client";

import Link from "next/link";
import { useSitePreferences } from "./site-preferences-provider";
import { ADMIN_SECTIONS, PAGE_EDITOR_CONFIG, PageEditorSlot } from "../lib/admin-editors";
import { useSession } from "../lib/use-session";

type PageAdminEditorDockProps = {
  slot: PageEditorSlot;
  className?: string;
  panelClassName?: string;
};

const cx = (...values: Array<string | undefined>) => values.filter(Boolean).join(" ");

export default function PageAdminEditorDock({
  slot,
  className,
  panelClassName,
}: PageAdminEditorDockProps) {
  const { language } = useSitePreferences();
  const session = useSession();

  if (!session?.isStaff) {
    return null;
  }

  const config = PAGE_EDITOR_CONFIG[slot];
  const adminSection = ADMIN_SECTIONS.find((item) => item.key === config.adminSection);
  const label = language === "sr" ? config.title.sr : config.title.en;
  const description = language === "sr" ? config.description.sr : config.description.en;
  // Staff-only pointer from a public page to the screen that edits it.
  return (
    <section className={className}>
      <div
        className={cx(
          "rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6",
          panelClassName
        )}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          {language === "sr" ? "Vidljivo samo osoblju" : "Visible to staff only"}
        </p>
        <h2 className="mt-2 text-xl font-semibold">{label}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{description}</p>
        {adminSection ? (
          <Link href={adminSection.href} className="btn-secondary mt-4">
            {language === "sr" ? "Otvori u administraciji" : "Open in admin"}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
