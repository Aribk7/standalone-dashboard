"use client";

import { motion } from "motion/react";
import { useId } from "react";

interface Props<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  onHover?: (v: T) => void;
  size?: "sm" | "md";
  label: string;
}

/** Segmented control with a sliding, springy selection pill. */
export function Segmented<T extends string>({ options, value, onChange, onHover, size = "md", label }: Props<T>) {
  const id = useId();
  const h = size === "md" ? "h-9 text-[13px] px-3.5" : "h-7 text-[12px] px-2.5";
  return (
    <div role="radiogroup" aria-label={label} className="relative inline-flex rounded-xl border border-line bg-surface/80 p-1 backdrop-blur-xl">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            onPointerEnter={() => onHover?.(o.value)}
            onFocus={() => onHover?.(o.value)}
            className={`relative z-0 rounded-lg font-medium tracking-tight transition-colors duration-200 ${h} ${
              active ? "text-white" : "text-ink-3 hover:text-ink-2"
            }`}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 -z-10 rounded-lg bg-gradient-to-b from-white/[0.14] to-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_2px_10px_rgba(0,0,0,0.4)]"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
