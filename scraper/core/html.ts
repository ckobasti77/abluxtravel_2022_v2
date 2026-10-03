// HTML helpers on top of cheerio (Node only).
import { load, type CheerioAPI } from "cheerio";
import type { AnyNode, Element } from "domhandler";
import { cleanLine, cleanText } from "./text";

export type Cheerio$ = CheerioAPI;
export { load };

export type MatrixCell = { text: string; classes: string[]; html: string };

/** Table → rectangular matrix with colspan/rowspan expanded. */
export function tableToMatrix($: CheerioAPI, table: Element | AnyNode): MatrixCell[][] {
  const matrix: MatrixCell[][] = [];
  const pending: { col: number; rowsLeft: number; cell: MatrixCell }[] = [];
  const rows = $(table).find("tr").toArray();
  rows.forEach((row, rowIndex) => {
    // Skip rows of nested tables.
    if ($(row).closest("table").get(0) !== table) return;
    const out: MatrixCell[] = [];
    let col = 0;
    const takeSpanned = () => {
      let span = pending.find((p) => p.col === col && p.rowsLeft > 0);
      while (span) {
        out[col] = span.cell;
        span.rowsLeft -= 1;
        col += 1;
        span = pending.find((p) => p.col === col && p.rowsLeft > 0);
      }
    };
    takeSpanned();
    $(row)
      .children("td,th")
      .each((_, element) => {
        takeSpanned();
        const $cell = $(element);
        const lines = $cell.clone();
        lines.find("br").replaceWith(" ");
        const cell: MatrixCell = {
          text: cleanLine(lines.text()),
          classes: ($cell.attr("class") ?? "").split(/\s+/).filter(Boolean),
          html: $cell.html() ?? "",
        };
        const colspan = Math.min(Math.max(Number($cell.attr("colspan")) || 1, 1), 60);
        const rowspan = Math.min(Math.max(Number($cell.attr("rowspan")) || 1, 1), 200);
        for (let i = 0; i < colspan; i += 1) {
          out[col] = cell;
          if (rowspan > 1) pending.push({ col, rowsLeft: rowspan - 1, cell });
          col += 1;
        }
      });
    takeSpanned();
    for (let i = 0; i < out.length; i += 1) if (!out[i]) out[i] = { text: "", classes: [], html: "" };
    matrix.push(out);
    void rowIndex;
  });
  return matrix.filter((row) => row.length > 0);
}

export const matrixText = (matrix: MatrixCell[][]) => matrix.map((row) => row.map((cell) => cell.text));

export function absUrl(base: string, href: string | undefined | null): string | undefined {
  if (!href) return undefined;
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith("javascript:") || trimmed.startsWith("data:") || trimmed.startsWith("#")) return undefined;
  try {
    return new URL(trimmed, base).toString();
  } catch {
    return undefined;
  }
}

/** Remove WordPress size suffixes ("-150x150.jpg" → ".jpg"). */
export function cleanImageUrl(url: string): string {
  return url.replace(/-\d{2,4}x\d{2,4}(?=\.(jpe?g|png|webp|gif|avif)(\?|$))/i, "");
}

export function metaContent($: CheerioAPI, property: string): string | undefined {
  const value =
    $(`meta[property="${property}"]`).attr("content") ?? $(`meta[name="${property}"]`).attr("content");
  return value ? cleanLine(value) : undefined;
}

/** Items of the first list (or lines) after a heading matching `pattern`. */
export function listAfterHeading(text: string, pattern: RegExp, stop?: RegExp): string[] {
  const match = pattern.exec(text);
  if (!match) return [];
  let rest = text.slice(match.index + match[0].length);
  const stopAt = stop ? rest.search(stop) : -1;
  if (stopAt >= 0) rest = rest.slice(0, stopAt);
  return rest
    .split(/\n|•|·|\s-\s(?=[A-ZČĆŠŽĐ])/)
    .map((line) => cleanLine(line).replace(/^[-–•*·]\s*/, ""))
    .filter((line) => line.length > 2 && line.length <= 500)
    .slice(0, 60);
}

/** Text of an element with block boundaries preserved as newlines. */
export function blockText($: CheerioAPI, node: AnyNode | Element): string {
  const clone = $(node).clone();
  clone.find("script,style,noscript").remove();
  clone.find("br").replaceWith("\n");
  clone.find("p,div,li,tr,h1,h2,h3,h4,h5,h6,table,ul,ol").each((_, element) => {
    $(element).prepend("\n").append("\n");
  });
  return cleanText(clone.text());
}

