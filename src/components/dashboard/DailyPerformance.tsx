"use client";

import { Activity, ArrowDownLeft, ArrowRight, ArrowUpRight, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, Layers3, RefreshCw, Wallet } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { TimeChart } from "@/components/charts/TimeChart";
import { Card } from "@/components/ui/Card";
import { count, multiple, shortDate, timeAgo } from "@/lib/format";
import { calculatePerformance, legacyPerformance, strictSum, summarizePerformance, withRangeCoverage, type DayMetrics } from "@/lib/performance";
import type { LoopReport, Num } from "@/lib/types";

const PAGE_SIZE = 10;
type ChartMetric = "revenue" | "spend" | "profit";
const CHART_LABELS: Record<ChartMetric, string> = { revenue: "Net revenue", spend: "Ad spend", profit: "Operating profit" };

export function DailyPerformance({ report, demo, refreshing, onRefresh, from, to }: { report: LoopReport; demo: boolean; refreshing: boolean; onRefresh?: () => void; from: string; to: string }) {
  const dataset = useMemo(() => withRangeCoverage(report.performance ?? legacyPerformance(report), from, to), [report, from, to]);
  const [account, setAccount] = useState("all");
  const [metric, setMetric] = useState<ChartMetric>("revenue");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const rows = useMemo(() => calculatePerformance(dataset, account), [dataset, account]);
  const allRows = useMemo(() => calculatePerformance(dataset), [dataset]);
  const totals = useMemo(() => summarizePerformance(rows, account !== "all", dataset.reconciled), [rows, account, dataset.reconciled]);
  const accountOptions = useMemo(() => [...new Map(dataset.days.flatMap((d) => d.ads ?? []).map((a) => [a.id, a.name])).entries()], [dataset]);
  const visible = [...rows].reverse().filter((d) => status === "all" || (status === "complete" ? d.issues.length === 0 : d.issues.length > 0));
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const money = (value: Num) => value === null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: dataset.currency, maximumFractionDigits: Math.abs(value) < 100 ? 2 : 0 }).format(value);
  const readySources = dataset.sources.filter((s) => s.status === "ready").length;
  const chartMetric = account !== "all" && metric === "profit" ? "spend" : metric;
  const completeProfit = strictSum(allRows.filter((d) => d.profit !== null).map((d) => d.profit));

  return (
    <div className="performance-view space-y-6 pb-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-3">
            <span className="h-1.5 w-1.5 rounded-full bg-good" /> Business performance
            {demo && <span className="rounded border border-warn/25 bg-warn/10 px-2 py-0.5 tracking-normal text-warn">Fictional sample data</span>}
          </div>
          <h1 className="text-[28px] font-semibold tracking-[-0.045em] sm:text-[36px]">Your day, in numbers.</h1>
          <p className="mt-1.5 text-[13px] text-ink-3">Revenue, acquisition and profitability in one place.</p>
        </div>
        <div className="flex items-center gap-2 text-[12px]">
          <span className="rounded-lg border border-line bg-surface px-3 py-2 text-ink-2">{dataset.timeZone} <span className="mx-1.5 text-ink-3">/</span> {dataset.currency}</span>
          {onRefresh && <button onClick={onRefresh} disabled={refreshing} className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-ink-2 transition hover:border-line-strong disabled:opacity-50" aria-label="Refresh report">
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} /> Refresh
          </button>}
        </div>
      </div>

      {!dataset.reconciled && <div role="status" className="flex gap-3 rounded-xl border border-warn/20 bg-warn/[0.06] p-4 text-[12px] leading-relaxed text-ink-2"><CircleHelp size={17} className="mt-0.5 shrink-0 text-warn" /><p>The current API supplies aggregate figures. Payment semantics, paid subscribers, fees and operating expenses still need verification. Profit and derived acquisition metrics stay unavailable until those facts are reconciled.</p></div>}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard label={dataset.reconciled ? "Net revenue" : "API-reported revenue"} value={money(totals.revenue)} note={dataset.reconciled ? "Sales less refunds · all providers" : "Revenue basis unverified"} icon={<ArrowDownLeft size={15} />} />
        <MetricCard label="Ad spend" value={money(totals.spend)} note={account === "all" ? `${accountOptions.length || "No"} accounts in breakdown` : "Selected account only"} icon={<ArrowUpRight size={15} />} />
        <MetricCard label="Operating profit" value={money(totals.profit)} note={account !== "all" ? "Store costs cannot be allocated" : totals.profit === null ? `${totals.completeDays}/${rows.length} days have complete costs` : "After ads, fees, COGS & overhead"} icon={<Wallet size={15} />} highlighted positive={totals.profit === null || totals.profit >= 0} />
        <MetricCard label="Cost / new subscriber" value={money(totals.costPerNewSubscriber)} note={`${count(totals.newPaidSubscribers)} unique first paid subscribers`} icon={<Layers3 size={15} />} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_310px]">
        <Card glow={false} className="min-w-0 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><h2 className="text-[14px] font-semibold">Performance over time</h2><p className="mt-1 text-[12px] text-ink-3">Daily totals · gaps indicate unavailable facts</p></div>
            <div className="flex rounded-lg border border-line bg-bg/60 p-1" role="group" aria-label="Chart metric">
              {(["revenue", "spend", "profit"] as ChartMetric[]).map((m) => <button key={m} disabled={account !== "all" && m === "profit"} onClick={() => setMetric(m)} aria-pressed={chartMetric === m} className={`rounded-md px-2.5 py-1 text-[11px] transition disabled:opacity-30 ${chartMetric === m ? "bg-surface-3 text-ink" : "text-ink-3 hover:text-ink"}`}>{m === "profit" ? "Profit" : m === "spend" ? "Spend" : "Revenue"}</button>)}
            </div>
          </div>
          <div className="mt-6"><TimeChart data={rows.map((d) => ({ date: d.date, value: d[chartMetric] }))} format="money" currency={dataset.currency} label={CHART_LABELS[chartMetric]} color={chartMetric === "spend" ? "var(--s2)" : chartMetric === "profit" ? "var(--good)" : "var(--accent)"} height={240} zero animationKey={`${rows[0]?.date}-${account}-${chartMetric}`} /></div>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 sm:grid-cols-4">
            <SmallMetric label="Blended ROAS" value={multiple(totals.blendedRoas)} help="All-provider net revenue ÷ all Meta spend. This is a blended revenue ratio, not an attribution claim." />
            <SmallMetric label="Meta-attributed ROAS" value={multiple(totals.attributedRoas)} help="Meta-reported attributed revenue ÷ the same accounts’ spend. The attribution window is shown under Sources." />
            <SmallMetric label="First payments" value={money(totals.firstPaymentRevenue)} help="Gross first subscription payments, separate from renewal revenue and other sales." />
            <SmallMetric label="Renewal revenue" value={money(totals.renewalRevenue)} help="Gross renewal payments. Renewals never increase the new-paid-subscriber denominator." />
          </div>
        </Card>

        <Card glow={false} className="p-5 sm:p-6">
          <div className="flex items-center justify-between"><h2 className="text-[14px] font-semibold">Sources</h2><span className="text-[11px] text-ink-3">{readySources}/{dataset.sources.length} {demo ? "sample" : "available"}</span></div>
          <div className="mt-2 divide-y divide-line">
            {dataset.sources.map((s) => <div key={s.id} className="py-3.5"><div className="flex items-center justify-between gap-2"><span className="text-[12px] font-medium">{s.name}</span><span className={`flex items-center gap-1 text-[10px] ${s.status === "ready" ? "text-good" : "text-warn"}`}>{s.status === "ready" ? <CheckCircle2 size={11} /> : <Clock3 size={11} />}{s.status === "ready" ? demo ? "Sample" : "Available" : s.status === "error" ? "Error" : "Needs setup"}</span></div><p className="mt-1 text-[11px] leading-relaxed text-ink-3">{s.detail}</p><p className="mt-1 text-[10px] text-ink-3">{s.syncedAt ? `Updated ${timeAgo(s.syncedAt)}` : "No verified sync time"}</p></div>)}
          </div>
          <div className="mt-1 rounded-lg border border-line bg-bg/50 p-3"><div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-3"><Activity size={12} /> Bank cash flow</div><p className="mt-1 text-[20px] font-semibold tnum">{money(totals.cashFlow)}</p><p className="mt-1 text-[10px] leading-relaxed text-ink-3">Settled inflows less outflows, excluding internal transfers. Separate from profit.</p></div>
        </Card>
      </div>

      <Card glow={false} className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6">
          <div><h2 className="text-[14px] font-semibold">Daily ledger</h2><p className="mt-1 text-[12px] text-ink-3">Open a day to inspect its revenue and cost breakdown.</p></div>
          <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="meta-account">Meta account</label><select id="meta-account" value={account} onChange={(e) => { setAccount(e.target.value); setPage(0); }} className="max-w-[185px] rounded-lg border border-line bg-surface-2 px-3 py-2 text-[11px] text-ink-2"><option value="all">All Meta accounts</option>{accountOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
            <label className="sr-only" htmlFor="data-status">Data status</label><select id="data-status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-[11px] text-ink-2"><option value="all">All days</option><option value="complete">Complete days</option><option value="attention">Needs attention</option></select>
          </div>
        </div>
        {account !== "all" && <p className="mx-5 mb-4 rounded-lg bg-warn/10 px-3 py-2 text-[11px] text-warn">Account filter applies to spend and Meta attribution. Revenue and subscribers remain store totals; store profit and acquisition cost are unavailable in this view.</p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[770px] border-collapse text-right text-[12px] tnum">
            <thead><tr className="border-y border-line bg-bg/40 text-[10px] uppercase tracking-wider text-ink-3"><th className="px-5 py-3 text-left font-medium">Day ({dataset.timeZone})</th>{["Net revenue", "Ad spend", "Operating profit", "Blended ROAS", "New paid subs", "Cost / new sub"].map((label) => <th className="px-3 py-3 font-medium" key={label}>{label}</th>)}<th className="px-5 py-3 text-left font-medium">Status</th></tr></thead>
            <tbody>
              {visible.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE).map((day) => <Fragment key={day.date}>
                <tr className="border-b border-line transition hover:bg-white/[0.025]">
                  <td className="px-5 py-4 text-left"><button onClick={() => setExpanded(expanded === day.date ? null : day.date)} aria-expanded={expanded === day.date} aria-controls={`day-${day.date}`} className="flex items-center gap-2 whitespace-nowrap text-ink"><ChevronDown size={12} className={`text-ink-3 transition ${expanded === day.date ? "rotate-180" : ""}`} />{shortDate(day.date)}</button></td>
                  <td className="px-3 py-4">{money(day.revenue)}</td><td className="px-3 py-4 text-ink-2">{money(day.spend)}</td><td className={`px-3 py-4 font-medium ${day.profit === null ? "text-ink-3" : day.profit >= 0 ? "text-good" : "text-bad"}`}>{money(day.profit)}</td><td className="px-3 py-4 text-ink-2">{multiple(day.blendedRoas)}</td><td className="px-3 py-4 text-ink-2">{count(day.newPaidSubscribers)}</td><td className="px-3 py-4 text-ink-2">{money(day.costPerNewSubscriber)}</td><td className="px-5 py-4 text-left"><span className={`whitespace-nowrap rounded px-2 py-1 text-[10px] ${day.issues.length ? "bg-warn/10 text-warn" : "bg-good/10 text-good"}`}>{day.issues.length ? "Incomplete" : "Complete"}</span></td>
                </tr>
                {expanded === day.date && <tr id={`day-${day.date}`} className="border-b border-line bg-bg/50"><td colSpan={8} className="px-5 py-5 text-left"><DayBreakdown day={day} money={money} /></td></tr>}
              </Fragment>)}
            </tbody>
          </table>
          {visible.length === 0 && <p className="p-10 text-center text-[13px] text-ink-3">No days match this filter.</p>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-[11px] text-ink-3"><span>{visible.length} days · {dataset.currency} · {dataset.timeZone}</span><div className="flex items-center gap-3"><button aria-label="Previous ledger page" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} className="rounded border border-line p-1.5 disabled:opacity-30"><ChevronLeft size={13} /></button><span>{currentPage + 1} / {pageCount}</span><button aria-label="Next ledger page" disabled={currentPage + 1 >= pageCount} onClick={() => setPage(currentPage + 1)} className="rounded border border-line p-1.5 disabled:opacity-30"><ChevronRight size={13} /></button></div></div>
      </Card>

      <div className="grid gap-4 text-[11px] leading-relaxed text-ink-3 sm:grid-cols-2">
        <p><span className="font-medium text-ink-2">Profit definition.</span> Net sales after refunds, less payment fees, disputes, product cost, fulfillment, ad spend and operating expenses. Before income tax. Missing costs leave the full-range total unavailable.{totals.profit === null && completeProfit !== null && account === "all" && <span> The {totals.completeDays} complete days total {money(completeProfit)}; this is a partial period.</span>}</p>
        <p><span className="font-medium text-ink-2">Acquisition definition.</span> Total Meta spend divided by unique first paid subscribers across revenue providers. Trials, failed payments and renewals are excluded. Blended ROAS uses net revenue; Meta attribution uses its own reporting window.</p>
      </div>
    </div>
  );
}

