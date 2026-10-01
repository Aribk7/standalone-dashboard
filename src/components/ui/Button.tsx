"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import { useState } from "react";

type Variant = "primary" | "ghost" | "subtle";

interface Props extends HTMLMotionProps<"button"> {
  variant?: Variant;
  loading?: boolean;
}

const styles: Record<Variant, string> = {
  primary:
    "bg-[#7c6cff] bg-gradient-to-b from-[#9d90ff] to-[#6c5bf5] text-white shadow-[0_8px_30px_-8px_rgba(124,108,255,0.7),inset_0_1px_0_rgba(255,255,255,0.35)] hover:shadow-[0_10px_40px_-6px_rgba(124,108,255,0.95),inset_0_1px_0_rgba(255,255,255,0.4)] hover:brightness-110",
  ghost: "text-ink-2 hover:text-ink hover:bg-white/[0.05]",
  subtle: "bg-white/[0.05] text-ink border border-line hover:bg-white/[0.09] hover:border-line-strong",
};

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
}

/** Button with press, hover-lift and a ripple from the exact click point. */
export function Button({ variant = "primary", loading, disabled, className = "", children, onPointerDown, ...rest }: Props) {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const addRipple = (e: React.PointerEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2.2;
    const ripple = { id: Date.now() + Math.random(), x: e.clientX - r.left, y: e.clientY - r.top, size };
    setRipples((rs) => [...rs, ripple]);
    setTimeout(() => setRipples((rs) => rs.filter((x) => x.id !== ripple.id)), 650);
  };

  return (
    <motion.button
      whileHover={disabled || loading ? undefined : { y: -1 }}
      whileTap={disabled || loading ? undefined : { scale: 0.96, y: 0 }}
      transition={{ type: "spring", stiffness: 600, damping: 30 }}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onPointerDown={(e) => {
        if (!disabled && !loading) addRipple(e);
        onPointerDown?.(e);
      }}
      className={`relative inline-flex h-11 select-none items-center justify-center gap-2 overflow-hidden rounded-xl px-5 text-[14px] font-medium transition-[filter,background-color,color,border-color,box-shadow] duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
      {...rest}
    >
      {ripples.map((r) => (
        <span key={r.id} className="ripple" style={{ left: r.x, top: r.y, width: r.size, height: r.size, opacity: variant === "primary" ? undefined : 0.25 }} />
      ))}
      {loading && (
        <span className="absolute inset-0 overflow-hidden">
          <span className="loading-bar !bottom-auto !top-0 h-full !w-1/2 opacity-40" />
        </span>
      )}
      <span className="relative inline-flex items-center gap-2">
        {loading && <span className="spinner" aria-hidden />}
        {children as React.ReactNode}
      </span>
    </motion.button>
  );
}
