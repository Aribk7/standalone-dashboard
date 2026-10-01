"use client";

import { extent } from "d3-array";
import { scaleLinear } from "d3-scale";
import { area, curveMonotoneX, line } from "d3-shape";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useMemo, useState } from "react";
import { fmt, fullDate, shortDate, type FormatKind } from "@/lib/format";
import { useSize } from "@/lib/useSize";
import { ChartTooltip } from "./ChartTooltip";

export interface TimePoint {
  date: string;
  value: number | null;
}

interface Props {
  data: TimePoint[];
  format: FormatKind;
  label: string;
  color?: string;
  height?: number;
  /** Area wash under the line. */
  fill?: boolean;
  /** Start the y-axis at zero instead of fitting the data. */
  zero?: boolean;
  animationKey?: string;
}

const M = { top: 16, right: 14, bottom: 30, left: 56 };

export function TimeChart({ data, format, label, color = "var(--s1)", height = 260, fill = true, zero = false, animationKey }: Props) {
  const [ref, { width }] = useSize<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const reduce = useReducedMotion();
  const gid = useId().replace(/:/g, "");

  const geo = useMemo(() => {
    const w = Math.max(0, width - M.left - M.right);
    const h = height - M.top - M.bottom;
    const vals = data.map((d) => d.value).filter((v): v is number => v !== null);
    let [lo, hi] = extent(vals) as [number | undefined, number | undefined];
    lo ??= 0;
    hi ??= 1;
    if (zero) lo = Math.min(0, lo);
    if (lo === hi) {
      lo -= Math.abs(lo) * 0.1 || 1;
      hi += Math.abs(hi) * 0.1 || 1;
    }
    const pad = (hi - lo) * 0.12;
    const y = scaleLinear()
      .domain([zero ? lo : lo >= 0 ? Math.max(0, lo - pad) : lo - pad, hi + pad])
      .range([h, 0])
      .nice(4);
    const x = scaleLinear().domain([0, Math.max(1, data.length - 1)]).range([0, w]);
    const defined = (d: TimePoint) => d.value !== null;
    const lineD = line<TimePoint>().defined(defined).x((_, i) => x(i)).y((d) => y(d.value as number)).curve(curveMonotoneX)(data) ?? "";
    const areaD =
      area<TimePoint>().defined(defined).x((_, i) => x(i)).y0(h).y1((d) => y(d.value as number)).curve(curveMonotoneX)(data) ?? "";
    const yTicks = y.ticks(4);
    const xCount = Math.max(2, Math.min(6, Math.floor(w / 110)));
    const xTicks =
      data.length <= 1 ? [0] : Array.from({ length: xCount }, (_, i) => Math.round((i * (data.length - 1)) / (xCount - 1)));
    let lastIdx = -1;
    for (let i = data.length - 1; i >= 0; i--) if (data[i].value !== null) { lastIdx = i; break; }
    return { w, h, x, y, lineD, areaD, yTicks, xTicks: [...new Set(xTicks)], lastIdx };
  }, [data, width, height, zero]);

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round(geo.x.invert(e.clientX - r.left));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") setHover((h) => Math.min(data.length - 1, (h ?? -1) + 1));
    else if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? data.length) - 1));
    else if (e.key === "Escape") setHover(null);
  };

  const hv = hover !== null ? data[hover] : null;
  const last = geo.lastIdx >= 0 ? data[geo.lastIdx] : null;
  const draw = reduce ? { duration: 0 } : { duration: 1.3, ease: [0.16, 1, 0.3, 1] as const };

  return (
    <div ref={ref} className="relative w-full select-none" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} className="overflow-visible" role="img" aria-label={`${label} over time`}>
          <defs>
            <linearGradient id={`fill-${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
            <clipPath id={`clip-${gid}`}>
              <motion.rect
                key={animationKey}
                x={0}
                y={-10}
                height={geo.h + 20}
                initial={{ width: reduce ? geo.w + 10 : 0 }}
                animate={{ width: geo.w + 10 }}
                transition={draw}
              />
            </clipPath>
          </defs>
          <g transform={`translate(${M.left},${M.top})`}>
            {geo.yTicks.map((t) => (
              <g key={t} transform={`translate(0,${geo.y(t)})`}>
                <line x1={0} x2={geo.w} stroke="var(--grid)" strokeWidth={1} />
                <text x={-12} dy="0.32em" textAnchor="end" className="fill-ink-3 text-[11px] tnum">
                  {fmt(format === "money" || format === "moneyCents" ? "moneyCompact" : format === "count" ? "countCompact" : format, t)}
                </text>
              </g>
            ))}
            {geo.xTicks.map((i) => (
              <text
                key={i}
                x={geo.x(i)}
                y={geo.h + 20}
                textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}
                className="fill-ink-3 text-[11px]"
              >
                {data[i] ? shortDate(data[i].date) : ""}
              </text>
            ))}
            <g clipPath={`url(#clip-${gid})`}>
              {fill && <path d={geo.areaD} fill={`url(#fill-${gid})`} />}
              <path d={geo.lineD} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            </g>

            {last && last.value !== null && hover === null && (
              <motion.g
                key={`end-${animationKey}`}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: reduce ? 0 : 1.1, type: "spring", stiffness: 400, damping: 20 }}
                style={{ transformOrigin: `${geo.x(geo.lastIdx)}px ${geo.y(last.value)}px` }}
              >
                {!reduce && (
                  <circle cx={geo.x(geo.lastIdx)} cy={geo.y(last.value)} r={4} fill={color} opacity={0.5}>
                    <animate attributeName="r" values="4;12;4" dur="2.4s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.45;0;0.45" dur="2.4s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle cx={geo.x(geo.lastIdx)} cy={geo.y(last.value)} r={4.5} fill={color} stroke="var(--surface)" strokeWidth={2} />
              </motion.g>
            )}

            <AnimatePresence>
              {hv && hover !== null && (
                <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                  <line x1={geo.x(hover)} x2={geo.x(hover)} y1={0} y2={geo.h} stroke="var(--line-strong)" strokeWidth={1} />
                  {hv.value !== null && (
                    <circle cx={geo.x(hover)} cy={geo.y(hv.value)} r={4.5} fill={color} stroke="var(--surface)" strokeWidth={2} />
                  )}
                </motion.g>
              )}
            </AnimatePresence>

            <rect
              width={geo.w}
              height={geo.h}
              fill="transparent"
              tabIndex={0}
              aria-label={`${label} chart. Use arrow keys to read values.`}
              onPointerMove={onMove}
              onPointerLeave={() => setHover(null)}
              onKeyDown={onKey}
              onBlur={() => setHover(null)}
              className="cursor-crosshair outline-none"
            />
          </g>
        </svg>
      )}
      {hv && hover !== null && (
        <ChartTooltip
          x={M.left + geo.x(hover)}
          y={M.top + (hv.value !== null ? geo.y(hv.value) : geo.h / 2) - 30}
          width={width}
          title={fullDate(hv.date)}
          rows={[{ label, value: fmt(format, hv.value), color, shape: "line" }]}
        />
      )}
    </div>
  );
}
