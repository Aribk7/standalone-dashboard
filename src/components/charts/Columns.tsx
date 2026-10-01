"use client";

import { scaleBand, scaleLinear } from "d3-scale";
import { motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import { fmt, type FormatKind } from "@/lib/format";
import { useSize } from "@/lib/useSize";
import { ChartTooltip } from "./ChartTooltip";

export interface ColumnSeries {
  name: string;
  color: string;
  /** Colour for negative values (diverging); defaults to `color`. */
  negativeColor?: string;
}

export interface ColumnDatum {
  key: string;
  label: string;
  tooltipTitle?: string;
  values: (number | null)[];
}

interface Props {
  data: ColumnDatum[];
  series: ColumnSeries[];
  format: FormatKind;
  height?: number;
  animationKey?: string;
}

const M = { top: 14, right: 8, bottom: 30, left: 56 };
const MAX_BAR = 24;
const GAP = 2;
const R = 4;

/** Bar with a 4px rounded data-end and a square end on the baseline. */
function barPath(x: number, w: number, base: number, end: number): string {
  const hgt = Math.abs(base - end);
  if (hgt < 0.5) return "";
  const r = Math.min(R, w / 2, hgt);
  if (end < base) {
    return `M${x},${base}V${end + r}Q${x},${end} ${x + r},${end}H${x + w - r}Q${x + w},${end} ${x + w},${end + r}V${base}Z`;
  }
  return `M${x},${base}V${end - r}Q${x},${end} ${x + r},${end}H${x + w - r}Q${x + w},${end} ${x + w},${end - r}V${base}Z`;
}

export function Columns({ data, series, format, height = 240, animationKey }: Props) {
  const [ref, { width }] = useSize<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const reduce = useReducedMotion();

  const geo = useMemo(() => {
    const w = Math.max(0, width - M.left - M.right);
    const h = height - M.top - M.bottom;
    const all = data.flatMap((d) => d.values).filter((v): v is number => v !== null);
    const lo = Math.min(0, ...all);
    const hi = Math.max(0, ...all);
    const y = scaleLinear()
      .domain([lo, hi === lo ? lo + 1 : hi])
      .range([h, 0])
      .nice(4);
    const x = scaleBand<number>()
      .domain(data.map((_, i) => i))
      .range([0, w])
      .paddingInner(0.28)
      .paddingOuter(0.14);
    const n = series.length;
    const groupW = Math.min(x.bandwidth(), n * MAX_BAR + (n - 1) * GAP);
    const barW = Math.max(1, (groupW - (n - 1) * GAP) / n);
    const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(w / 64))));
    return { w, h, x, y, groupW, barW, labelEvery, y0: y(0) };
  }, [data, series.length, width, height]);

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    const step = geo.x.step();
    const i = Math.floor((px - geo.x(0)! + (step - geo.x.bandwidth()) / 2) / step);
    setHover(i >= 0 && i < data.length ? i : null);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") setHover((h) => Math.min(data.length - 1, (h ?? -1) + 1));
    else if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? data.length) - 1));
    else if (e.key === "Escape") setHover(null);
  };

  const stagger = reduce ? 0 : Math.min(0.025, 0.6 / Math.max(1, data.length));
  const hv = hover !== null ? data[hover] : null;

  return (
    <div ref={ref} className="relative w-full select-none" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} className="overflow-visible" role="img" aria-label={series.map((s) => s.name).join(" and ")}>
          <g transform={`translate(${M.left},${M.top})`}>
            {geo.y.ticks(4).map((t) => (
              <g key={t} transform={`translate(0,${geo.y(t)})`}>
                <line x1={0} x2={geo.w} stroke={t === 0 ? "var(--axis)" : "var(--grid)"} strokeWidth={1} />
                <text x={-12} dy="0.32em" textAnchor="end" className="fill-ink-3 text-[11px] tnum">
                  {fmt(format === "money" || format === "moneyCents" ? "moneyCompact" : format === "count" ? "countCompact" : format, t)}
                </text>
              </g>
            ))}

            {hover !== null && (
              <rect
                x={geo.x(hover)! - (geo.x.step() - geo.x.bandwidth()) / 2}
                width={geo.x.step()}
                y={0}
                height={geo.h}
                rx={8}
                fill="rgba(255,255,255,0.035)"
              />
            )}

            <g key={animationKey}>
              {data.map((d, i) => {
                const gx = geo.x(i)! + (geo.x.bandwidth() - geo.groupW) / 2;
                return d.values.map((v, s) => {
                  if (v === null) return null;
                  const ser = series[s];
                  const fill = v < 0 && ser.negativeColor ? ser.negativeColor : ser.color;
                  const bx = gx + s * (geo.barW + GAP);
                  const dim = hover !== null && hover !== i;
                  return (
                    <motion.path
                      key={`${d.key}-${s}`}
                      d={barPath(bx, geo.barW, geo.y0, geo.y(v))}
                      fill={fill}
                      initial={{ scaleY: reduce ? 1 : 0 }}
                      animate={{ scaleY: 1, opacity: dim ? 0.45 : 1 }}
                      transition={{
                        scaleY: { delay: i * stagger, duration: 0.7, ease: [0.16, 1, 0.3, 1] },
                        opacity: { duration: 0.15 },
                      }}
                      style={{ transformBox: "view-box", transformOrigin: `0px ${geo.y0 + M.top}px` }}
                    />
                  );
                });
              })}
            </g>

            {data.map((d, i) =>
              i % geo.labelEvery === 0 ? (
                <text
                  key={d.key}
                  x={geo.x(i)! + geo.x.bandwidth() / 2}
                  y={geo.h + 20}
                  textAnchor="middle"
                  className="fill-ink-3 text-[11px]"
                >
                  {d.label}
                </text>
              ) : null,
            )}

            <rect
              width={geo.w}
              height={geo.h}
              fill="transparent"
              tabIndex={0}
              aria-label="Use arrow keys to read values"
              onPointerMove={onMove}
              onPointerLeave={() => setHover(null)}
              onKeyDown={onKey}
              onBlur={() => setHover(null)}
              className="outline-none"
            />
          </g>
        </svg>
      )}
      {hv && hover !== null && (
        <ChartTooltip
          x={M.left + geo.x(hover)! + geo.x.bandwidth() / 2}
          y={M.top + Math.min(...hv.values.map((v) => (v === null ? geo.h : geo.y(Math.max(0, v))))) - 20}
          width={width}
          title={hv.tooltipTitle ?? hv.label}
          rows={series.map((s, k) => ({
            label: s.name,
            value: fmt(format, hv.values[k], { sign: hv.values[k] !== null && hv.values[k]! < 0 ? false : undefined }),
            color: hv.values[k] !== null && hv.values[k]! < 0 && s.negativeColor ? s.negativeColor : s.color,
            shape: "rect",
          }))}
        />
      )}
    </div>
  );
}
