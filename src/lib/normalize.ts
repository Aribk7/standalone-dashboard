import { num } from "./format";
import type {
  Cohort,
  Collection,
  DailyRow,
  LoopReport,
  LoopSource,
  LoopSummary,
  PeriodRow,
  ProductRow,
  Roas,
  SeriesPoint,
} from "./types";

// Turns whatever the API returned into the exact shape the UI expects, so a
// missing or oddly typed field degrades to "—" instead of breaking a view.

type Raw = Record<string, unknown>;

const obj = (v: unknown): Raw => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : {});
const arr = (v: unknown): Raw[] => (Array.isArray(v) ? v.map(obj) : []);
const str = (v: unknown): string | null => (typeof v === "string" ? v : v == null ? null : String(v));
const bool = (v: unknown): boolean | null => (typeof v === "boolean" ? v : v == null ? null : Boolean(v));

function nums<K extends string>(src: Raw, keys: readonly K[]): Record<K, number | null> {
  const out = {} as Record<K, number | null>;
  for (const k of keys) out[k] = num(src[k]);
  return out;
}

const SUMMARY_KEYS = [
  "mrr", "mrrStart", "mrrChange", "mrrGrowthPct", "mrrGrowthPerDay", "active", "activeStart", "newSubs",
  "churned", "netSubs", "paused", "monthlyChurn", "subscriberMonths", "lifetimeChurn", "lifetimeMonths",
  "arpu", "ltv", "revenue", "orders", "revenuePerOrder", "feeRate", "feePerOrder", "fulfillmentPerOrder",
  "productPerOrder", "contributionPerOrder", "ordersPerMonth", "contributionPerMonth", "lifetimeContribution",
  "cogs", "grossMargin", "spend", "newCustomers", "cac", "subscriberShare", "subscriberSpend", "newMrr",
  "spendPerNewMrr", "lifetimeMrrWon", "ltvMrrPerAdDollar", "ltvProfit", "ltvProfitRoas", "paybackMonths",
  "unitsPerWeek", "unitsPerMonth", "unitsShipped",
] as const;

const SERIES_KEYS = [
  "mrr", "active", "newSubs", "churned", "netSubs", "newMrr", "churnedMrr", "netMrr", "spend", "revenue",
  "cogs", "unitsShipped", "ltv",
] as const;

const PERIOD_KEYS = [
  "newSubs", "churned", "netMrr", "newMrr", "churnedMrr", "revenue", "spend", "cogs", "unitsShipped", "unitsSubscribed",
] as const;

const COHORT_KEYS = ["size", "retention", "realizedLtv", "activePaid", "activeRevenue", "revenue"] as const;

const COLLECTION_KEYS = [
  "grossMrr", "churnRate", "churnAdjustment", "failedPaymentRate", "failedCycles", "attemptedCycles",
  "failedAdjustment", "failedMrr", "failedContracts", "received", "refunds", "refundRate", "refundAdjustment",
  "trueMrr", "active",
] as const;

const DAILY_KEYS = [
  "orders", "revenue", "refunds", "adSpend", "productCost", "fulfillment", "cogs", "netAfterAds", "missingCosts",
  "missingProductCosts", "missingFulfillmentCharges", "estimatedOrders",
] as const;

const ROAS_KEYS = [
  "spend", "revenue", "fulfillment", "disputes", "cogs", "orders", "firstOrders", "feeRate", "classicRoas",
  "contribution", "realRoas", "netAfterAds", "cac", "subscribeRate", "lifetimeMonths", "firstContribution",
  "renewalContribution", "renewalsPerFirstOrder", "ltvContribution", "ltvRoas",
] as const;

export function normalizeLoopReport(input: unknown): LoopReport {
  const d = obj(input);
  const s = obj(d.summary);
  const mvf = obj(s.metaVsFulfillment);
  const pk = s.productKnown;

  const summary: LoopSummary = {
    ...nums(s, SUMMARY_KEYS),
    productKnown: typeof pk === "boolean" ? pk : num(pk),
    metaVsFulfillment: s.metaVsFulfillment ? { meta: num(mvf.meta), fulfillment: num(mvf.fulfillment), ratio: num(mvf.ratio) } : null,
  };

  const byDate = <T extends { date: string }>(rows: T[]) => rows.filter((r) => r.date).sort((a, b) => a.date.localeCompare(b.date));

  const series: SeriesPoint[] = byDate(arr(d.series).map((r) => ({ date: str(r.date) ?? "", ...nums(r, SERIES_KEYS) })));
  const period = (rows: unknown): PeriodRow[] =>
    arr(rows)
      .map((r) => ({ start: str(r.start) ?? "", ...nums(r, PERIOD_KEYS) }))
      .filter((r) => r.start)
      .sort((a, b) => a.start.localeCompare(b.start));
  const cohorts: Cohort[] = arr(d.cohorts)
    .map((r) => ({ month: str(r.month) ?? "", ...nums(r, COHORT_KEYS) }))
    .filter((r) => r.month)
    .sort((a, b) => a.month.localeCompare(b.month));
  const products: ProductRow[] = arr(d.products).map((r) => ({
    key: str(r.key) ?? str(r.title) ?? "",
    title: str(r.title),
    units: num(r.units),
    subscriptions: num(r.subscriptions),
  }));
  const daily: DailyRow[] = byDate(arr(d.daily).map((r) => ({ date: str(r.date) ?? "", ...nums(r, DAILY_KEYS) })));

  const c = d.collection ? obj(d.collection) : null;
  const collection: Collection | null = c ? nums(c, COLLECTION_KEYS) : null;

  const r = d.roas ? obj(d.roas) : null;
  const roas: Roas | null = r
    ? { ...nums(r, ROAS_KEYS), connected: (r.connected as Roas["connected"]) ?? null }
    : null;

  const src = d.source ? obj(d.source) : null;
  const source: LoopSource | null = src
    ? {
        connected: bool(src.connected),
        storeName: str(src.storeName),
        syncedAt: str(src.syncedAt),
        syncing: bool(src.syncing),
        error: str(src.error),
        subscriptions: num(src.subscriptions),
        orders: num(src.orders),
        metaConnected: bool(src.metaConnected),
        productCostPerUnit: num(src.productCostPerUnit),
        productCostCurrency: str(src.productCostCurrency),
        rateDate: str(src.rateDate),
      }
    : null;

  return {
    summary,
    series,
    weekly: period(d.weekly),
    monthly: period(d.monthly),
    cohorts,
    products,
    collection,
    daily,
    roas,
    source,
    builtAt: str(d.builtAt) ?? str(src?.builtAt),
  };
}
