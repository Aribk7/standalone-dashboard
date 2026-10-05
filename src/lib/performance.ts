import type { LoopReport, Num } from "./types";

/** Optional, explicitly reconciled extension. No undocumented upstream endpoint is called. */
export interface AdAccountDay {
  id: string;
  name: string;
  spend: Num;
  attributedRevenue: Num;
  currency: string;
  timeZone: string;
}
export interface RevenueFact {
  canonicalId: string;
  provider: string;
  gross: Num;
  refunds: Num;
  fees: Num;
  disputes: Num;
  firstPaymentRevenue: Num;
  renewalRevenue: Num;
  newPaidSubscriberIds: string[] | null;
}
export interface PerformanceDay {
  date: string;
  ads: AdAccountDay[] | null;
  revenue: RevenueFact[] | null;
  productCost: Num;
  fulfillment: Num;
  operatingExpenses: Num;
  cashIn: Num;
  cashOut: Num;
  internalTransfersExcluded: boolean;
  /** Legacy API facts have unverified accounting semantics. */
  reportedRevenue?: Num;
  reportedSpend?: Num;
}
export interface PerformanceSource {
  id: string;
  name: string;
  status: "ready" | "missing" | "error";
  syncedAt: string | null;
  detail: string;
}
export interface PerformanceDataset {
  schemaVersion: 1;
  currency: string;
  timeZone: string;
  reconciled: boolean;
  days: PerformanceDay[];
  sources: PerformanceSource[];
}
export interface DayMetrics {
  date: string;
  revenue: Num;
  gross: Num;
  refunds: Num;
  fees: Num;
  disputes: Num;
  spend: Num;
  attributedRevenue: Num;
  productCost: Num;
  fulfillment: Num;
  operatingExpenses: Num;
  profit: Num;
  blendedRoas: Num;
  attributedRoas: Num;
  newPaidSubscribers: Num;
  costPerNewSubscriber: Num;
  firstPaymentRevenue: Num;
  renewalRevenue: Num;
  cashFlow: Num;
  issues: string[];
  accounts: AdAccountDay[];
  providers: RevenueFact[];
}

export const strictSum = (values: Num[]): Num =>
  values.length === 0 || values.some((v) => v === null || !Number.isFinite(v))
    ? null : values.reduce<number>((total, v) => total + (v as number), 0);
export const ratio = (numerator: Num, denominator: Num): Num =>
  numerator !== null && denominator !== null && denominator > 0 ? numerator / denominator : null;
const subtract = (base: Num, values: Num[]): Num => {
  const costs = strictSum(values);
  return base !== null && costs !== null ? base - costs : null;
};

/** Reject ambiguous values instead of coercing booleans or blanks into money. */
const number = (v: unknown): Num => typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
const text = (v: unknown): string | null => typeof v === "string" && v.trim() ? v : null;
const object = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};

export function normalizePerformance(input: unknown): PerformanceDataset | null {
  const raw = object(input);
  if (raw.schemaVersion !== 1 || !Array.isArray(raw.days) || !/^[A-Z]{3}$/.test(String(raw.currency))) return null;
  const timeZone = text(raw.timeZone);
  try { new Intl.DateTimeFormat("en", { timeZone: timeZone ?? "" }); } catch { return null; }
  if (!timeZone) return null;
  const dates = new Set<string>();
  const days: PerformanceDay[] = [];
  for (const value of raw.days) {
    const d = object(value);
    const date = text(d.date);
    const parsedDate = date ? Date.parse(`${date}T00:00:00Z`) : NaN;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsedDate) || new Date(parsedDate).toISOString().slice(0, 10) !== date || dates.has(date)) return null;
    dates.add(date);
    const ads = Array.isArray(d.ads) ? d.ads.map((v): AdAccountDay => {
      const a = object(v);
      return { id: text(a.id) ?? "", name: text(a.name) ?? "Unnamed account", spend: number(a.spend), attributedRevenue: number(a.attributedRevenue), currency: text(a.currency) ?? "", timeZone: text(a.timeZone) ?? "" };
    }) : null;
    const revenue = Array.isArray(d.revenue) ? d.revenue.map((v): RevenueFact => {
      const r = object(v);
      return { canonicalId: text(r.canonicalId) ?? "", provider: text(r.provider) ?? "Unknown provider", gross: number(r.gross), refunds: number(r.refunds), fees: number(r.fees), disputes: number(r.disputes), firstPaymentRevenue: number(r.firstPaymentRevenue), renewalRevenue: number(r.renewalRevenue), newPaidSubscriberIds: Array.isArray(r.newPaidSubscriberIds) && r.newPaidSubscriberIds.every((id) => typeof id === "string" && id.length > 0) ? r.newPaidSubscriberIds as string[] : null };
    }) : null;
    days.push({ date, ads, revenue, productCost: number(d.productCost), fulfillment: number(d.fulfillment), operatingExpenses: number(d.operatingExpenses), cashIn: number(d.cashIn), cashOut: number(d.cashOut), internalTransfersExcluded: d.internalTransfersExcluded === true });
  }
  const sources = Array.isArray(raw.sources) ? raw.sources.map((v): PerformanceSource => {
    const s = object(v);
    const stamp = text(s.syncedAt);
    return { id: text(s.id) ?? "unknown", name: text(s.name) ?? "Unknown source", status: s.status === "ready" || s.status === "error" ? s.status : "missing", syncedAt: stamp && Number.isFinite(Date.parse(stamp)) ? stamp : null, detail: text(s.detail) ?? "No source details" };
  }) : [];
  return { schemaVersion: 1, currency: raw.currency as string, timeZone, reconciled: raw.reconciled === true, days: days.sort((a, b) => a.date.localeCompare(b.date)), sources };
}

