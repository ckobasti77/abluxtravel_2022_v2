// Formats a price for display without ever throwing: legacy data may carry
// non-ISO currency labels such as "ДИН" or "din." (same aliases as convex/lib/pricing.ts).
const RSD_ALIASES = new Set(["RSD", "DIN", "DIN.", "ДИН", "ДИН.", "DINAR", "DINARA", "ДИНАР", "ДИНАРА"]);
const EUR_ALIASES = new Set(["EUR", "€", "EVRO", "EVRA", "ЕВРО", "ЕУР"]);

export function toCurrencyCode(value: string | undefined | null): string | null {
  const raw = (value ?? "").trim().toUpperCase();
  if (!raw) return null;
  if (RSD_ALIASES.has(raw)) return "RSD";
  if (EUR_ALIASES.has(raw)) return "EUR";
  return /^[A-Z]{3}$/.test(raw) ? raw : null;
}

export function formatMoney(
  amount: number,
  currency: string | undefined | null,
  locale: string,
  options: { maximumFractionDigits?: number } = {},
): string {
  const maximumFractionDigits = options.maximumFractionDigits ?? 0;
  const code = toCurrencyCode(currency);
  if (code) {
    try {
      return new Intl.NumberFormat(locale, { style: "currency", currency: code, maximumFractionDigits }).format(amount);
    } catch {
      // Unknown ISO code for this runtime: fall through to the plain format.
    }
  }
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits }).format(amount);
  return currency ? `${number} ${currency}` : number;
}
