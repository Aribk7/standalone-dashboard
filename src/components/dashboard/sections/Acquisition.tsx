"use client";

import { motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import { Columns } from "@/components/charts/Columns";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Card, CardHeader } from "@/components/ui/Card";
import { InfoTip } from "@/components/ui/InfoTip";
import { Segmented } from "@/components/ui/Segmented";
import { money, monthLabel, months, multiple, pct, shortDate } from "@/lib/format";
import type { LoopReport } from "@/lib/types";
import { Section } from "../Section";
import { StatTile } from "../StatTile";

export function Acquisition({ report, animKey }: { report: LoopReport; animKey: string }) {
  const s = report.summary;
  const mvf = s.metaVsFulfillment;

  return (
    <Section
      id="acquisition"
      kicker="Advertising"
      title="Paid once, when the customer is won"
      description="What it costs to win a customer, and what they return over their lifetime."
    >
      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="p-5 sm:p-7 lg:col-span-5" delay={0.05}>
          <CardHeader
            title="Lifetime profit per customer"
            info="Lifetime contribution minus the cost to acquire one customer (CAC)."
          />
          <AnimatedNumber
            value={s.ltvProfit}
            format="money"
            className={`mt-3 block text-[44px] font-semibold leading-none tracking-[-0.045em] ${s.ltvProfit !== null && s.ltvProfit < 0 ? "text-bad" : "text-ink"}`}
          />
          <p className="mt-3 text-[13px] text-ink-3">
            <span className="text-ink-2">{multiple(s.ltvProfitRoas)}</span> lifetime contribution for every dollar of CAC
          </p>
          <Payback payback={s.paybackMonths} lifetime={s.lifetimeMonths} />
        </Card>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:col-span-7 lg:gap-4">
          <StatTile label="Meta spend" value={s.spend} format="money" delay={0.08} size="sm" />
          <StatTile label="New customers" value={s.newCustomers} format="count" sub="first orders of any kind" delay={0.11} size="sm" />
          <StatTile label="CAC" value={s.cac} format="moneyCents" info="Meta spend ÷ new customers." delay={0.14} size="sm" />
          <StatTile
            label="Subscriber share"
            value={s.subscriberShare}
            format="pct"
            info="New subscribers ÷ new customers: how many first-time customers subscribed."
            delay={0.17}
            size="sm"
          />
          <StatTile
            label="Spend per $1 new MRR"
            value={s.spendPerNewMrr}
            format="moneyCents"
            info="Ad spend attributed to subscribers (CAC × new subscribers) ÷ the MRR they added."
            delay={0.2}
            size="sm"
          />
          <StatTile
            label="Lifetime MRR per ad $"
            value={s.ltvMrrPerAdDollar}
            format="multiple"
            info="New MRR × lifetime months, divided by the ad spend attributed to subscribers."
            delay={0.23}
            size="sm"
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <SpendVsWon report={report} animKey={animKey} />
        <Card className="flex flex-col p-5 sm:p-7 lg:col-span-4" delay={0.1}>
          <CardHeader
            title="Meta vs fulfillment"
            info="Meta ad spend compared with all fulfillment charges in the range (Meta ÷ fulfillment)."
          />
          <AnimatedNumber value={mvf?.ratio ?? null} format="pct" className="mt-3 block text-[38px] font-semibold tracking-[-0.04em]" />
          <p className="text-[12.5px] text-ink-3">of fulfillment spend goes to Meta</p>
          <div className="mt-auto flex flex-col gap-3 pt-6">
            <RatioBar label="Meta ads" value={mvf?.meta ?? null} max={Math.max(mvf?.meta ?? 0, mvf?.fulfillment ?? 0)} color="var(--s2)" />
            <RatioBar label="Fulfillment" value={mvf?.fulfillment ?? null} max={Math.max(mvf?.meta ?? 0, mvf?.fulfillment ?? 0)} color="var(--s1)" />
          </div>
        </Card>
      </div>
    </Section>
  );
}

