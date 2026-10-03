/** Joins class names, skipping falsy values. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

const EUR_FORMAT = new Intl.NumberFormat("sr-Latn-RS", { maximumFractionDigits: 0 });

/** "1.290" — Serbian thousands separator; the caller adds the currency. */
export function formatAmount(value: number): string {
  return EUR_FORMAT.format(value);
}
