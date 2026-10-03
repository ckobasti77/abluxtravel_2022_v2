"use client";

// Small building blocks for the admin screens (operate mode, app/styles/admin.css).
import { ArrowDown, ArrowUp, CircleAlert, Info, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button, Dialog, IconButton, Skeleton, useToastOutlet } from "../ui";
import { cn } from "../ui/cn";
import { formatMoney, useAdminT } from "../../lib/admin/format";

/** Short explanation under the top bar title, with the page actions on the right. */
export function PageIntro({ children, actions }: { children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="adm-intro">
      {children ? <p className="adm-intro__text">{children}</p> : <span />}
      {actions ? <div className="adm-intro__actions">{actions}</div> : null}
    </div>
  );
}

export function Panel({
  title,
  sub,
  actions,
  children,
  footer,
  flush = false,
  headingLevel: Heading = "h2",
  className,
  id,
}: {
  title?: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  flush?: boolean;
  headingLevel?: "h2" | "h3";
  className?: string;
  id?: string;
}) {
  return (
    <section className={cn("adm-panel", className)} id={id} aria-labelledby={title && id ? `${id}-title` : undefined}>
      {title || actions ? (
        <header className="adm-panel__head">
          <div>
            {title ? (
              <Heading className="adm-panel__title" id={id ? `${id}-title` : undefined}>
                {title}
              </Heading>
            ) : null}
            {sub ? <p className="adm-panel__sub">{sub}</p> : null}
          </div>
          {actions ? <div className="adm-row">{actions}</div> : null}
        </header>
      ) : null}
      <div className={cn("adm-panel__body", flush && "adm-panel__body--flush")}>{children}</div>
      {footer ? <footer className="adm-panel__foot">{footer}</footer> : null}
    </section>
  );
}

export function Stat({ label, value, meta, href }: { label: ReactNode; value: ReactNode; meta?: ReactNode; href?: string }) {
  const body = (
    <>
      <span className="adm-stat__label">{label}</span>
      <span className="adm-stat__value">{value}</span>
      {meta ? <span className="adm-stat__meta">{meta}</span> : null}
    </>
  );
  return href ? (
    <Link href={href} className="adm-stat">
      {body}
    </Link>
  ) : (
    <div className="adm-stat">{body}</div>
  );
}

/** Loading rows for tables and lists (decorative; the wrapper announces "Učitavanje…"). */
export function SkeletonRows({ rows = 6, label }: { rows?: number; label?: string }) {
  const { t } = useAdminT();
  return (
    <div className="adm-skel" aria-busy="true">
      <span className="ui-sr-only">{label ?? t("Učitavanje…", "Loading…")}</span>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} variant="text" width={index % 3 === 2 ? "62%" : "100%"} height="1.6rem" />
      ))}
    </div>
  );
}

export function Notice({ tone = "warn", children }: { tone?: "warn" | "info" | "error"; children: ReactNode }) {
  const Icon = tone === "info" ? Info : CircleAlert;
  return (
    <div className={cn("adm-notice", tone === "info" && "adm-notice--info", tone === "error" && "adm-notice--error")} role={tone === "error" ? "alert" : undefined}>
      <Icon aria-hidden="true" strokeWidth={1.5} />
      <div>{children}</div>
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
  hideLabel = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  hideLabel?: boolean;
}) {
  return (
    <label className="adm-switch" title={hideLabel ? label : undefined}>
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} aria-label={hideLabel ? label : undefined} />
      <span className="adm-switch__track" aria-hidden="true" />
      {hideLabel ? null : <span>{label}</span>}
    </label>
  );
}

export type SegmentOption<T extends string> = { value: T; label: string; count?: number };

