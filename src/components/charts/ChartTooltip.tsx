"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

export interface TooltipRow {
  label: string;
  value: string;
  color?: string;
  shape?: "line" | "rect";
}

/** Floating readout. Values lead, labels follow; series keyed by a short stroke. */
export function ChartTooltip({
  x,
  y,
  width,
  title,
  rows,
  footer,
}: {
  x: number;
  y: number;
  width: number;
  title: string;
  rows: TooltipRow[];
  footer?: ReactNode;
}) {
  const flip = x > width - 200;
  const tx = flip ? x - 14 : x + 14;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, x: tx, y }}
      animate={{ opacity: 1, scale: 1, x: tx, y }}
      transition={{ opacity: { duration: 0.12 }, scale: { duration: 0.12 }, x: { type: "spring", stiffness: 700, damping: 45 }, y: { type: "spring", stiffness: 700, damping: 45 } }}
      className="pointer-events-none absolute left-0 top-0 z-20"
    >
      <div
        style={{ transform: flip ? "translateX(-100%)" : undefined }}
        className="min-w-[150px] rounded-xl border border-line-strong bg-[#16171c]/90 px-3 py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        <div className="mb-1.5 text-[11.5px] text-ink-3">{title}</div>
        <div className="flex flex-col gap-1">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center gap-2.5">
              {r.color && (
                <span
                  className={r.shape === "rect" ? "h-2.5 w-2.5 rounded-[3px]" : "h-[2px] w-3 rounded-full"}
                  style={{ background: r.color }}
                />
              )}
              <span className="text-[13.5px] font-semibold text-ink tnum">{r.value}</span>
              <span className="text-[12px] text-ink-3">{r.label}</span>
            </div>
          ))}
        </div>
        {footer && <div className="mt-1.5 border-t border-line pt-1.5 text-[11.5px] text-ink-3">{footer}</div>}
      </div>
    </motion.div>
  );
}
