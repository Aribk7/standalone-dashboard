"use client";

import { AnimatePresence, motion } from "motion/react";
import { Table2, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { Columns } from "@/components/charts/Columns";
import { TimeChart } from "@/components/charts/TimeChart";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Card, CardHeader } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Delta } from "@/components/ui/Delta";
import { InfoTip } from "@/components/ui/InfoTip";
import { Segmented } from "@/components/ui/Segmented";
import { bucketSum, grainFor } from "@/lib/bucket";
import { fullDate, money, monthLabel, shortDate } from "@/lib/format";
import type { LoopReport } from "@/lib/types";
import { Section } from "../Section";
import { StatTile } from "../StatTile";

const tail = <T,>(a: T[], n = 30) => a.slice(Math.max(0, a.length - n));

export function Overview({ report, animKey }: { report: LoopReport; animKey: string }) {
  const s = report.summary;
  const series = report.series;
  const mrrSeries = useMemo(() => series.map((p) => ({ date: p.date, value: p.mrr })), [series]);
  const t = (k: keyof (typeof series)[number]) => tail(series).map((p) => p[k] as number | null);

  return (
    <Section id="overview" kicker="Subscribers & MRR" title="Overview">
      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="p-5 sm:p-7 lg:col-span-8" delay={0.05}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] text-ink-2">Monthly recurring revenue</span>
              <InfoTip>
                Every active subscription&apos;s price normalised to one month. A $60 plan billed every 2 months counts as $30.
              </InfoTip>
            </div>
            <div className="flex items-center gap-1.5">
              <Delta value={s.mrrChange} format="money" size="md" />
              <Delta value={s.mrrGrowthPct} format="pct" size="md" />
            </div>
          </div>
          <AnimatedNumber value={s.mrr} format="money" className="mt-2 block text-[44px] font-semibold leading-none tracking-[-0.045em] sm:text-[60px]" />
          <p className="mt-3 text-[13px] text-ink-3">
            From <span className="text-ink-2">{money(s.mrrStart)}</span> at the start of the range ·{" "}
            <span className="text-ink-2">{money(s.mrrGrowthPerDay, { sign: true })}</span> a day
          </p>
          <div className="mt-6">
            {series.length > 1 ? (
              <TimeChart data={mrrSeries} format="money" label="MRR" height={280} animationKey={animKey} />
            ) : (
              <SingleDayNote />
            )}
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3 lg:col-span-4 lg:gap-4">
          <StatTile
            label="Active subscribers"
            value={s.active}
            format="countCompact"
            sub={<Delta value={s.active !== null && s.activeStart !== null ? s.active - s.activeStart : null} format="count" />}
            trend={t("active")}
            delay={0.1}
          />
          <StatTile label="New" value={s.newSubs} format="countCompact" sub="started in range" trend={t("newSubs")} delay={0.14} />
          <StatTile label="Cancelled" value={s.churned} format="countCompact" sub="ended in range" trend={t("churned")} delay={0.18} />
          <StatTile
            label="Net subscribers"
            value={s.netSubs}
            format="countCompact"
            sub={s.paused !== null ? `${s.paused.toLocaleString("en-US")} paused` : undefined}
            info="New subscriptions minus cancellations in the range."
            trend={t("netSubs")}
            delay={0.22}
          />
          <StatTile
            label="Monthly churn"
            value={s.monthlyChurn}
            format="pct"
            info="Cancellations in the range divided by subscriber-months exposed (every active subscriber-day ÷ 30.4375)."
            sub={s.lifetimeMonths !== null ? `${s.lifetimeMonths.toFixed(1)} mo lifetime` : undefined}
            delay={0.26}
          />
          <StatTile label="ARPU" value={s.arpu} format="moneyCents" info="MRR divided by active subscribers." sub="per subscriber / mo" delay={0.3} />
          <StatTile
            label="Lifetime value"
            value={s.ltv}
            format="money"
            info="ARPU divided by monthly churn: the revenue an average subscriber brings over their lifetime."
            trend={t("ltv")}
            delay={0.34}
          />
          <StatTile
            label="Units / month"
            value={s.unitsPerMonth}
            format="count"
            info="Units committed by active subscriptions each month."
            sub={s.unitsShipped !== null ? `${s.unitsShipped.toLocaleString("en-US")} shipped in range` : undefined}
            delay={0.38}
          />
        </div>
      </div>

      <Movement report={report} animKey={animKey} />
    </Section>
  );
}

