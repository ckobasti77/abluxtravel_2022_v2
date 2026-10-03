// EUR price parsing for Serbian partner pages (pure).
import { cleanLine, fold } from "../text";

/** "1.234" → 1234, "1.234,50" → 1234.5, "1 365" → 1365, "234,5" → 234.5, "1772.22" → 1772.22. */
export function parseNumber(raw: string): number | undefined {
  let text = raw.replace(/[\s ]/g, "");
  if (!/\d/.test(text)) return undefined;
  if (/,\d{1,2}$/.test(text)) {
    text = text.replace(/\./g, "").replace(",", ".");
  } else if (/\.\d{3}(?!\d)/.test(text) && !/\.\d{1,2}$/.test(text)) {
    text = text.replace(/\./g, "").replace(/,/g, "");
  } else {
    text = text.replace(/,/g, "");
  }
  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
}

const NUMBER = String.raw`\d{1,3}(?:[.\s ]\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?`;
const CURRENCY = String.raw`€|eur(?:a|o)?\b|evra\b|euro\b`;
const AMOUNT_AFTER = new RegExp(String.raw`(${NUMBER})\s*(?:${CURRENCY})`, "gi");
const AMOUNT_BEFORE = new RegExp(String.raw`(?:${CURRENCY})\s*(${NUMBER})`, "gi");

/** Every EUR amount in the text, in order of appearance. */
export function parseAllEuro(text: string): number[] {
  const found: { index: number; value: number }[] = [];
  const seen = new Set<number>();
  for (const pattern of [AMOUNT_BEFORE, AMOUNT_AFTER]) {
    for (const match of text.matchAll(pattern)) {
      const index = match.index ?? 0;
      if (seen.has(index)) continue;
      const value = parseNumber(match[1]);
      if (value === undefined || value <= 0) continue;
      // Skip overlaps (e.g. "€ 172 € 112" matched both ways).
      if (found.some((item) => Math.abs(item.index - index) <= 2)) continue;
      seen.add(index);
      found.push({ index, value });
    }
  }
  return found.sort((a, b) => a.index - b.index).map((item) => item.value);
}

export function parseEuro(text: string): number | undefined {
  return parseAllEuro(text)[0];
}

/**
 * Old/new price pairs: "€ 172 € 112" → {priceOld 172, price 112};
 * "479 € PROMO CENA : 379 €" → {priceOld 479, price 379}; one amount → {price}.
 */
export function parseOldNew(text: string): { price: number; priceOld?: number } | undefined {
  const amounts = parseAllEuro(text);
  if (amounts.length === 0) return undefined;
  if (amounts.length >= 2 && amounts[1] < amounts[0]) return { price: amounts[1], priceOld: amounts[0] };
  return { price: amounts[0] };
}

export type PriceCell = { price: number; marker?: string; note?: string };

/** Matrix cell: "119*" → {119, "*"}; "-" / "/" / "" → null; "1000* 490*" → lower value + note. */
export function parsePriceCell(raw: string): PriceCell | null {
  const text = cleanLine(raw);
  if (!text || /^[-–—/x]+$/i.test(text)) return null;
  const numbers = [...text.matchAll(new RegExp(NUMBER, "g"))]
    .map((match) => parseNumber(match[0]))
    .filter((value): value is number => value !== undefined && value > 0);
  if (numbers.length === 0) return null;
  const price = Math.min(...numbers);
  const marker = /\*/.test(text) ? "*" : undefined;
  const note = numbers.length > 1 ? text : undefined;
  return { price, marker, note };
}

const ON_REQUEST = /na upit|dostupno na upit|cena na upit|hoteli se rade na upit|po upitu/;

export function isOnRequest(text: string | undefined): boolean {
  return Boolean(text) && ON_REQUEST.test(fold(text ?? ""));
}
