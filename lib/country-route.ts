const SERBIAN_CHAR_MAP: Record<string, string> = {
  "\u0110": "dj",
  "\u0111": "dj",
  "\u010C": "c",
  "\u010D": "c",
  "\u0106": "c",
  "\u0107": "c",
  "\u0160": "s",
  "\u0161": "s",
  "\u017D": "z",
  "\u017E": "z",
};

const titleCaseWord = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

const latinizeSerbianChars = (value: string) =>
  value.replace(
    /[\u0110\u0111\u010C\u010D\u0106\u0107\u0160\u0161\u017D\u017E]/g,
    (char) => SERBIAN_CHAR_MAP[char] ?? char
  );

export const toCountrySlug = (value: string) =>
  latinizeSerbianChars(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const fromCountrySlug = (slug: string) =>
  decodeURIComponent(slug)
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map(titleCaseWord)
    .join(" ");