function Payback({ payback, lifetime }: { payback: number | null; lifetime: number | null }) {
  const reduce = useReducedMotion();
  if (payback === null || lifetime === null || lifetime <= 0) return null;
  const share = Math.min(1, Math.max(0, payback / lifetime));
  const tone = share < 0.5 ? "var(--good)" : share < 1 ? "var(--warn)" : "var(--bad)";
  return (
    <div className="mt-8">
      <div className="flex items-baseline justify-between text-[12.5px]">
        <span className="flex items-center gap-1 text-ink-3">
          Payback
          <InfoTip>CAC ÷ contribution per month: how long a subscriber takes to repay what it cost to win them, against their expected lifetime.</InfoTip>
        </span>
        <span className="text-ink-2">
          <span className="font-medium text-ink">{months(payback)}</span> of {months(lifetime)} lifetime
        </span>
      </div>
      <div className="relative mt-2.5 h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: tone }}
          initial={{ width: reduce ? `${share * 100}%` : "0%" }}
          whileInView={{ width: `${share * 100}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
        />
      </div>
    </div>
  );
}

function RatioBar({ label, value, max, color }: { label: string; value: number | null; max: number; color: string }) {
  const reduce = useReducedMotion();
  const w = value !== null && max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-[12.5px]">
        <span className="flex items-center gap-2 text-ink-3">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />
          {label}
        </span>
        <span className="font-medium text-ink-2 tnum">{money(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: reduce ? `${w}%` : "0%" }}
          whileInView={{ width: `${w}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        />
      </div>
    </div>
  );
}

type WonMode = "lifetime" | "new";

function SpendVsWon({ report, animKey }: { report: LoopReport; animKey: string }) {
  const [mode, setMode] = useState<WonMode>("lifetime");
  const s = report.summary;
  const useWeeks = report.weekly.length > 0 && report.weekly.length <= 30;
  const rows = useWeeks ? report.weekly : report.monthly;

  const data = useMemo(
    () =>
      rows.map((r) => ({
        key: r.start,
        label: useWeeks ? shortDate(r.start) : monthLabel(r.start),
        tooltipTitle: useWeeks ? `Week of ${shortDate(r.start)}` : monthLabel(r.start),
        values: [
          r.spend !== null && s.subscriberShare !== null ? r.spend * s.subscriberShare : null,
          r.newMrr !== null ? (mode === "lifetime" && s.lifetimeMonths !== null ? r.newMrr * s.lifetimeMonths : r.newMrr) : null,
        ],
      })),
    [rows, useWeeks, s.subscriberShare, s.lifetimeMonths, mode],
  );

  const wonLabel = mode === "lifetime" ? "Lifetime MRR won" : "New MRR";

  return (
    <Card className="p-5 sm:p-7 lg:col-span-8" delay={0.05}>
      <CardHeader
        title="Ad spend vs MRR won"
        subtitle={`${useWeeks ? "Weekly" : "Monthly"} · spend attributed to subscribers (spend × ${pct(s.subscriberShare)} subscriber share)`}
        right={
          <Segmented
            size="sm"
            label="MRR measure"
            options={[
              { value: "lifetime" as const, label: "Lifetime" },
              { value: "new" as const, label: "New MRR" },
            ]}
            value={mode}
            onChange={setMode}
          />
        }
      />
      <div className="mt-4 flex gap-4 text-[12px] text-ink-3">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-s2" /> Subscriber ad spend
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-s1" /> {wonLabel}
        </span>
      </div>
      <div className="mt-3">
        {data.length > 0 ? (
          <Columns
            data={data}
            series={[
              { name: "Subscriber ad spend", color: "var(--s2)" },
              { name: wonLabel, color: "var(--s1)" },
            ]}
            format="money"
            height={250}
            animationKey={animKey + mode}
          />
        ) : (
          <p className="py-16 text-center text-[13px] text-ink-3">No weeks in this range yet.</p>
        )}
      </div>
    </Card>
  );
}
