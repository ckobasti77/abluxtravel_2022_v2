import type { ReactNode } from "react";
import { cn } from "./cn";

export type DataTableColumn<Row> = {
  key: string;
  header: ReactNode;
  /** Plain-text header for the stacked mobile layout (defaults to header when it is a string). */
  label?: string;
  /** Numbers and dates are right-aligned and tabular. */
  align?: "start" | "end";
  render: (row: Row) => ReactNode;
};

type DataTableProps<Row> = {
  columns: DataTableColumn<Row>[];
  rows: Row[];
  getRowKey: (row: Row) => string;
  /** Visible caption (e.g. the NBS note under a price table). */
  caption?: ReactNode;
  /** Accessible name when there is no visible caption. */
  label?: string;
  empty?: ReactNode;
  selectedKeys?: ReadonlySet<string>;
  /** "compact" is admin density (40px rows; 44px on touch). */
  density?: "comfortable" | "compact";
  /** Public price tables: rows become label/value cards on phones. */
  stackOnMobile?: boolean;
  /** Max height of the scroll area; the header stays sticky inside it. */
  maxHeight?: string;
  className?: string;
};

/** Hairline table with a sticky header and tabular numerals. */
export function DataTable<Row>({
  columns,
  rows,
  getRowKey,
  caption,
  label,
  empty,
  selectedKeys,
  density = "comfortable",
  stackOnMobile = false,
  maxHeight,
  className,
}: DataTableProps<Row>) {
  return (
    <div
      className={cn("ui-table-wrap", stackOnMobile && "ui-table-wrap--stack", className)}
      style={maxHeight ? { maxHeight } : undefined}
      role={maxHeight ? "region" : undefined}
      aria-label={maxHeight ? label : undefined}
      tabIndex={maxHeight ? 0 : undefined}
    >
      <table
        className={cn("ui-table", density === "compact" && "ui-table--compact", stackOnMobile && "ui-table--stack")}
        aria-label={caption ? undefined : label}
      >
        {caption ? <caption>{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" data-align={column.align === "end" ? "end" : undefined}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="ui-table__empty" colSpan={columns.length}>
                {empty ?? "Nema stavki."}
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const key = getRowKey(row);
              const selected = selectedKeys?.has(key);
              return (
                <tr key={key} aria-selected={selectedKeys ? Boolean(selected) : undefined}>
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      data-align={column.align === "end" ? "end" : undefined}
                      data-label={column.label ?? (typeof column.header === "string" ? column.header : undefined)}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
