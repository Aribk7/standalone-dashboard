"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

export const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "unit-economics", label: "Unit economics" },
  { id: "acquisition", label: "Acquisition" },
  { id: "growth", label: "Growth" },
  { id: "cohorts", label: "Cohorts" },
  { id: "products", label: "Products" },
  { id: "collection", label: "Collection" },
  { id: "store", label: "Store P&L" },
] as const;

/** Sticky in-page navigation that follows your scroll position. */
export function SectionNav() {
  const [active, setActive] = useState<string>(SECTIONS[0].id);
  const lock = useRef(false);
  const bar = useRef<HTMLDivElement>(null);

  // The active section is the last one whose top has scrolled under the bars.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      if (lock.current) return;
      let current: string = SECTIONS[0].id;
      for (const sec of SECTIONS) {
        const el = document.getElementById(sec.id);
        if (el && el.getBoundingClientRect().top <= 200) current = sec.id;
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = SECTIONS[SECTIONS.length - 1].id;
      setActive((a) => (a === current ? a : current));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  // Keep the active pill visible on narrow screens.
  useEffect(() => {
    const box = bar.current;
    const el = box?.querySelector<HTMLElement>(`[data-id="${active}"]`);
    if (box && el && box.scrollWidth > box.clientWidth) {
      box.scrollTo({ left: el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2, behavior: "smooth" });
    }
  }, [active]);

  const go = (id: string) => {
    setActive(id);
    lock.current = true;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => (lock.current = false), 900);
  };

  return (
    <nav
      aria-label="Sections"
      className="sticky top-[61px] z-30 -mx-4 mb-6 mt-2 bg-gradient-to-b from-bg via-bg/80 to-transparent px-4 pb-4 pt-2 sm:-mx-6 sm:px-6 max-sm:top-[118px]"
    >
      <div
        ref={bar}
        className="no-scrollbar inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-line bg-bg/75 p-1 backdrop-blur-2xl"
      >
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            data-id={s.id}
            onClick={() => go(s.id)}
            className={`relative shrink-0 rounded-xl px-3.5 py-1.5 text-[12.5px] font-medium transition-colors duration-200 ${
              active === s.id ? "text-white" : "text-ink-3 hover:text-ink-2"
            }`}
          >
            {active === s.id && (
              <motion.span
                layoutId="section-pill"
                className="absolute inset-0 -z-10 rounded-xl bg-accent/[0.16] ring-1 ring-inset ring-accent/30"
                transition={{ type: "spring", stiffness: 450, damping: 36 }}
              />
            )}
            {s.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