/**
 * Extract a JSON value that follows `marker` (e.g. "TourDetailContainer.Prm.Tour =").
 * Brace matching respects strings and escapes.
 */
export function extractJsonAfterMarker(body: string, marker: string, from = 0): { json: unknown; end: number } | undefined {
  const at = body.indexOf(marker, from);
  if (at < 0) return undefined;
  let i = at + marker.length;
  while (i < body.length && /\s/.test(body[i])) i += 1;
  if (body[i] !== "{" && body[i] !== "[") return undefined;
  let depth = 0;
  let inString = false;
  for (let j = i; j < body.length; j += 1) {
    const char = body[j];
    if (inString) {
      if (char === "\\") j += 1;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{" || char === "[") depth += 1;
    else if (char === "}" || char === "]") {
      depth -= 1;
      if (depth === 0) {
        try {
          return { json: JSON.parse(body.slice(i, j + 1)), end: j + 1 };
        } catch {
          return undefined;
        }
      }
    }
  }
  return undefined;
}

/** True once the JSON after `marker` is complete in a partially read body. */
export function markerComplete(body: string, marker: string): boolean {
  return extractJsonAfterMarker(body, marker) !== undefined;
}

const DAY_HEADING = /^(?:[A-ZČĆŠŽĐa-zčćšžđ]+\s*\(\d{1,2}\.\d{1,2}\.?\)\s*)?(\d{1,2})\.?\s*(?:[-–]\s*\d{1,2}\.?\s*)?dan\b\s*[:.,–-]?\s*/i;

/**
 * Day-by-day program from block elements: a block whose text starts with
 * "1. dan", "1.DAN", "1-2. dan" or "Utorak (10.11) 1. dan:" opens a new day;
 * following blocks are appended to it.
 */
export function dayProgram($: CheerioAPI, root: AnyNode | Element | undefined): { day?: number; title: string; html: string }[] {
  if (!root) return [];
  const days: { day?: number; title: string; html: string }[] = [];
  const blocks = $(root)
    .find("p, h3, h4, h5, h6, li")
    .toArray()
    .filter((element) => $(element).find("p, h3, h4, h5, h6, li").length === 0);
  // A block may hold several days separated by <br> (WordPress editors).
  const lines = blocks.flatMap((block) => {
    const clone = $(block).clone();
    clone.find("br").replaceWith("\n");
    return clone
      .text()
      .split("\n")
      .map((line) => cleanLine(line))
      .filter(Boolean);
  });
  for (const text of lines) {
    const match = text.match(DAY_HEADING);
    if (match) {
      const rest = text.slice(match[0].length).trim();
      // first colon that is not part of a time ("15:00")
      const colon = rest.search(/(?<!\d):(?!\d)/);
      const titleTail = colon > 0 && colon < 80 ? rest.slice(0, colon) : rest.length <= 80 ? rest : "";
      const body = titleTail && colon > 0 ? rest.slice(colon + 1).trim() : titleTail ? "" : rest;
      days.push({
        day: Number(match[1]),
        title: `${match[1]}. dan${titleTail ? ` ${titleTail}` : ""}`.trim(),
        html: body ? `<p>${escapeForHtml(body)}</p>` : "",
      });
    } else if (days.length > 0 && days[days.length - 1].html.length < 7_000) {
      days[days.length - 1].html += `<p>${escapeForHtml(text)}</p>`;
    }
  }
  return days.slice(0, 40);
}

function escapeForHtml(text: string): string {
  return text.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]!);
}

/** Matrix layout detection for "period × unit" price tables. */
export function detectMatrixLayout(matrix: MatrixCell[][], countDates: (text: string) => number) {
  const periodRow = matrix.findIndex((row) => row.filter((cell) => countDates(cell.text) >= 1).length >= 2);
  if (periodRow < 0) return undefined;
  const firstPeriodCol = matrix[periodRow].findIndex((cell) => countDates(cell.text) >= 1);
  const nightsRow = matrix.findIndex(
    (row, index) => index !== periodRow && index <= periodRow + 1 && /no[cć]|nocenj|broj no/i.test(row[0]?.text ?? "") && row.some((cell) => /^\d{1,2}(\s*no)?/i.test(cell.text))
  );
  const numericNightsRow =
    nightsRow >= 0
      ? nightsRow
      : periodRow > 0 && matrix[periodRow - 1].slice(firstPeriodCol).filter((cell) => /^\d{1,2}$/.test(cell.text)).length >= 2
        ? periodRow - 1
        : -1;
  return { periodRow, firstPeriodCol, nightsRow: numericNightsRow >= 0 ? numericNightsRow : undefined };
}
