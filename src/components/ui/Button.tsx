"use client";

import { motion, type HTMLMotionProps } from "motion/react";

type Variant = "primary" | "ghost" | "subtle";

interface Props extends HTMLMotionProps<"button"> {
  variant?: Variant;
  loading?: boolean;
}

const styles: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-[#9d90ff] to-[#6c5bf5] text-white shadow-[0_8px_30px_-8px_rgba(124,108,255,0.7),inset_0_1px_0_rgba(255,255,255,0.35)] hover:brightness-110",
  ghost: "text-ink-2 hover:text-ink hover:bg-white/[0.05]",
  subtle: "bg-white/[0.05] text-ink border border-line hover:bg-white/[0.08] hover:border-line-strong",
};

export function Button({ variant = "primary", loading, disabled, className = "", children, ...rest }: Props) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 600, damping: 30 }}
      disabled={disabled || loading}
      className={`relative inline-flex h-11 select-none items-center justify-center gap-2 overflow-hidden rounded-xl px-5 text-[14px] font-medium transition-[filter,background-color,color,border-color] duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
      {...rest}
    >
      {loading && (
        <motion.span
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut" }}
        />
      )}
      <span className="relative inline-flex items-center gap-2">{children as React.ReactNode}</span>
    </motion.button>
  );
}
