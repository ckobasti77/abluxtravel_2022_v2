"use client";

import { CircleAlert, CircleCheck, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { IconButton } from "./button";

export type ToastOptions = {
  message: ReactNode;
  tone?: "success" | "error";
  /** Undo and similar: the action runs, then the toast closes. */
  action?: { label: string; onAction: () => void };
  /** Milliseconds; 0 keeps it until closed. Default 6000 (10000 with an action). */
  duration?: number;
};

type ToastEntry = ToastOptions & { id: number };

type ToastContextValue = {
  show: (options: ToastOptions) => number;
  dismiss: (id: number) => void;
  /** Modal dialogs make the rest of the page inert; an open modal registers itself so toasts render inside it. */
  registerOutlet: (node: HTMLElement) => () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>");
  return context;
}

function ToastItem({ toast, onDismiss, closeLabel }: { toast: ToastEntry; onDismiss: (id: number) => void; closeLabel: string }) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(toast.duration ?? (toast.action ? 10000 : 6000));
  const startedAt = useRef(0);

  useEffect(() => {
    if (paused || remaining.current <= 0) return;
    startedAt.current = Date.now();
    const timer = window.setTimeout(() => onDismiss(toast.id), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current -= Date.now() - startedAt.current;
    };
  }, [paused, toast.id, onDismiss]);

  const Icon = toast.tone === "error" ? CircleAlert : CircleCheck;

  return (
    <div
      className={`ui-toast${toast.tone === "error" ? " ui-toast--error" : ""}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <Icon className="ui-toast__icon" aria-hidden="true" strokeWidth={1.75} />
      <p className="ui-toast__message">{toast.message}</p>
      {toast.action ? (
        <button
          type="button"
          className="ui-toast__action"
          onClick={() => {
            toast.action?.onAction();
            onDismiss(toast.id);
          }}
        >
          {toast.action.label}
        </button>
      ) : null}
      <IconButton label={closeLabel} onClick={() => onDismiss(toast.id)}>
        <X aria-hidden="true" strokeWidth={1.5} />
      </IconButton>
    </div>
  );
}

function region(toasts: ToastEntry[], dismiss: (id: number) => void, closeLabel: string) {
  return (
    <div className="ui-toaster" role="status" aria-live="polite" aria-relevant="additions">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} closeLabel={closeLabel} />
      ))}
    </div>
  );
}

/** While `open`, toasts render inside this modal element (otherwise they would sit under the inert backdrop). */
export function useToastOutlet(ref: { current: HTMLElement | null }, open: boolean) {
  const context = useContext(ToastContext);
  const register = context?.registerOutlet;
  useEffect(() => {
    if (!open || !ref.current || !register) return;
    return register(ref.current);
  }, [open, ref, register]);
}

/** Toast region (polite live region, bottom). Pauses while hovered or focused. */
export function ToastProvider({ children, closeLabel = "Zatvori obaveštenje" }: { children: ReactNode; closeLabel?: string }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const [outlets, setOutlets] = useState<HTMLElement[]>([]);
  const nextId = useRef(1);

  const registerOutlet = useCallback((node: HTMLElement) => {
    setOutlets((current) => [...current.filter((item) => item !== node), node]);
    return () => setOutlets((current) => current.filter((item) => item !== node));
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback((options: ToastOptions) => {
    const id = nextId.current++;
    setToasts((current) => [...current.slice(-2), { ...options, id }]);
    return id;
  }, []);

  const value = useMemo(() => ({ show, dismiss, registerOutlet }), [show, dismiss, registerOutlet]);
  const outlet = outlets[outlets.length - 1];

  return (
    <ToastContext.Provider value={value}>
      {children}
      {outlet ? createPortal(region(toasts, dismiss, closeLabel), outlet) : region(toasts, dismiss, closeLabel)}
    </ToastContext.Provider>
  );
}
