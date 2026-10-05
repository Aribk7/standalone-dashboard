"use client";

import { useMemo, useState } from "react";
import { Wordmark } from "@/components/ui/Logo";
import type { LoopReport } from "@/lib/types";
import { DailyPerformance } from "./DailyPerformance";

export function DashboardPreview({ report, to }: { report: LoopReport; to: string }) {
  const [days, setDays] = useState(30);
  const from = useMemo(() => {
    const start = new Date(`${to}T00:00:00Z`);
    start.setUTCDate(start.getUTCDate() - days);
    return start.toISOString().slice(0, 10);
  }, [days, to]);
  const selectedReport = useMemo(() => ({
    ...report,
    daily: report.daily.filter((day) => day.date >= from && day.date < to),
    performance: report.performance ? {
      ...report.performance,
      days: report.performance.days.filter((day) => day.date >= from && day.date < to),
    } : null,
  }), [report, from, to]);

  return (
    <main className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
        <Wordmark />
        <div role="group" aria-label="Sample date range" className="flex gap-2">
          {[7, 30, 90].map((range) => (
            <button key={range} aria-pressed={days === range} onClick={() => setDays(range)}
              className={`rounded-lg border px-3 py-2 text-[12px] ${days === range ? "border-accent bg-accent/10 text-ink" : "border-line text-ink-3"}`}>
              {range}D
            </button>
          ))}
        </div>
      </header>
      <div role="status" className="mb-6 rounded-xl border border-warn/25 bg-warn/10 p-4 text-[13px] leading-relaxed text-ink-2">
        <strong className="text-warn">Sample preview.</strong> All figures are fictional. Live API key sign-in is disabled while secure connection setup is pending.
      </div>
      <DailyPerformance report={selectedReport} demo refreshing={false} from={from} to={to} />
    </main>
  );
}
