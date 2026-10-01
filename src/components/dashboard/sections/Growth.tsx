"use client";

import { useMemo, useState } from "react";
import { Columns } from "@/components/charts/Columns";
import { Card, CardHeader } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Segmented } from "@/components/ui/Segmented";
import { monthLabel, shortDate } from "@/lib/format";
import type { LoopReport, PeriodRow } from "@/lib/types";
import { Section } from "../Section";

type Period = "weekly" | "monthly";

export function Growth({ report, animKey }: { report: LoopReport; animKey: string }) {
  const [period, setPeriod] = useState<Period>(report.weekly.length > 26 ? "monthly" : "weekly");
  const rows = period === "weekly" ? report.weekly : report.monthly;
  const label = (r: PeriodRow) => (period === "weekly" ? shortDate(r.start) : monthLabel(r.start));

  const data = useMemo(
    () =>
      rows.map((r) => ({
        key: r.start,
        label: label(r),
        tooltipTitle: period === "weekly" ? `Week of ${shortDate(r.start)}` : monthLabel(r.start),
        values: [r.newMrr, r.churnedMrr],
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, period],
  );

  return (
    <Section
      id="growth"
      kicker="Growth"
      title="MRR won and lost"
      right={
        <Segmented
          label="Period"
          options={[
            { value: "weekly" as const, label: "Weekly" },
            { value: "monthly" as const, label: "Monthly" },
          ]}
          value={period}
          onChange={setPeriod}
        />
      }
    >
      <Card className="p-5 sm:p-7" delay={0.05}>
        <CardHeader
          title="New vs cancelled MRR"
          subtitle={period === "weekly" ? "Weeks start on Monday" : "By calendar month"}
          right={
            <div className="flex gap-4 text-[12px] text-ink-3">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-[3px] bg-s1" /> New MRR
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-[3px] bg-s2" /> Cancelled MRR
              </span>
            </div>
          }
        />
        <div className="mt-5">
          {data.length > 0 ? (
            <Columns
              data={data}
              series={[
                { name: "New MRR", color: "var(--s1)" },
                { name: "Cancelled MRR", color: "var(--s2)" },
              ]}
              format="money"
              height={250}
              animationKey={animKey + period}
            />
          ) : (
            <p className="py-16 text-center text-[13px] text-ink-3">No full periods in this range yet.</p>
          )}
        </div>
        <div className="mt-6 border-t border-line pt-4">
          <DataTable
            rows={[...rows].reverse()}
            rowKey={(r) => r.start}
            maxHeight={320}
            columns={[
              { key: "start", label: period === "weekly" ? "Week of" : "Month", render: label },
              { key: "newSubs", label: "New subs", format: "count" },
              { key: "churned", label: "Cancelled", format: "count" },
              { key: "newMrr", label: "New MRR", format: "money" },
              { key: "churnedMrr", label: "Lost MRR", format: "money" },
              {
                key: "netMrr",
                label: "Net MRR",
                format: "money",
                render: (r) => (
                  <span className={r.netMrr === null ? "" : r.netMrr >= 0 ? "text-good" : "text-bad"}>
                    {r.netMrr === null ? "—" : `${r.netMrr >= 0 ? "+" : "−"}$${Math.abs(Math.round(r.netMrr)).toLocaleString("en-US")}`}
                  </span>
                ),
              },
              { key: "revenue", label: "Revenue", format: "money" },
              { key: "spend", label: "Ad spend", format: "money" },
              { key: "cogs", label: "COGS", format: "money" },
              { key: "unitsShipped", label: "Units shipped", format: "count" },
              { key: "unitsSubscribed", label: "Units subscribed", format: "count" },
            ]}
          />
        </div>
      </Card>
    </Section>
  );
}
