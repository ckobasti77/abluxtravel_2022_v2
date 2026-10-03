"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { IconButton } from "./button";
import { cn } from "./cn";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Actions in the footer (sticky in the bottom sheet). */
  footer?: ReactNode;
  /** "dialog" is centered; "sheet" is a bottom sheet (mobile filters, inquiry form). */
  variant?: "dialog" | "sheet";
  closeLabel?: string;
  /** Close when the backdrop is clicked (default true; turn off for forms with unsaved input). */
  dismissible?: boolean;
  className?: string;
};

/**
 * Native <dialog> opened with showModal(): focus is trapped by the browser, Esc
 * closes, the rest of the page is inert, and focus returns to the trigger.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  variant = "dialog",
  closeLabel = "Zatvori",
  dismissible = true,
  className,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const titleId = `dialog-title-${useId().replace(/:/g, "")}`;
  const descriptionId = description ? `${titleId}-desc` : undefined;

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
      className={cn("ui-dialog", variant === "sheet" && "ui-sheet", className)}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClick={(event) => {
        if (dismissible && event.target === ref.current) ref.current?.close();
      }}
    >
      {variant === "sheet" ? <span className="ui-sheet__handle" aria-hidden="true" /> : null}
      <div className="ui-dialog__header">
        <h2 className="ui-dialog__title" id={titleId}>
          {title}
        </h2>
        <IconButton label={closeLabel} onClick={() => ref.current?.close()}>
          <X aria-hidden="true" strokeWidth={1.5} />
        </IconButton>
      </div>
      {description || children ? (
        <div className="ui-dialog__body">
          {description ? (
            <p className="ui-dialog__description" id={descriptionId}>
              {description}
            </p>
          ) : null}
          {children}
        </div>
      ) : null}
      {footer ? <div className="ui-dialog__footer">{footer}</div> : null}
    </dialog>
  );
}

/** Bottom sheet: the same dialog anchored to the bottom edge. */
export function Sheet(props: Omit<DialogProps, "variant">) {
  return <Dialog {...props} variant="sheet" />;
}
