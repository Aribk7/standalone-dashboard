"use client";

import { motion } from "motion/react";

/** Loop mark: an animated ring that draws itself in. */
export function LoopMark({ size = 28, animate = true }: { size?: number; animate?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <defs>
        <linearGradient id="loop-g" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0" stopColor="#d9d4ff" />
          <stop offset="0.55" stopColor="#8b7cff" />
          <stop offset="1" stopColor="#5b48f0" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="12" stroke="rgba(255,255,255,0.08)" strokeWidth="3.5" />
      <motion.circle
        cx="16"
        cy="16"
        r="12"
        stroke="url(#loop-g)"
        strokeWidth="3.5"
        strokeLinecap="round"
        transform="rotate(-90 16 16)"
        initial={animate ? { pathLength: 0 } : false}
        animate={{ pathLength: 0.78 }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      />
      <motion.circle
        cx="16"
        cy="4"
        r="2.6"
        fill="#fff"
        initial={animate ? { scale: 0, opacity: 0 } : false}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.1, type: "spring", stiffness: 400, damping: 18 }}
        style={{ transformOrigin: "16px 4px" }}
      />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LoopMark />
      <span className="text-[15px] font-semibold tracking-tight">
        Loop <span className="text-ink-3 font-medium">Analytics</span>
      </span>
    </div>
  );
}
