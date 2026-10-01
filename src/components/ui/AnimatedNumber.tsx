"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, useRef } from "react";
import { DASH, fmt, type FormatKind } from "@/lib/format";

interface Props {
  value: number | null | undefined;
  format: FormatKind;
  sign?: boolean;
  className?: string;
  duration?: number;
}

/** Counts smoothly from the previous value to the new one. */
export function AnimatedNumber({ value, format, sign, className, duration = 1.1 }: Props) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const first = useRef(true);
  const text = useTransform(mv, (v) => fmt(format, v, { sign }));

  useEffect(() => {
    if (value === null || value === undefined || !Number.isFinite(value)) return;
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration: first.current ? duration * 1.2 : duration * 0.75, ease: [0.16, 1, 0.3, 1] });
    first.current = false;
    return () => controls.stop();
  }, [value, reduce, mv, duration]);

  if (value === null || value === undefined || !Number.isFinite(value)) {
    return <span className={className}>{DASH}</span>;
  }
  return <motion.span className={className}>{text}</motion.span>;
}
