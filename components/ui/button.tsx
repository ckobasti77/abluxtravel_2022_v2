import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "ink" | "ghost-on-ink" | "text" | "danger";
export type ButtonSize = "md" | "sm";

type ButtonStyleProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  /** Trailing icon (arrow for navigation, paper plane for send). */
  icon?: ReactNode;
  /** Leading icon, for the rare case where it reads better first. */
  iconStart?: ReactNode;
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  block = false,
  className,
}: Pick<ButtonStyleProps, "variant" | "size" | "block"> & { className?: string }) {
  return cn("ui-btn", `ui-btn--${variant}`, size === "sm" && "ui-btn--sm", block && "ui-btn--block", className);
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonStyleProps & {
    /** Keeps the width, shows a spinner, sets aria-busy and swaps the label. */
    loading?: boolean;
    loadingLabel?: string;
  };

export function Button({
  variant,
  size,
  block,
  icon,
  iconStart,
  loading = false,
  loadingLabel = "Šaljemo…",
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, block, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? null : iconStart}
      <span>{loading ? loadingLabel : children}</span>
      {loading ? <span className="ui-spinner" aria-hidden="true" /> : icon}
    </button>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> &
  ButtonStyleProps & {
    /** Renders a non-interactive look-alike with aria-disabled (links cannot be disabled). */
    disabled?: boolean;
  };

/** A link that looks like a button (navigation, not actions). */
export function ButtonLink({ variant, size, block, icon, iconStart, disabled, className, children, ...rest }: ButtonLinkProps) {
  if (disabled) {
    return (
      <span className={buttonClasses({ variant, size, block, className })} aria-disabled="true" role="link">
        {iconStart}
        <span>{children}</span>
        {icon}
      </span>
    );
  }
  return (
    <Link className={buttonClasses({ variant, size, block, className })} {...rest}>
      {iconStart}
      <span>{children}</span>
      {icon}
    </Link>
  );
}

/** External link styled as a button (partner programs open in a new tab). */
export function ButtonAnchor({
  variant,
  size,
  block,
  icon,
  iconStart,
  className,
  children,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & ButtonStyleProps) {
  return (
    <a className={buttonClasses({ variant, size, block, className })} {...rest}>
      {iconStart}
      <span>{children}</span>
      {icon}
    </a>
  );
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Required: icon-only buttons need an accessible name. */
  label: string;
  children: ReactNode;
};

export function IconButton({ label, className, children, type = "button", ...rest }: IconButtonProps) {
  return (
    <button type={type} className={cn("ui-icon-btn", className)} aria-label={label} title={label} {...rest}>
      {children}
    </button>
  );
}