export function legacyPerformance(report: LoopReport): PerformanceDataset {
  return {
    schemaVersion: 1, currency: "USD", timeZone: "UTC", reconciled: false,
    days: report.daily.map((d) => ({ date: d.date, ads: null, revenue: null, productCost: d.productCost, fulfillment: d.fulfillment, operatingExpenses: null, cashIn: null, cashOut: null, internalTransfersExcluded: false, reportedRevenue: d.revenue, reportedSpend: d.adSpend })),
    sources: [
      { id: "loop", name: "Loop / 24F", status: report.source?.error ? "error" : report.source?.connected ? "ready" : "missing", syncedAt: report.source?.syncedAt ?? null, detail: report.source?.error ?? "Aggregate report · USD / UTC as defined by this repository" },
      { id: "meta", name: "Meta Ads", status: "missing", syncedAt: null, detail: "Aggregate spend available; account breakdown and attribution are not in the current contract" },
      { id: "payments", name: "Revenue providers", status: "missing", syncedAt: null, detail: "Confirm provider names and the payment / refund / fee contract" },
      { id: "mercury", name: "Mercury", status: "missing", syncedAt: null, detail: "Bank cash flow is not supplied by the current API" },
    ],
  };
}

/** An omitted reporting day is missing data, not a verified day with zero activity. */
export function withRangeCoverage(dataset: PerformanceDataset, from: string, to: string): PerformanceDataset {
  const first = Date.parse(`${from}T00:00:00Z`), last = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(first) || !Number.isFinite(last) || last <= first || last - first > 1100 * 86_400_000) return dataset;
  const existing = new Map(dataset.days.map((d) => [d.date, d]));
  const days: PerformanceDay[] = [];
  for (let stamp = first; stamp < last; stamp += 86_400_000) {
    const date = new Date(stamp).toISOString().slice(0, 10);
    days.push(existing.get(date) ?? { date, ads: null, revenue: null, productCost: null, fulfillment: null, operatingExpenses: null, cashIn: null, cashOut: null, internalTransfersExcluded: false });
  }
  return { ...dataset, days };
}

