"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

export function Section({
  id,
  kicker,
  title,
  description,
  right,
  children,
}: {
  id: string;
  kicker: string;
  title: string;
  description?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-[130px] max-sm:scroll-mt-[175px]">
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mb-5 flex flex-wrap items-end justify-between gap-3"
      >
        <div>
          <div className="mb-1.5 text-[11.5px] font-medium uppercase tracking-[0.14em] text-accent-soft/80">{kicker}</div>
          <h2 className="text-[22px] font-semibold tracking-[-0.025em] text-ink sm:text-[24px]">{title}</h2>
          {description && <p className="mt-1 max-w-[640px] text-[13.5px] leading-relaxed text-ink-3">{description}</p>}
        </div>
        {right}
      </motion.header>
      {children}
    </section>
  );
}

/** A labelled figure with an animated value, used across sections. */
export function NotSynced({ what = "This figure" }: { what?: string }) {
  return <span className="text-[12.5px] text-ink-3">{what} appears once the source finishes syncing.</span>;
}
