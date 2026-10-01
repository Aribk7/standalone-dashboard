"use client";

import { motion, useReducedMotion } from "motion/react";
import { Card, CardHeader } from "@/components/ui/Card";
import { count, money, monthLabel, pct } from "@/lib/format";
import type { LoopReport } from "@/lib/types";
import { Section } from "../Section";

export function Cohorts({ report }: { report: LoopReport }) {
  const reduce = useReducedMotion();
  const rows = [...report.cohorts].reverse();

  return (
    <Section id="cohorts" kicker="Retention" title="Signup cohorts">
      <Card className="h-full p-5 sm:p-7" delay={0.05}>
        <CardHeader
          title="Who's still subscribed"
          subtitle="Last 12 signup months"
          info="Retention is the share of each month's signups still active. Paid per subscriber is what the cohort has paid so far, per original signup."
        />
        {rows.length === 0 ? (
          <p className="py-16 text-center text-[13px] text-ink-3">No cohorts yet.</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[460px] border-separate border-spacing-y-1 text-[12.5px]">
              <thead>
                <tr className="text-ink-3">
                  <th className="pb-2 text-left font-medium">Cohort</th>
                  <th className="pb-2 text-right font-medium">Signups</th>
                  <th className="w-[38%] pb-2 pl-4 text-left font-medium">Retention</th>
                  <th className="pb-2 text-right font-medium">Paid / signup</th>
                  <th className="pb-2 text-right font-medium">Paid / active</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c, i) => {
                  const r = c.retention ?? 0;
                  return (
                    <motion.tr
                      key={c.month}
                      initial={{ opacity: 0, x: -8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: reduce ? 0 : i * 0.035, duration: 0.45 }}
                      className="group"
                    >
                      <td className="rounded-l-lg py-1.5 pl-2 text-ink-2 group-hover:bg-white/[0.03]">{monthLabel(c.month)}</td>
                      <td className="py-1.5 text-right text-ink-2 tnum group-hover:bg-white/[0.03]">{count(c.size)}</td>
                      <td className="py-1.5 pl-4 group-hover:bg-white/[0.03]">
                        <div className="flex items-center gap-2.5">
                          <div className="relative h-5 flex-1 overflow-hidden rounded-md bg-white/[0.04]">
                            <motion.div
                              className="absolute inset-y-0 left-0 rounded-md"
                              style={{
                                background: `linear-gradient(90deg, rgba(139,124,255,${0.35 + r * 0.45}), rgba(139,124,255,${0.55 + r * 0.45}))`,
                              }}
                              initial={{ width: reduce ? `${r * 100}%` : "0%" }}
                              whileInView={{ width: `${r * 100}%` }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.9, delay: reduce ? 0 : 0.1 + i * 0.035, ease: [0.16, 1, 0.3, 1] }}
                            />
                          </div>
                          <span className="w-10 text-right font-medium text-ink tnum">{pct(c.retention, { digits: 0 })}</span>
                        </div>
                      </td>
                      <td className="py-1.5 text-right text-ink-2 tnum group-hover:bg-white/[0.03]">{money(c.realizedLtv)}</td>
                      <td className="rounded-r-lg py-1.5 pr-2 text-right text-ink-2 tnum group-hover:bg-white/[0.03]">{money(c.activePaid)}</td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Section>
  );
}