function MetricCard({ label, value, note, icon, highlighted, positive }: { label: string; value: string; note: string; icon: React.ReactNode; highlighted?: boolean; positive?: boolean }) {
  return <Card glow={false} className={`p-4 sm:p-5 ${highlighted ? "!border-good/20 !bg-good/[0.035]" : ""}`}><div className="flex items-center justify-between gap-2 text-[11px] text-ink-3"><span>{label}</span><span className={highlighted ? "text-good" : "text-ink-3"}>{icon}</span></div><p className={`mt-5 truncate text-[26px] font-semibold tracking-[-0.035em] tnum sm:text-[30px] ${highlighted ? positive ? "text-good" : "text-bad" : "text-ink"}`}>{value}</p><p className="mt-2 text-[10px] leading-relaxed text-ink-3">{note}</p></Card>;
}
function SmallMetric({ label, value, help }: { label: string; value: string; help: string }) {
  return <div title={help}><p className="flex items-center gap-1 text-[10px] text-ink-3">{label}<CircleHelp size={10} /></p><p className="mt-1.5 text-[18px] font-medium tnum">{value}</p></div>;
}
function DayBreakdown({ day, money }: { day: DayMetrics; money: (n: Num) => string }) {
  return <div className="grid gap-5 md:grid-cols-3">
    <div><h3 className="mb-2 text-[12px] font-semibold">Revenue reconciliation</h3>{[["Gross sales", day.gross], ["Refunds", day.refunds], ["Payment fees", day.fees], ["Disputes", day.disputes], ["Net revenue", day.revenue]].map(([label, value]) => <div key={String(label)} className="flex justify-between gap-4 py-1 text-[11px] text-ink-3"><span>{String(label)}</span><span className="text-ink-2">{money(value as Num)}</span></div>)}<p className="mt-2 text-[10px] text-ink-3">{day.providers.map((p) => p.provider).join(" · ") || "Provider detail unavailable"}</p></div>
    <div><h3 className="mb-2 text-[12px] font-semibold">Costs & cash</h3>{[["Product cost", day.productCost], ["Fulfillment", day.fulfillment], ["Ad spend", day.spend], ["Operating expenses", day.operatingExpenses], ["Bank cash flow", day.cashFlow]].map(([label, value]) => <div key={String(label)} className="flex justify-between gap-4 py-1 text-[11px] text-ink-3"><span>{String(label)}</span><span className="text-ink-2">{money(value as Num)}</span></div>)}<p className="mt-2 text-[10px] text-warn">{day.issues.join(" · ") || "All required facts present"}</p></div>
    <div><h3 className="mb-2 text-[12px] font-semibold">Meta accounts</h3>{day.accounts.length ? day.accounts.map((a) => <div key={a.id} className="flex justify-between gap-4 py-1 text-[11px] text-ink-3"><span>{a.name}</span><span className="text-ink-2">{money(a.spend)}</span></div>) : <p className="text-[11px] text-ink-3">Account breakdown unavailable.</p>}<p className="mt-3 flex items-center gap-1 text-[10px] text-ink-3"><ArrowRight size={10} /> Store revenue stays independent of account filters.</p></div>
  </div>;
}
