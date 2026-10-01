"use client";

import { AnimatePresence, motion } from "motion/react";
import { Info } from "lucide-react";
import { useId, useRef, useState, type ReactNode } from "react";

/** Small (i) that explains how a figure is calculated. Hover, focus or tap. */
export function InfoTip({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(true);
  };
  const hide = () => {
    timer.current = setTimeout(() => setOpen(false), 80);
  };

  return (
    <span className="relative inline-flex" onPointerEnter={show} onPointerLeave={hide}>
      <button
        type="button"
        aria-describedby={open ? id : undefined}
        aria-label="How this is calculated"
        onFocus={show}
        onBlur={hide}
        onClick={() => setOpen((o) => !o)}
        className="grid h-5 w-5 place-items-center rounded-full text-ink-3/70 transition-colors hover:text-ink-2"
      >
        <Info size={13} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.span
            id={id}
            role="tooltip"
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 2, scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute left-1/2 top-full z-50 mt-2 w-[260px] -translate-x-1/2 rounded-xl border border-line-strong bg-[#17181d]/95 p-3 text-[12.5px] font-normal leading-relaxed text-ink-2 shadow-2xl backdrop-blur-xl"
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
