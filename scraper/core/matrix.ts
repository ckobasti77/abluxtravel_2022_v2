// Period × unit price matrices (Astra, Hellena, Dunav, Mayak hotels, MARS
// pricelists, Nitravel villas) → Departure[]. Works on tableToMatrix output.
import type { MatrixCell } from "./html";
import { findDateTokens, inferSequence, toIso, type DayMonth, type YearOptions } from "./parse/dates";
import { parsePriceCell } from "./parse/prices";
import { diffDaysIso } from "./time";
import type { Availability, Board, Departure, PriceBasis, Transport } from "./types";

export type Period = { col: number; start: string; end?: string };

/** Periods from a header row: each cell holds a start date and optionally an end date. */
export function readPeriods(row: MatrixCell[] | string[], fromCol: number, opts: YearOptions): Period[] {
  const raw: { col: number; start: DayMonth; end?: DayMonth }[] = [];
  let lastText = "";
  row.forEach((cell, col) => {
    if (col < fromCol) return;
    const text = typeof cell === "string" ? cell : cell.text;
    if (text === lastText && raw.length > 0 && raw[raw.length - 1].col === col - 1) {
      // colspan duplicate of the previous header cell
      lastText = text;
      return;
    }
    lastText = text;
    const tokens = findDateTokens(text);
    if (tokens.length === 0) return;
    raw.push({ col, start: tokens[0], end: tokens[1] });
  });
  const starts = inferSequence(
    raw.map((p) => p.start),
    opts
  );
  return raw
    .map((p, index): Period | undefined => {
      const start = starts[index];
      if (!start) return undefined;
      let end: string | undefined;
      if (p.end) {
        const startYear = Number(start.slice(0, 4));
        const endYear = p.end.year ?? (p.end.month < p.start.month ? startYear + 1 : startYear);
        end = toIso(endYear, p.end.month, p.end.day);
      }
      return { col: p.col, start, end: end && end > start ? end : undefined };
    })
    .filter((p): p is Period => Boolean(p));
}

export type CellPrice = { price: number; priceOld?: number; marker?: string; note?: string } | null;

export type MatrixOptions = YearOptions & {
  periodRow: number;
  firstPeriodCol: number;
  nightsRow?: number;
  /** Rows holding unit prices (indexes into the matrix). */
  unitRows: number[];
  unitLabel: (row: MatrixCell[]) => string;
  basis: PriceBasis;
  transport?: Transport;
  board?: (row: MatrixCell[]) => Board | undefined;
  soldOut?: (cell: MatrixCell) => boolean;
  cellPrice?: (cell: MatrixCell) => CellPrice;
  defaultNights?: number;
  markerNote?: string;
};

export function matrixDepartures(matrix: MatrixCell[][], opts: MatrixOptions): Departure[] {
  const header = matrix[opts.periodRow];
  if (!header) return [];
  const periods = readPeriods(header, opts.firstPeriodCol, opts);
  const nightsRow = opts.nightsRow !== undefined ? matrix[opts.nightsRow] : undefined;
  const readCell: (cell: MatrixCell) => CellPrice = opts.cellPrice ?? ((cell: MatrixCell) => parsePriceCell(cell.text));
  const out: Departure[] = [];
  for (const rowIndex of opts.unitRows) {
    const row = matrix[rowIndex];
    if (!row) continue;
    const unit = opts.unitLabel(row).trim();
    if (!unit) continue;
    const board = opts.board?.(row);
    for (const period of periods) {
      const cell = row[period.col];
      if (!cell) continue;
      const price = readCell(cell);
      if (!price) continue;
      const nightsText = nightsRow?.[period.col]?.text ?? "";
      const nightsMatch = nightsText.match(/\d{1,2}/);
      const nights = nightsMatch
        ? Number(nightsMatch[0])
        : period.end
          ? diffDaysIso(period.start, period.end)
          : opts.defaultNights;
      const availability: Availability | undefined = opts.soldOut?.(cell) ? "sold_out" : undefined;
      const notes = [price.marker ? (opts.markerNote ? `* ${opts.markerNote}` : "*") : undefined, price.note]
        .filter(Boolean)
        .join(" ");
      out.push({
        date: period.start,
        endDate: period.end,
        nights: nights || undefined,
        unit,
        board,
        transport: opts.transport,
        price: price.price,
        priceOld: price.priceOld,
        basis: opts.basis,
        availability,
        note: notes ? notes.slice(0, 120) : undefined,
      });
    }
  }
  return out;
}
