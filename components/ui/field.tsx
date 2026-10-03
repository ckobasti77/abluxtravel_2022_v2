"use client";

import { ChevronDown, CircleAlert } from "lucide-react";
import {
  createContext,
  useContext,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "./cn";

type FieldContextValue = {
  id: string;
  describedBy?: string;
  invalid: boolean;
  required: boolean;
};

const FieldContext = createContext<FieldContextValue | null>(null);

export type FieldProps = {
  label: ReactNode;
  /** Help text below the control. */
  hint?: ReactNode;
  /** Error message: what happened and what to do next. Sets aria-invalid. */
  error?: ReactNode;
  required?: boolean;
  /** Text next to the label for required fields (never only "*"). */
  requiredLabel?: string;
  id?: string;
  className?: string;
  children: ReactNode;
};

/** Label above, control, then hint or error, all wired with aria-describedby. */
export function Field({
  label,
  hint,
  error,
  required = false,
  requiredLabel = "obavezno",
  id,
  className,
  children,
}: FieldProps) {
  const autoId = useId();
  const controlId = id ?? `field-${autoId}`;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <FieldContext.Provider value={{ id: controlId, describedBy, invalid: Boolean(error), required }}>
      <div className={cn("ui-field", className)}>
        <label className="ui-field__label" htmlFor={controlId}>
          {label}
          {required ? <span className="ui-field__req">{requiredLabel}</span> : null}
        </label>
        {children}
        {error ? (
          <p className="ui-field__error" id={errorId}>
            <CircleAlert aria-hidden="true" strokeWidth={1.75} />
            <span>{error}</span>
          </p>
        ) : null}
        {hint ? (
          <p className="ui-field__hint" id={hintId}>
            {hint}
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  );
}

function useFieldProps(props: { id?: string; "aria-describedby"?: string; "aria-invalid"?: unknown; required?: boolean }) {
  const field = useContext(FieldContext);
  return {
    id: props.id ?? field?.id,
    "aria-describedby": props["aria-describedby"] ?? field?.describedBy,
    "aria-invalid": (props["aria-invalid"] as boolean | undefined) ?? (field?.invalid || undefined),
    required: props.required ?? (field?.required || undefined),
  };
}

type BusyProps = {
  /** Shows a spinner in the field (e.g. options loading) and sets aria-busy. */
  loading?: boolean;
};

export function Input({ className, loading, ...props }: InputHTMLAttributes<HTMLInputElement> & BusyProps) {
  const fieldProps = useFieldProps(props);
  return (
    <span className="ui-field__control" data-busy={loading || undefined}>
      <input className={cn("ui-input", className)} {...props} {...fieldProps} aria-busy={loading || undefined} />
      {loading ? (
        <span className="ui-field__icon-end" aria-hidden="true">
          <span className="ui-spinner" />
        </span>
      ) : null}
    </span>
  );
}

export function Select({ className, loading, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & BusyProps) {
  const fieldProps = useFieldProps(props);
  return (
    <span className="ui-field__control">
      <select
        className={cn("ui-input ui-input--select", className)}
        {...props}
        {...fieldProps}
        aria-busy={loading || undefined}
      >
        {children}
      </select>
      <span className="ui-field__icon-end" aria-hidden="true">
        {loading ? <span className="ui-spinner" /> : <ChevronDown strokeWidth={1.5} />}
      </span>
    </span>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const fieldProps = useFieldProps(props);
  return (
    <span className="ui-field__control">
      <textarea className={cn("ui-input ui-input--textarea", className)} {...props} {...fieldProps} />
    </span>
  );
}