/** Toggle buttons for one filter ("Sve · Novo · U obradi …"). */
export function Segment<T extends string>({ options, value, onChange, label }: { options: SegmentOption<T>[]; value: T; onChange: (value: T) => void; label: string }) {
  return (
    <div className="adm-segment" role="group" aria-label={label}>
      {options.map((option) => (
        <button key={option.value} type="button" className="adm-segment__btn" aria-pressed={option.value === value} onClick={() => onChange(option.value)}>
          <span>{option.label}</span>
          {typeof option.count === "number" ? <span className="adm-segment__count">{option.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

/**
 * Detail drawer: a native <dialog> on the right (full screen on phones).
 * Focus is trapped by the browser, Esc closes, focus returns to the trigger.
 */
export function Sheet({
  open,
  onClose,
  title,
  sub,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  sub?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const { t } = useAdminT();
  const ref = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const titleId = `sheet-${useId().replace(/:/g, "")}`;
  useToastOutlet(ref, open);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocus.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const handleClose = () => {
      returnFocus.current?.focus?.();
      if (open) onClose();
    };
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [open, onClose]);

  return (
    <dialog
      ref={ref}
      className={cn("adm-sheet", wide && "adm-sheet--wide")}
      aria-labelledby={titleId}
      onClick={(event) => {
        if (event.target === ref.current) ref.current?.close();
      }}
    >
      {open ? (
        <>
          <div className="adm-sheet__head">
            <div className="adm-sheet__titles">
              <h2 className="adm-sheet__title" id={titleId}>
                {title}
              </h2>
              {sub ? <p className="adm-sheet__sub">{sub}</p> : null}
            </div>
            <IconButton label={t("Zatvori", "Close")} onClick={() => ref.current?.close()}>
              <X aria-hidden="true" strokeWidth={1.5} />
            </IconButton>
          </div>
          <div className="adm-sheet__body">{children}</div>
          {footer ? <div className="adm-sheet__foot">{footer}</div> : null}
        </>
      ) : null}
    </dialog>
  );
}

type ConfirmOptions = {
  title: string;
  body?: ReactNode;
  confirmLabel: string;
  tone?: "danger" | "primary";
};

/** `const [confirm, confirmDialog] = useConfirm();` then `if (await confirm({...})) …` */
export function useConfirm(): [(options: ConfirmOptions) => Promise<boolean>, ReactNode] {
  const { t } = useAdminT();
  const [state, setState] = useState<(ConfirmOptions & { resolve: (value: boolean) => void }) | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setState({ ...options, resolve });
      }),
    []
  );

  const finish = useCallback(
    (value: boolean) => {
      setState((current) => {
        current?.resolve(value);
        return null;
      });
    },
    []
  );

  const element = (
    <Dialog
      open={Boolean(state)}
      onClose={() => finish(false)}
      title={state?.title ?? ""}
      description={typeof state?.body === "string" ? state.body : undefined}
      closeLabel={t("Zatvori", "Close")}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={() => finish(false)}>
            {t("Odustani", "Cancel")}
          </Button>
          <Button variant={state?.tone === "primary" ? "primary" : "danger"} size="sm" onClick={() => finish(true)}>
            {state?.confirmLabel ?? ""}
          </Button>
        </>
      }
    >
      {state?.body && typeof state.body !== "string" ? state.body : null}
    </Dialog>
  );

  return [confirm, element];
}

/** Ticks every `intervalMs` (countdowns, "pre 5 min"). */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

/** "150 € → 139 €" with a direction arrow (arrow + text, never color alone). */
export function PriceChange({ oldPrice, newPrice, currency = "EUR" }: { oldPrice?: number; newPrice?: number; currency?: string }) {
  const { t } = useAdminT();
  if (oldPrice === undefined && newPrice === undefined) return null;
  if (oldPrice === undefined || newPrice === undefined) return <span className="adm-nowrap tabular">{formatMoney(newPrice ?? oldPrice, currency)}</span>;
  const up = newPrice > oldPrice;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span className="adm-price-change">
      <s aria-label={t("staro", "old")}>{formatMoney(oldPrice, currency)}</s>
      <span aria-hidden="true">→</span>
      <span className={up ? "adm-up" : "adm-down"}>
        <Icon aria-hidden="true" strokeWidth={2} /> {formatMoney(newPrice, currency)}
      </span>
      <span className="ui-sr-only">{up ? t("(poskupljenje)", "(price up)") : t("(pojeftinjenje)", "(price down)")}</span>
    </span>
  );
}

/** Sticky bar above a table while rows are selected. */
export function BulkBar({ count, onClear, children }: { count: number; onClear: () => void; children: ReactNode }) {
  const { t, language } = useAdminT();
  if (count === 0) return null;
  const label = language === "en" ? `${count} selected` : `${count} ${count === 1 ? "izabrana" : count < 5 ? "izabrane" : "izabranih"}`;
  return (
    <div className="adm-bulk" role="region" aria-label={t("Radnje za izabrane", "Actions for selected")}>
      <span className="adm-bulk__count" aria-live="polite">
        {label}
      </span>
      {children}
      <Button size="sm" variant="secondary" onClick={onClear}>
        {t("Poništi izbor", "Clear selection")}
      </Button>
    </div>
  );
}

/**
 * Small admin image (partner hotlinks, Convex storage, local logos): plain
 * <img>, lazy, fixed size, no Vercel optimizer quota.
 */
export function Thumb({ src, width = 56, height = 42, className, alt = "" }: { src: string; width?: number; height?: number; className?: string; alt?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- admin thumbnails: hotlinked or storage images, no optimizer quota
    <img className={cn("adm-thumb", className)} src={src} alt={alt} width={width} height={height} loading="lazy" decoding="async" style={{ width, height }} />
  );
}