export function calculatePerformance(dataset: PerformanceDataset, accountId = "all"): DayMetrics[] {
  const seenFacts = new Map<string, string>();
  const seenSubscribers = new Set<string>();
  return dataset.days.map((day) => {
    const issues: string[] = [];
    const accounts: AdAccountDay[] = [];
    const seenAccounts = new Map<string, string>();
    let invalidAds = false;
    for (const a of day.ads ?? []) {
      const signature = JSON.stringify(a);
      if (!a.id || a.currency !== dataset.currency || a.timeZone !== dataset.timeZone) { invalidAds = true; issues.push("Account currency / reporting day needs reconciliation"); continue; }
      if (seenAccounts.has(a.id)) {
        if (seenAccounts.get(a.id) !== signature) { invalidAds = true; issues.push("Conflicting ad account facts"); }
        continue;
      }
      seenAccounts.set(a.id, signature);
      if (accountId === "all" || a.id === accountId) accounts.push(a);
    }
    const providers: RevenueFact[] = [];
    let invalidRevenue = false;
    for (const fact of day.revenue ?? []) {
      // Provider is intentionally excluded: the same payment may appear in two systems.
      const signature = JSON.stringify({ ...fact, provider: undefined, date: day.date });
      if (!fact.canonicalId) { invalidRevenue = true; issues.push("Payment identity is missing"); continue; }
      if (seenFacts.has(fact.canonicalId)) {
        if (seenFacts.get(fact.canonicalId) !== signature) { invalidRevenue = true; issues.push("Conflicting payment facts"); }
        continue;
      }
      seenFacts.set(fact.canonicalId, signature);
      providers.push(fact);
    }
    const total = (key: "gross" | "refunds" | "fees" | "disputes" | "firstPaymentRevenue" | "renewalRevenue") =>
      invalidRevenue || !dataset.reconciled || day.revenue === null ? null : providers.length ? strictSum(providers.map((r) => r[key])) : 0;
    const gross = total("gross");
    const refunds = total("refunds");
    const revenue = dataset.reconciled ? subtract(gross, [refunds]) : day.reportedRevenue ?? null;
    const spend = invalidAds ? null : day.ads === null ? day.reportedSpend ?? null : accounts.length ? strictSum(accounts.map((a) => a.spend)) : accountId === "all" ? 0 : null;
    const attributedRevenue = invalidAds || day.ads === null ? null : accounts.length ? strictSum(accounts.map((a) => a.attributedRevenue)) : accountId === "all" ? 0 : null;
    const fees = total("fees");
    const disputes = total("disputes");
    let newPaidSubscribers: Num = null;
    if (dataset.reconciled && day.revenue !== null && !invalidRevenue && providers.every((p) => p.newPaidSubscriberIds !== null)) {
      newPaidSubscribers = 0;
      for (const p of providers) for (const id of p.newPaidSubscriberIds ?? []) if (!seenSubscribers.has(id)) { seenSubscribers.add(id); newPaidSubscribers++; }
    }
    const scoped = accountId !== "all";
    const profit = scoped ? null : subtract(revenue, [fees, disputes, day.productCost, day.fulfillment, spend, day.operatingExpenses]);
    if (!dataset.reconciled) issues.push("Revenue basis and paid-subscriber definition unverified");
    if (!scoped && profit === null) issues.push("Profit awaits complete costs");
    if (scoped) issues.push("Store revenue is not allocated to individual ad accounts");
    return { date: day.date, revenue, gross, refunds, fees, disputes, spend, attributedRevenue, productCost: day.productCost, fulfillment: day.fulfillment, operatingExpenses: day.operatingExpenses, profit, blendedRoas: scoped || !dataset.reconciled ? null : ratio(revenue, spend), attributedRoas: ratio(attributedRevenue, spend), newPaidSubscribers, costPerNewSubscriber: scoped ? null : ratio(spend, newPaidSubscribers), firstPaymentRevenue: total("firstPaymentRevenue"), renewalRevenue: total("renewalRevenue"), cashFlow: day.internalTransfersExcluded ? subtract(day.cashIn, [day.cashOut]) : null, issues: [...new Set(issues)], accounts, providers };
  });
}

export function summarizePerformance(rows: DayMetrics[], scoped = false, reconciled = true) {
  const sum = (key: keyof DayMetrics) => strictSum(rows.map((d) => typeof d[key] === "number" ? d[key] as number : null));
  const revenue = sum("revenue"), spend = sum("spend"), newPaidSubscribers = sum("newPaidSubscribers");
  return { revenue, spend, profit: sum("profit"), newPaidSubscribers, costPerNewSubscriber: scoped ? null : ratio(spend, newPaidSubscribers), blendedRoas: scoped || !reconciled ? null : ratio(revenue, spend), attributedRoas: ratio(sum("attributedRevenue"), spend), refunds: sum("refunds"), fees: sum("fees"), firstPaymentRevenue: sum("firstPaymentRevenue"), renewalRevenue: sum("renewalRevenue"), cashFlow: sum("cashFlow"), completeDays: rows.filter((r) => r.profit !== null).length };
}
