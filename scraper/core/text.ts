// Pure text helpers (Serbian Latin aware). Safe for Convex V8 runtime.

const SERBIAN_FOLD: Record<string, string> = {
  đ: "dj",
  Đ: "dj",
  č: "c",
  Č: "c",
  ć: "c",
  Ć: "c",
  š: "s",
  Š: "s",
  ž: "z",
  Ž: "z",
};

/** Lowercase, strip diacritics (đ → dj), collapse whitespace. For matching only. */
export function fold(value: string): string {
  return value
    .replace(/[đĐčČćĆšŠžŽ]/g, (char) => SERBIAN_FOLD[char] ?? char)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function slugify(value: string, maxLength = 80): string {
  const slug = fold(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length <= maxLength) return slug;
  const cut = slug.slice(0, maxLength);
  const lastDash = cut.lastIndexOf("-");
  return (lastDash > maxLength * 0.6 ? cut.slice(0, lastDash) : cut).replace(/-+$/g, "");
}

/** Title + place, without repeating a place the title already names ("Vila Strmec Ohrid"). */
export function offerSlugBase(title: string, place: string | undefined): string {
  const titleSlug = slugify(title, 70);
  const placeSlug = slugify(place ?? "", 70);
  return placeSlug && !`-${titleSlug}-`.includes(`-${placeSlug}-`) ? slugify(`${title} ${place}`, 70) : titleSlug;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  euro: "€",
  scaron: "š",
  Scaron: "Š",
  zcaron: "ž",
  Zcaron: "Ž",
  ccaron: "č",
  Ccaron: "Č",
  cacute: "ć",
  Cacute: "Ć",
  dstrok: "đ",
  Dstrok: "Đ",
  uuml: "ü",
  Uuml: "Ü",
  ouml: "ö",
  Ouml: "Ö",
  auml: "ä",
  Auml: "Ä",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  bdquo: "„",
  laquo: "«",
  raquo: "»",
  deg: "°",
  times: "×",
  frac12: "½",
};

export function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : match;
    }
    return NAMED_ENTITIES[code] ?? NAMED_ENTITIES[code.toLowerCase()] ?? match;
  });
}

/** Decode entities, turn nbsp into spaces and collapse whitespace. */
export function cleanText(value: string | undefined | null): string {
  if (!value) return "";
  return decodeEntities(value)
    .replace(/ /g, " ")
    .replace(/[ \t\r\f\v]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

/** Single-line version of cleanText. */
export function cleanLine(value: string | undefined | null): string {
  return cleanText(value).replace(/\s+/g, " ").trim();
}

export function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return value.slice(0, Math.max(0, max - 1)).trimEnd() + "…";
}

const KEEP_TOKEN = /^(\d+\/\d+|\d+\*+|[IVX]+|[A-Z]{1,3}\d*|\d+\w*)$/;
const SMALL_WORDS = new Set(["i", "u", "na", "sa", "od", "do", "za", "iz", "po", "the", "and", "of", "de", "la"]);

/**
 * Title-cases mostly-caps titles (≥ 70 % uppercase letters):
 * "KUĆA AKIS" → "Kuća Akis", "Hotel GRAND HOTEL BANSKO" → "Hotel Grand Hotel Bansko".
 * Mixed-case titles are returned unchanged.
 */
export function smartTitleCase(value: string): string {
  const letters = value.match(/\p{L}/gu) ?? [];
  if (letters.length === 0) return value;
  const upper = letters.filter((char) => char === char.toUpperCase() && char !== char.toLowerCase()).length;
  if (upper / letters.length < 0.7) return value;
  let index = 0;
  return value.replace(/[\p{L}\d*/'’]+/gu, (word) => {
    const first = index === 0;
    index += 1;
    if (/^[IVX]+$/.test(word) && word.length <= 4) return word;
    if (/\d/.test(word) && KEEP_TOKEN.test(word)) return word;
    const lower = word.toLowerCase();
    if (!first && SMALL_WORDS.has(lower)) return lower;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  });
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

/** Plain text (manual entry) → safe HTML paragraphs. */
export function textToHtml(value: string | undefined): string | undefined {
  const text = (value ?? "").trim();
  if (!text) return undefined;
  return text
    .split(/\n\s*\n/)
    .map((block) => `<p>${escapeHtml(block.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function uniqueStrings(values: (string | undefined | null)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = (value ?? "").trim();
    if (!trimmed) continue;
    const key = fold(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}
