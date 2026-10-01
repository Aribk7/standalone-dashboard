"use client";

import { AlertTriangle, Clock } from "lucide-react";
import { useMemo } from "react";
import { Columns } from "@/components/charts/Columns";
import { Card, CardHeader } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { bucketSum, grainFor } from "@/lib/bucket";
import { fullDate, money, monthLabel, shortDate } from "@/lib/format";
import type { LoopReport } from "@/lib/types";
import { Section } from "../Section";
import { StatTile } from "../StatTile";

export function StorePnl({ report, animKey }: { report: LoopReport; animKey: string }) {
  const r = report.roas;
  const daily = report.daily;
  const grain = grainFor(daily.length);

  const bars = useMemo(() => {
    const rows = bucketSum(daily, ["netAfterAds"], grain);
    return rows.map((b) => ({
      key: b.date,
      label: grain === "month" ? monthLabel(b.date) : shortDate(b.date),
      tooltipTitle: grain === "day" ? fullDate(b.date) : grain === "week" ? `Week of ${shortDate(b.date)}` : monthLabel(b.date),
      values: [b.netAfterAds],
    }));
  }, [daily, grain]);

  const pending = daily.filter((d) => (d.missingCosts ?? 0) > 0 || d.cogs === null).length;

  return (
    <Section
      id="store"
      kicker="Whole store"
      title="Profit after ads"
      description="Every order in the store, not just subscriptions, with ad spend, product and fulfillment costs."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
        <StatTile label="Classic ROAS" value={r?.classicRoas ?? null} format="multiple" size="sm" info="Revenue (after refunds) ÷ ad spend." delay={0.05} />
        <StatTile
          label="Real ROAS"
          value={r?.realRoas ?? null}
          format="multiple"
          size="sm"
          info="Contribution ÷ ad spend, where contribution is revenue minus fees, fulfillment, product cost and disputes."
          emphasis
          delay={0.08}
        />
        <StatTile label="Net after ads" value={r?.netAfterAds ?? null} format="money" size="sm" info="Contribution minus ad spend." delay={0.11} />
        <StatTile label="Contribution" value={r?.contribution ?? null} format="money" size="sm" delay={0.14} />
        <StatTile label="CAC" value={r?.cac ?? null} format="moneyCents" size="sm" info="Ad spend ÷ first orders." delay={0.17} />
        <StatTile
          label="Lifetime ROAS"
          value={r?.ltvRoas ?? null}
          format="multiple"
          size="sm"
          info="Lifetime contribution of a first order (its own contribution plus expected renewals) ÷ CAC."
          delay={0.2}
        />
      </div>

      <Card className="mt-4 p-5 sm:p-7" delay={0.05}>
        <CardHeader
          title="Net after ads"
          subtitle={`${grain === "day" ? "Daily" : grain === "week" ? "Weekly" : "Monthly"} revenue minus cost of goods and ad spend`}
          right={
            pending > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-warn/25 bg-warn/[0.07] px-2.5 py-1 text-[12px] text-warn">
                <Clock size={13} /> {pending} {pending === 1 ? "day is" : "days are"} waiting on costs
              </span>
            ) : undefined
          }
        />
        <div className="mt-5">
          {bars.length > 0 ? (
            <Columns
              data={bars}
              series={[{ name: "Net after ads", color: "var(--s1)", negativeColor: "var(--s2)" }]}
              format="money"
              height={240}
              animationKey={animKey}
            />
          ) : (
            <p className="py-16 text-center text-[13px] text-ink-3">No store orders in this range.</p>
          )}
        </div>
        <div className="mt-6 border-t border-line pt-4">
          <DataTable
            rows={[...daily].reverse()}
            rowKey={(d) => d.date}
            columns={[
              { key: "date", label: "Date", render: (d) => fullDate(d.date) },
              { key: "orders", label: "Orders", format: "count" },
              { key: "revenue", label: "Revenue", format: "money" },
              { key: "refunds", label: "Refunds", format: "money" },
              { key: "adSpend", label: "Ad spend", format: "money" },
              { key: "productCost", label: "Product", format: "money" },
              { key: "fulfillment", label: "Fulfillment", format: "money" },
              { key: "cogs", label: "COGS", format: "money" },
              {
                key: "netAfterAds",
                label: "Net after ads",
                format: "money",
                render: (d) =>
                  d.netAfterAds === null ? (
                    <span className="text-ink-3">pending</span>
                  ) : (
                    <span className={d.netAfterAds >= 0 ? "text-good" : "text-bad"}>{money(d.netAfterAds, { sign: true })}</span>
                  ),
              },
              {
                key: "flags",
                label: "",
                align: "left",
                render: (d) => {
                  const notes: string[] = [];
                  if (d.missingProductCosts) notes.push(`${d.missingProductCosts} without product cost`);
                  if (d.missingFulfillmentCharges) notes.push(`${d.missingFulfillmentCharges} without fulfillment charge`);
                  if (d.estimatedOrders) notes.push(`${d.estimatedOrders} estimated`);
                  return notes.length ? (
                    <span className="inline-flex items-center gap-1 text-[11.5px] text-warn" title={notes.join(" · ")}>
                      <AlertTriangle size={12} /> {notes[0]}
                      {notes.length > 1 ? ` +${notes.length - 1}` : ""}
                    </span>
                  ) : null;
                },
              },
            ]}
          />
        </div>
      </Card>
    </Section>
  );
}