function SingleDayNote() {
  return (
    <div className="grid h-[200px] place-items-center rounded-2xl border border-dashed border-line text-center">
      <div className="flex flex-col items-center gap-2 text-[13px] text-ink-3">
        <TrendingUp size={18} />
        Pick a longer range to see the trend.
      </div>
    </div>
  );
}

type MovementMetric = "netSubs" | "active" | "netMrr";
const METRICS = [
  { value: "netSubs" as const, label: "Net subscribers" },
  { value: "active" as const, label: "Active" },
  { value: "netMrr" as const, label: "Net MRR" },
];

function Movement({ report, animKey }: { report: LoopReport; animKey: string }) {
  const [metric, setMetric] = useState<MovementMetric>("netSubs");
  const [table, setTable] = useState(false);
  const series = report.series;
  const grain = grainFor(series.length);

  const bars = useMemo(() => {
    const rows = bucketSum(series, ["netSubs", "netMrr", "newSubs", "churned"], grain);
    return rows.map((r) => ({
      key: r.date,
      label: grain === "month" ? monthLabel(r.date) : shortDate(r.date),
      tooltipTitle: grain === "day" ? fullDate(r.date) : grain === "week" ? `Week of ${shortDate(r.date)}` : monthLabel(r.date),
      values: [metric === "netMrr" ? r.netMrr : r.netSubs],
      raw: r,
    }));
  }, [series, grain, metric]);

  const grainWord = grain === "day" ? "Daily" : grain === "week" ? "Weekly" : "Monthly";

  return (
    <Card className="mt-4 p-5 sm:p-7" delay={0.1}>
      <CardHeader
        title="Subscriber movement"
        subtitle={metric === "active" ? "Active subscribers at the end of each day" : `${grainWord} gains above the line, losses below`}
        right={
          <div className="flex items-center gap-2">
            <Segmented size="sm" label="Metric" options={METRICS} value={metric} onChange={setMetric} />
            <button
              onClick={() => setTable((v) => !v)}
              aria-pressed={table}
              aria-label="Show as table"
              className={`grid h-9 w-9 place-items-center rounded-xl border transition-colors ${
                table ? "border-accent/40 bg-accent/10 text-accent-soft" : "border-line text-ink-3 hover:text-ink"
              }`}
            >
              <Table2 size={15} />
            </button>
          </div>
        }
      />
      <div className="mt-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={table ? "table" : metric}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
          >
            {table ? (
              <DataTable
                rows={[...series].reverse()}
                rowKey={(r) => r.date}
                columns={[
                  { key: "date", label: "Date", render: (r) => fullDate(r.date) },
                  { key: "newSubs", label: "New", format: "count" },
                  { key: "churned", label: "Cancelled", format: "count" },
                  { key: "netSubs", label: "Net", format: "count" },
                  { key: "active", label: "Active", format: "count" },
                  { key: "newMrr", label: "New MRR", format: "money" },
                  { key: "churnedMrr", label: "Lost MRR", format: "money" },
                  { key: "netMrr", label: "Net MRR", format: "money" },
                  { key: "mrr", label: "MRR", format: "money" },
                ]}
              />
            ) : series.length < 2 ? (
              <SingleDayNote />
            ) : metric === "active" ? (
              <TimeChart
                data={series.map((p) => ({ date: p.date, value: p.active }))}
                format="count"
                label="Active subscribers"
                height={260}
                animationKey={animKey + metric}
              />
            ) : (
              <Columns
                data={bars}
                series={[
                  {
                    name: metric === "netMrr" ? "Net MRR" : "Net subscribers",
                    color: "var(--s1)",
                    negativeColor: "var(--s2)",
                  },
                ]}
                format={metric === "netMrr" ? "money" : "count"}
                height={260}
                animationKey={animKey + metric}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </Card>
  );
}
