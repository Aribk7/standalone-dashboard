"use client";

import { motion, useReducedMotion } from "motion/react";
import { ChevronRight } from "lucide-react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Card, CardHeader } from "@/components/ui/Card";
import { InfoTip } from "@/components/ui/InfoTip";
import { count, decimal, money, pct } from "@/lib/format";
import type { LoopReport } from "@/lib/types";
import { Section } from "../Section";

const ease = [0.16, 1, 0.3, 1] as const;

export function UnitEconomics({ report }: { report: LoopReport }) {
  const s = report.summary;
  const productMissing = s.productKnown === false || s.productKnown === 0;

  return (
    <Section
      id="unit-economics"
      kicker="Unit economics"
      title="One order → one month → one lifetime"
      description="What a single subscription order leaves you after its costs, and what that becomes over a subscriber's life."
    >
      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="p-5 sm:p-7 lg:col-span-7" delay={0.05}>
          <CardHeader
            title="Where each order's revenue goes"
            subtitle={`Average across ${count(s.orders)} subscription orders in the range`}
            info="Revenue per order minus payment fees, the fulfillment charge and product cost. These three costs apply to every order."
          />
          <OrderBreakdown
            revenue={s.revenuePerOrder}
            fee={s.feePerOrder}
            feeRate={s.feeRate}
            fulfillment={s.fulfillmentPerOrder}
            product={productMissing ? null : s.productPerOrder}
            contribution={s.contributionPerOrder}
            productMissing={productMissing}
          />
        </Card>

        <div className="grid grid-cols-2 gap-3 lg:col-span-5 lg:gap-4">
          <MiniFigure label="Subscription revenue" value={money(s.revenue)} note="refunded orders excluded" delay={0.1} />
          <MiniFigure label="Orders" value={count(s.orders)} note={`${decimal(s.ordersPerMonth, 2)} per subscriber / mo`} delay={0.14} />
          <MiniFigure
            label="Gross margin"
            value={pct(s.grossMargin)}
            note="after cost of goods"
            info="Share of subscription revenue left after cost of goods, as reported by 24F."
            delay={0.18}
          />
          <MiniFigure label="Cost of goods" value={money(s.cogs)} note="as reported by 24F" delay={0.22} />
        </div>
      </div>

      <Card className="mt-4 p-5 sm:p-7" delay={0.1}>
        <div className="grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:gap-0">
          <Step label="Per order" value={s.contributionPerOrder} info="Contribution per order: revenue per order after fees, fulfillment and product cost." index={0} />
          <Connector text={`× ${decimal(s.ordersPerMonth, 2)} orders / mo`} index={0} />
          <Step label="Per month" value={s.contributionPerMonth} info="Contribution per order × orders a subscriber places per month." index={1} />
          <Connector text={`× ${decimal(s.lifetimeMonths, 1)} months`} index={1} />
          <Step
            label="Per lifetime"
            value={s.lifetimeContribution}
            info="Contribution per month × expected lifetime in months (1 ÷ churn over the last 90 days, capped at 24)."
            index={2}
            highlight
          />
        </div>
      </Card>
    </Section>
  );
}

function MiniFigure({ label, value, note, info, delay }: { label: string; value: string; note?: string; info?: string; delay?: number }) {
  return (
    <Card className="flex flex-col justify-between p-4 sm:p-5" delay={delay}>
      <div className="flex items-center gap-1 text-[12.5px] text-ink-3">
        {label}
        {info && <InfoTip>{info}</InfoTip>}
      </div>
      <div>
        <div className="mt-2 text-[22px] font-semibold tracking-[-0.03em] text-ink sm:text-[24px]">{value}</div>
        {note && <div className="mt-0.5 text-[12px] text-ink-3">{note}</div>}
      </div>
    </Card>
  );
}

