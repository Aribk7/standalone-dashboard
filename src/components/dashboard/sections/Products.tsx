"use client";

import { motion, useReducedMotion } from "motion/react";
import { Card, CardHeader } from "@/components/ui/Card";
import { count } from "@/lib/format";
import type { LoopReport } from "@/lib/types";
import { Section } from "../Section";

export function Products({ report }: { report: LoopReport }) {
  const reduce = useReducedMotion();
  const s = report.summary;
  const rows = [...report.products].sort((a, b) => (b.units ?? 0) - (a.units ?? 0)).slice(0, 10);
  const max = Math.max(1, ...rows.map((r) => r.units ?? 0));

  return (
    <Section id="products" kicker="Volume" title="Top products">
      <Card className="h-full p-5 sm:p-7" delay={0.05}>
        <CardHeader
          title="Units committed per month"
          subtitle={`${count(s.unitsPerWeek)} units a week across active subscriptions`}
        />
        {rows.length === 0 ? (
          <p className="py-16 text-center text-[13px] text-ink-3">No subscription products yet.</p>
        ) : (
          <ol className="mt-6 flex flex-col gap-4">
            {rows.map((p, i) => {
              const w = ((p.units ?? 0) / max) * 100;
              return (
                <motion.li
                  key={p.key}
                  initial={{ opacity: 0, y: 6 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: reduce ? 0 : i * 0.05, duration: 0.45 }}
                >
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="flex min-w-0 items-baseline gap-2.5">
                      <span className="w-4 shrink-0 text-right text-[11.5px] text-ink-3 tnum">{i + 1}</span>
                      <span className="truncate text-ink">{p.title ?? p.key}</span>
                    </span>
                    <span className="shrink-0 text-ink-3">
                      <span className="font-medium text-ink tnum">{count(p.units)}</span> units · {count(p.subscriptions)} subs
                    </span>
                  </div>
                  <div className="ml-[26px] h-2 overflow-hidden rounded-full bg-white/[0.04]">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-[#6c5bf5] to-[#a99dff]"
                      initial={{ width: reduce ? `${w}%` : "0%" }}
                      whileInView={{ width: `${w}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: reduce ? 0 : 0.1 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </motion.li>
              );
            })}
          </ol>
        )}
      </Card>
    </Section>
  );
}
