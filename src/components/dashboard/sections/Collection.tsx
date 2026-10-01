"use client";

import { motion, useReducedMotion } from "motion/react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Card, CardHeader } from "@/components/ui/Card";
import { InfoTip } from "@/components/ui/InfoTip";
import { count, money, pct } from "@/lib/format";
import type { LoopReport } from "@/lib/types";
import { Section } from "../Section";

const ease = [0.16, 1, 0.3, 1] as const;

export function Collection({ report }: { report: LoopReport }) {
  const c = report.collection;
  const reduce = useReducedMotion();

  if (!c) {
    return (
      <Section id="collection" kicker="Collection" title="What your MRR will really collect">
        <Card className="p-8 text-center text-[13px] text-ink-3">These figures appear once your subscriptions finish syncing.</Card>
      </Section>
    );
  }

  const gross = c.grossMrr ?? 0;
  const afterChurn = c.churnAdjustment !== null ? gross - c.churnAdjustment : null;
  const afterFailed = afterChurn !== null && c.failedAdjustment !== null ? afterChurn - c.failedAdjustment : null;
  const steps = [
    { key: "gross", label: "Gross MRR", from: 0, to: gross, value: c.grossMrr, kind: "total" as const },
    {
      key: "churn",
      label: "Churn",
      rate: c.churnRate,
      from: afterChurn,
      to: gross,
      value: c.churnAdjustment,
      kind: "loss" as const,
      info: "Expected cancellations over the next month at the trailing 30-day churn rate.",
    },
    {
      key: "failed",
      label: "Failed payments",
      rate: c.failedPaymentRate,
      from: afterFailed,
      to: afterChurn,
      value: c.failedAdjustment,
      kind: "loss" as const,
      info: "Billing cycles that failed ÷ cycles attempted over the trailing 30 days.",
    },
    {
      key: "refund",
      label: "Refunds",
      rate: c.refundRate,
      from: c.trueMrr,
      to: afterFailed,
      value: c.refundAdjustment,
      kind: "loss" as const,
      info: "Refunds ÷ money received over the trailing 30 days.",
    },
    { key: "true", label: "True MRR", from: 0, to: c.trueMrr, value: c.trueMrr, kind: "result" as const },
  ];
  const max = Math.max(1, gross);
  const kept = c.trueMrr !== null && gross ? c.trueMrr / gross : null;

  return (
    <Section
      id="collection"
      kicker="Collection"
      title="What your MRR will really collect"
      description="Gross MRR after expected churn, failed payments and refunds, based on the trailing 30 days."
    >
      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="p-5 sm:p-7 lg:col-span-8" delay={0.05}>
          <CardHeader title="From gross to true MRR" />
          <div className="mt-6 flex flex-col gap-3.5">
            {steps.map((st, i) => {
              const missing = st.value === null || st.from === null || st.to === null;
              const left = missing ? 0 : (Math.min(st.from!, st.to!) / max) * 100;
              const width = missing ? 0 : (Math.abs(st.to! - st.from!) / max) * 100;
              const bg =
                st.kind === "loss"
                  ? "rgba(255,125,116,0.5)"
                  : st.kind === "result"
                    ? "linear-gradient(90deg, #6c5bf5, #a99dff)"
                    : "rgba(139,124,255,0.35)";
              return (
                <div key={st.key} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 sm:grid-cols-[150px_1fr_120px]">
                  <div className="flex items-center gap-1 text-[12.5px] text-ink-2">
                    {st.label}
                    {"info" in st && st.info && <InfoTip>{st.info}</InfoTip>}
                  </div>
                  <div className="relative order-last col-span-2 h-8 rounded-lg bg-white/[0.025] sm:order-none sm:col-span-1">
                    {missing ? (
                      <span className="absolute inset-0 flex items-center pl-3 text-[11.5px] text-ink-3">Not synced yet</span>
                    ) : (
                      <motion.div
                        className="absolute inset-y-0 rounded-md"
                        style={{ left: `${left}%`, background: bg }}
                        initial={{ width: reduce ? `${width}%` : "0%", opacity: reduce ? 1 : 0 }}
                        whileInView={{ width: `${width}%`, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: reduce ? 0 : 0.15 + i * 0.16, ease }}
                      />
                    )}
                  </div>
                  <div className="text-right">
                    <div className={`text-[14px] font-medium tnum ${st.kind === "loss" ? "text-bad" : st.kind === "result" ? "text-white" : "text-ink"}`}>
                      {st.kind === "loss" && st.value !== null ? "−" : ""}
                      {money(st.value)}
                    </div>
                    {"rate" in st && st.rate !== undefined && <div className="text-[11px] text-ink-3 tnum">{pct(st.rate)}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="flex flex-col gap-4 lg:col-span-4">
          <Card className="p-5 sm:p-6" delay={0.1}>
            <div className="text-[12.5px] text-ink-3">You keep</div>
            <AnimatedNumber value={kept} format="pct" className="mt-1 block text-[40px] font-semibold tracking-[-0.04em]" />
            <p className="text-[12.5px] text-ink-3">of gross MRR after all adjustments</p>
          </Card>
          <Card className="grid grid-cols-2 gap-x-4 gap-y-4 p-5 sm:p-6" delay={0.15}>
            <Fact label="Failed cycles" value={`${count(c.failedCycles)} / ${count(c.attemptedCycles)}`} />
            <Fact label="Failed contracts" value={count(c.failedContracts)} />
            <Fact label="MRR at risk" value={money(c.failedMrr)} />
            <Fact label="Active" value={count(c.active)} />
            <Fact label="Received (30d)" value={money(c.received)} />
            <Fact label="Refunded (30d)" value={money(c.refunds)} />
          </Card>
        </div>
      </div>
    </Section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11.5px] text-ink-3">{label}</div>
      <div className="mt-0.5 text-[15px] font-medium text-ink tnum">{value}</div>
    </div>
  );
}
