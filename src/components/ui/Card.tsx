"use client";

import { motion } from "motion/react";
import { useCallback, type ReactNode } from "react";
import { InfoTip } from "./InfoTip";

interface Props {
  children: ReactNode;
  className?: string;
  delay?: number;
  glow?: boolean;
}

/** Surface with a cursor-following edge light and a soft entrance. */
export function Card({ children, className = "", delay = 0, glow = true }: Props) {
  const onMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.985 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      onPointerMove={glow ? onMove : undefined}
      data-glow={glow ? "" : undefined}
      className={`card ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function CardHeader({
  title,
  subtitle,
  info,
  right,
}: {
  title: string;
  subtitle?: ReactNode;
  info?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <h3 className="text-[14px] font-medium tracking-tight text-ink">{title}</h3>
          {info && <InfoTip>{info}</InfoTip>}
        </div>
        {subtitle && <p className="mt-0.5 text-[12.5px] text-ink-3">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