function OrderBreakdown(props: {
  revenue: number | null;
  fee: number | null;
  feeRate: number | null;
  fulfillment: number | null;
  product: number | null;
  contribution: number | null;
  productMissing: boolean;
}) {
  const reduce = useReducedMotion();
  const total = props.revenue ?? 0;
  const parts = [
    { key: "contribution", label: "Contribution", value: props.contribution, color: "var(--s1)" },
    { key: "fulfillment", label: "Fulfillment", value: props.fulfillment, color: "#5d5e6b" },
    { key: "product", label: "Product cost", value: props.product, color: "#3f4049" },
    { key: "fee", label: "Payment fees", value: props.fee, color: "#2c2d34" },
  ];
  const shown = parts.filter((p) => p.value !== null && p.value > 0 && total > 0);

  return (
    <div className="mt-7">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] text-ink-2">Revenue per order</span>
        <AnimatedNumber value={props.revenue} format="moneyCents" className="text-[22px] font-semibold tracking-tight" />
      </div>
      <div className="mt-3 flex h-11 w-full gap-[2px] overflow-hidden rounded-xl" role="img" aria-label="Revenue per order split into contribution and costs">
        {shown.map((p, i) => (
          <motion.div
            key={p.key}
            initial={{ flexGrow: reduce ? (p.value as number) : 0.0001 }}
            animate={{ flexGrow: p.value as number }}
            transition={{ duration: 1, delay: 0.15 + i * 0.08, ease }}
            className="relative h-full min-w-0 first:rounded-l-xl last:rounded-r-xl"
            style={{ background: p.color, flexBasis: 0 }}
          >
            {p.key === "contribution" && (
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-60" />
            )}
          </motion.div>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        {parts.map((p) => (
          <div key={p.key} className="min-w-0">
            <div className="flex items-center gap-2 text-[12px] text-ink-3">
              <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: p.color, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }} />
              {p.label}
            </div>
            <div className={`mt-1 text-[15px] font-medium tnum ${p.key === "contribution" ? "text-ink" : "text-ink-2"}`}>
              {p.key === "product" && props.productMissing ? (
                <span className="text-[12px] font-normal text-warn">Costs not entered</span>
              ) : (
                <>
                  {p.key === "contribution" ? "" : "−"}
                  {money(p.value, { cents: true })}
                  {p.key === "fee" && props.feeRate !== null && <span className="ml-1 text-[11.5px] text-ink-3">{pct(props.feeRate)}</span>}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Step({ label, value, info, index, highlight }: { label: string; value: number | null; info: string; index: number; highlight?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.15 + index * 0.18, duration: 0.6, ease }}
      className={`relative rounded-2xl border p-5 ${
        highlight ? "border-accent/35 bg-gradient-to-br from-accent/[0.14] via-accent/[0.05] to-transparent" : "border-line bg-surface-2/60"
      }`}
    >
      <div className="flex items-center gap-1 text-[12.5px] text-ink-3">
        Contribution {label.toLowerCase()}
        <InfoTip>{info}</InfoTip>
      </div>
      <AnimatedNumber value={value} format="moneyCents" className={`mt-2 block font-semibold tracking-[-0.03em] ${highlight ? "text-[30px] text-white" : "text-[26px] text-ink"}`} />
      {highlight && <div className="pointer-events-none absolute -inset-px rounded-2xl ring-1 ring-inset ring-white/5" />}
    </motion.div>
  );
}

function Connector({ text, index }: { text: string; index: number }) {
  const reduce = useReducedMotion();
  return (
    <div className="flex items-center justify-center px-2 py-1 md:flex-col md:px-3">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 + index * 0.18, duration: 0.5, ease }}
        className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-surface-3/70 px-3 py-1.5 text-[12px] font-medium text-ink-2"
      >
        {text}
        <motion.span
          animate={reduce ? undefined : { x: [0, 3, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut", delay: index * 0.4 }}
          className="inline-flex max-md:rotate-90"
        >
          <ChevronRight size={14} className="text-accent-soft" />
        </motion.span>
      </motion.div>
    </div>
  );
}
