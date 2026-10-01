"use client";

import { scaleLinear } from "d3-scale";
import { curveMonotoneX, line } from "d3-shape";
import { motion, useReducedMotion } from "motion/react";

/** Tiny trend line for stat tiles: de-emphasised history, accent at the end. */
export function Sparkline({ values, width = 96, height = 30, color = "var(--s1)" }: { values: (number | null)[]; width?: number; height?: number; color?: string }) {
  const reduce = useReducedMotion();
  const pts = values.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v !== null);
  if (pts.length < 2) return <div style={{ width, height }} />;
  const lo = Math.min(...pts.map((p) => p.v));
  const hi = Math.max(...pts.map((p) => p.v));
  const x = scaleLinear().domain([0, values.length - 1]).range([2, width - 4]);
  const y = scaleLinear().domain([lo, hi === lo ? lo + 1 : hi]).range([height - 3, 3]);
  const d = line<{ v: number; i: number }>().x((p) => x(p.i)).y((p) => y(p.v)).curve(curveMonotoneX)(pts) ?? "";
  const end = pts[pts.length - 1];
  return (
    <svg width={width} height={height} aria-hidden className="overflow-visible">
      <motion.path
        d={d}
        fill="none"
        stroke="var(--ink-3)"
        strokeOpacity={0.55}
        strokeWidth={1.5}
        strokeLinecap="round"
        initial={{ pathLength: reduce ? 1 : 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
      />
      <motion.circle
        cx={x(end.i)}
        cy={y(end.v)}
        r={3}
        fill={color}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: reduce ? 0 : 1.1, type: "spring", stiffness: 500, damping: 20 }}
        style={{ transformOrigin: `${x(end.i)}px ${y(end.v)}px` }}
      />
    </svg>
  );
}
