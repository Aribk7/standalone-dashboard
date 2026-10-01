"use client";

import type { ReactNode } from "react";
import { fmt, type FormatKind } from "@/lib/format";

export interface Column<T> {
  key: string;
  label: string;
  format?: FormatKind;
  value?: (row: T) => unknown;
  render?: (row: T) => ReactNode;
  align?: "left" | "right";
  className?: string;
}

/** Compact, scrollable table with aligned figures and a sticky header. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  maxHeight = 360,
  empty = "No data for this range.",
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, i: number) => string;
  maxHeight?: number;
  empty?: string;
}) {
  if (rows.length === 0) return <p className="py-10 text-center text-[13px] text-ink-3">{empty}</p>;
  return (
    <div className="-mx-1 overflow-auto rounded-xl" style={{ maxHeight }}>
      <table className="w-full border-separate border-spacing-0 text-[12.5px]">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={`sticky top-0 z-10 whitespace-nowrap border-b border-line bg-surface/95 px-3 py-2.5 font-medium text-ink-3 backdrop-blur ${
                  (c.align ?? (c.format ? "right" : "left")) === "right" ? "text-right" : "text-left"
                }`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={rowKey(r, i)} className="group">
              {columns.map((c) => {
                const right = (c.align ?? (c.format ? "right" : "left")) === "right";
                const raw = c.value ? c.value(r) : (r as Record<string, unknown>)[c.key];
                return (
                  <td
                    key={c.key}
                    className={`whitespace-nowrap border-b border-line/60 px-3 py-2 text-ink-2 transition-colors group-hover:bg-white/[0.025] group-hover:text-ink ${
                      right ? "text-right tnum" : "text-left"
                    } ${c.className ?? ""}`}
                  >
                    {c.render ? c.render(r) : c.format ? fmt(c.format, raw) : String(raw ?? "")}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
