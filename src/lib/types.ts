// Shapes of the 24F Client API v1 responses used by the dashboard.
// Every figure is nullable: a null means the source behind it is not synced yet.

export type Num = number | null;

export interface MetaVsFulfillment {
  meta: Num;
  fulfillment: Num;
  ratio: Num;
}

export interface LoopSummary {
  mrr: Num;
  mrrStart: Num;
  mrrChange: Num;
  mrrGrowthPct: Num;
  mrrGrowthPerDay: Num;
  active: Num;
  activeStart: Num;
  newSubs: Num;
  churned: Num;
  netSubs: Num;
  paused: Num;
  monthlyChurn: Num;
  subscriberMonths: Num;
  lifetimeChurn: Num;
  lifetimeMonths: Num;
  arpu: Num;
  ltv: Num;
  revenue: Num;
  orders: Num;
  revenuePerOrder: Num;
  feeRate: Num;
  feePerOrder: Num;
  fulfillmentPerOrder: Num;
  productPerOrder: Num;
  productKnown: number | boolean | null;
  contributionPerOrder: Num;
  ordersPerMonth: Num;
  contributionPerMonth: Num;
  lifetimeContribution: Num;
  cogs: Num;
  grossMargin: Num;
  spend: Num;
  newCustomers: Num;
  cac: Num;
  subscriberShare: Num;
  subscriberSpend: Num;
  newMrr: Num;
  spendPerNewMrr: Num;
  lifetimeMrrWon: Num;
  ltvMrrPerAdDollar: Num;
  ltvProfit: Num;
  ltvProfitRoas: Num;
  paybackMonths: Num;
  metaVsFulfillment: MetaVsFulfillment | null;
  unitsPerWeek: Num;
  unitsPerMonth: Num;
  unitsShipped: Num;
}

export interface SeriesPoint {
  date: string;
  mrr: Num;
  active: Num;
  newSubs: Num;
  churned: Num;
  netSubs: Num;
  newMrr: Num;
  churnedMrr: Num;
  netMrr: Num;
  spend: Num;
  revenue: Num;
  cogs: Num;
  unitsShipped: Num;
  ltv: Num;
}

export interface PeriodRow {
  start: string;
  newSubs: Num;
  churned: Num;
  netMrr: Num;
  newMrr: Num;
  churnedMrr: Num;
  revenue: Num;
  spend: Num;
  cogs: Num;
  unitsShipped: Num;
  unitsSubscribed: Num;
}

export interface Cohort {
  month: string;
  size: Num;
  retention: Num;
  realizedLtv: Num;
  activePaid: Num;
  activeRevenue: Num;
  revenue: Num;
}

export interface ProductRow {
  key: string;
  title: string | null;
  units: Num;
  subscriptions: Num;
}

export interface Collection {
  grossMrr: Num;
  churnRate: Num;
  churnAdjustment: Num;
  failedPaymentRate: Num;
  failedCycles: Num;
  attemptedCycles: Num;
  failedAdjustment: Num;
  failedMrr: Num;
  failedContracts: Num;
  received: Num;
  refunds: Num;
  refundRate: Num;
  refundAdjustment: Num;
  trueMrr: Num;
  active: Num;
}

export interface DailyRow {
  date: string;
  orders: Num;
  revenue: Num;
  refunds: Num;
  adSpend: Num;
  productCost: Num;
  fulfillment: Num;
  cogs: Num;
  netAfterAds: Num;
  missingCosts: Num;
  missingProductCosts: Num;
  missingFulfillmentCharges: Num;
  estimatedOrders: Num;
}

export interface Roas {
  spend: Num;
  revenue: Num;
  fulfillment: Num;
  disputes: Num;
  cogs: Num;
  orders: Num;
  firstOrders: Num;
  feeRate: Num;
  classicRoas: Num;
  contribution: Num;
  realRoas: Num;
  netAfterAds: Num;
  cac: Num;
  subscribeRate: Num;
  lifetimeMonths: Num;
  firstContribution: Num;
  renewalContribution: Num;
  renewalsPerFirstOrder: Num;
  ltvContribution: Num;
  ltvRoas: Num;
  connected: Record<string, boolean> | string[] | null;
}

export interface LoopSource {
  connected: boolean | null;
  storeName: string | null;
  syncedAt: string | null;
  syncing: boolean | null;
  error: string | null;
  subscriptions: Num;
  orders: Num;
  metaConnected: boolean | null;
  productCostPerUnit: Num;
  productCostCurrency: string | null;
  rateDate: string | null;
}

export interface LoopReport {
  summary: LoopSummary;
  series: SeriesPoint[];
  weekly: PeriodRow[];
  monthly: PeriodRow[];
  cohorts: Cohort[];
  products: ProductRow[];
  collection: Collection | null;
  daily: DailyRow[];
  roas: Roas | null;
  source: LoopSource | null;
  builtAt: string | null;
}

/** What the dashboard's own API returns to the browser. */
export interface ReportPayload<T> {
  data: T;
  asOf: string | null;
  range: { id: string; from: string; to: string };
  demo: boolean;
}

/** Error body the dashboard's own API returns to the browser. */
export interface ApiErrorBody {
  error: {
    code:
      | "unauthenticated"
      | "key_invalid"
      | "not_activated"
      | "not_connected"
      | "rate_limited"
      | "bad_request"
      | "upstream"
      | "server";
    message: string;
    retryAfter?: number;
  };
}
