import "server-only";
import type { Cohort, DailyRow, LoopReport, PeriodRow, ProductRow, SeriesPoint } from "../types";
import type { PerformanceDataset, RevenueFact } from "../performance";

// Entirely invented sample data in the documented /loop/report shape, used for
// local development and the optional demo sign-in. It describes no real store;
// costs are random placeholder amounts, not real rates or prices from 24F or
// anyone else.

const DAY = 86_400_000;
const HISTORY_DAYS = 1100;

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function poisson(r: () => number, lambda: number) {
  const l = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= r();
  } while (p > l);
  return k - 1;
}

interface Day {
  date: string;
  active: number;
  mrr: number;
  newSubs: number;
  churned: number;
  newMrr: number;
  churnedMrr: number;
  spend: number;
  revenue: number;
  orders: number;
  firstOrders: number;
  newCustomers: number;
  units: number;
  refunds: number;
  fees: number;
  fulfillment: number;
  productCost: number;
  paused: number;
}

// Placeholder payment-processing share of the invented revenue.
const FEE_SHARE = 0.03;

let history: { built: string; days: Day[] } | null = null;

function buildHistory(today: Date): Day[] {
  const key = today.toISOString().slice(0, 10);
  if (history?.built === key) return history.days;

  const r = rng(24_2026);
  const days: Day[] = [];
  let active = 620;
  const start = today.getTime() - (HISTORY_DAYS - 1) * DAY;

  for (let i = 0; i < HISTORY_DAYS; i++) {
    const t = start + i * DAY;
    const d = new Date(t);
    const progress = i / HISTORY_DAYS;
    const season = 1 + 0.18 * Math.sin((2 * Math.PI * (d.getUTCMonth() + 1.5)) / 12);
    const weekday = d.getUTCDay();
    const weekdayLift = weekday === 0 || weekday === 6 ? 0.82 : 1.06;
    const arpu = 37.5 + 3.5 * progress + 0.6 * Math.sin(i / 40);

    const spend = Math.round((520 + 980 * progress) * season * weekdayLift * (0.85 + r() * 0.3));
    const newSubs = poisson(r, (spend / 62) * (0.9 + r() * 0.2));
    const churned = poisson(r, active * (0.066 / 30.4375) * (0.85 + r() * 0.35));
    const newMrr = newSubs * arpu * (0.92 + r() * 0.16);
    const churnedMrr = churned * arpu * (0.9 + r() * 0.2);
    active = Math.max(0, active + newSubs - churned);
    const mrr = active * arpu;

    const renewals = poisson(r, (active * 0.92) / 30.4375);
    const firstOrders = newSubs + poisson(r, newSubs * 0.55);
    const orders = renewals + firstOrders;
    const aov = 44 + 4 * progress + r() * 3;
    const revenue = orders * aov;
    const refunds = r() < 0.12 ? aov * (1 + Math.floor(r() * 3)) : 0;
    const units = Math.round(orders * (1.6 + r() * 0.3));

    days.push({
      date: d.toISOString().slice(0, 10),
      active,
      mrr,
      newSubs,
      churned,
      newMrr,
      churnedMrr,
      spend,
      revenue,
      orders,
      firstOrders,
      newCustomers: firstOrders,
      units,
      refunds,
      fees: revenue * FEE_SHARE,
      // Random placeholder amounts that vary freely day to day.
      fulfillment: orders * (3 + r() * 9),
      productCost: units * (1.5 + r() * 5),
      paused: Math.round(active * 0.035),
    });
  }
  history = { built: key, days };
  return days;
}

const sum = <T>(rows: T[], f: (r: T) => number) => rows.reduce((a, r) => a + f(r), 0);
const div = (a: number, b: number) => (b ? a / b : null);
const round2 = (n: number) => Math.round(n * 100) / 100;

function periodRows(days: Day[], startOf: (d: Date) => string): PeriodRow[] {
  const groups = new Map<string, Day[]>();
  for (const d of days) {
    const k = startOf(new Date(`${d.date}T00:00:00Z`));
    groups.set(k, [...(groups.get(k) ?? []), d]);
  }
  return [...groups.entries()].map(([start, g]) => ({
    start,
    newSubs: sum(g, (d) => d.newSubs),
    churned: sum(g, (d) => d.churned),
    newMrr: round2(sum(g, (d) => d.newMrr)),
    churnedMrr: round2(sum(g, (d) => d.churnedMrr)),
    netMrr: round2(sum(g, (d) => d.newMrr - d.churnedMrr)),
    revenue: round2(sum(g, (d) => d.revenue - d.refunds)),
    spend: round2(sum(g, (d) => d.spend)),
    cogs: round2(sum(g, (d) => d.fulfillment + d.productCost)),
    unitsShipped: sum(g, (d) => d.units),
    unitsSubscribed: Math.round(g[g.length - 1].active * 1.7),
  }));
}

const weekStart = (d: Date) => {
  const offset = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - offset * DAY).toISOString().slice(0, 10);
};
const monthStart = (d: Date) => `${d.toISOString().slice(0, 7)}-01`;

function demoPerformance(days: Day[], daily: DailyRow[]): PerformanceDataset {
  const syncedAt = new Date(Date.now() - 6 * 60_000).toISOString();
  return {
    schemaVersion: 1, currency: "USD", timeZone: "UTC", reconciled: true,
    sources: [
      { id: "meta", name: "Meta Ads", status: "ready", syncedAt, detail: "3 fictional accounts · 7-day click / 1-day view attribution" },
      { id: "payments", name: "Revenue providers", status: "ready", syncedAt, detail: "2 fictional processors · actual provider names await confirmation" },
      { id: "loop", name: "Loop", status: "ready", syncedAt, detail: "Fictional first paid subscribers, separate from renewals" },
      { id: "mercury", name: "Mercury", status: "ready", syncedAt, detail: "Illustrative settlement cash flow · internal transfers excluded" },
    ],
    days: days.map((d, i) => {
      const split = Math.floor(d.newSubs * 0.64);
      const providers: RevenueFact[] = [0.64, 0.36].map((share, p) => ({
        canonicalId: `sample-${d.date}-processor-${p}`, provider: `Sample processor ${p === 0 ? "A" : "B"}`,
        gross: d.revenue * share, refunds: d.refunds * share, fees: d.fees * share, disputes: d.revenue * 0.002 * share,
        firstPaymentRevenue: d.revenue * d.newSubs / Math.max(1, d.orders) * share,
        renewalRevenue: d.revenue * Math.max(0, d.orders - d.firstOrders) / Math.max(1, d.orders) * share,
        newPaidSubscriberIds: Array.from({ length: p === 0 ? split : d.newSubs - split }, (_, n) => `sample-sub-${d.date}-${p}-${n}`),
      }));
      return {
        date: d.date, revenue: providers,
        ads: [0.5, 0.32, 0.18].map((share, a) => ({ id: `sample-meta-${a}`, name: ["Prospecting", "Growth", "Retargeting"][a], spend: d.spend * share, attributedRevenue: d.spend * share * (2.25 + a * 0.32 + Math.sin(i / 5) * 0.4), currency: "USD", timeZone: "UTC" })),
        productCost: daily[i].cogs === null ? null : daily[i].productCost, fulfillment: daily[i].fulfillment, operatingExpenses: 120,
        cashIn: d.revenue * 0.92, cashOut: d.spend + d.fulfillment + d.productCost + 120,
        internalTransfersExcluded: true,
      };
    }),
  };
}

export function demoLoopReport(from: string, to: string): LoopReport {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const all = buildHistory(today);
  const days = all.filter((d) => d.date >= from && d.date < to);
  const before = all.filter((d) => d.date < from);
  const last = days[days.length - 1] ?? all[all.length - 1];
  const startDay = before[before.length - 1] ?? days[0] ?? last;

  const last90 = all.slice(-90);
  const subscriberMonths = sum(days, (d) => d.active) / 30.4375;
  const churned = sum(days, (d) => d.churned);
  const newSubs = sum(days, (d) => d.newSubs);
  const monthlyChurn = div(churned, subscriberMonths) ?? 0;
  const lifetimeChurn = div(sum(last90, (d) => d.churned), sum(last90, (d) => d.active) / 30.4375) ?? 0;
  const lifetimeMonths = Math.min(24, lifetimeChurn ? 1 / lifetimeChurn : 24);
  const mrr = last.mrr;
  const mrrStart = startDay.mrr;
  const arpu = div(mrr, last.active) ?? 0;

  const orders = sum(days, (d) => d.orders);
  const revenue = sum(days, (d) => d.revenue - d.refunds);
  const revenuePerOrder = div(revenue, orders) ?? 0;
  const feeRate = FEE_SHARE;
  const feePerOrder = revenuePerOrder * feeRate;
  const fulfillmentPerOrder = div(sum(days, (d) => d.fulfillment), orders) ?? 0;
  const productPerOrder = div(sum(days, (d) => d.productCost), orders) ?? 0;
  const contributionPerOrder = revenuePerOrder - feePerOrder - fulfillmentPerOrder - productPerOrder;
  const ordersPerMonth = 1.04;
  const contributionPerMonth = contributionPerOrder * ordersPerMonth;
  const lifetimeContribution = contributionPerMonth * lifetimeMonths;
  const cogs = sum(days, (d) => d.fulfillment + d.productCost);
  const spend = sum(days, (d) => d.spend);
  const newCustomers = sum(days, (d) => d.newCustomers);
  const cac = div(spend, newCustomers);
  const subscriberShare = div(newSubs, newCustomers);
  const subscriberSpend = cac !== null ? cac * newSubs : null;
  const newMrr = sum(days, (d) => d.newMrr);
  const lifetimeMrrWon = newMrr * lifetimeMonths;
  const fulfillmentTotal = sum(days, (d) => d.fulfillment);
  const n = Math.max(1, days.length);

  const series: SeriesPoint[] = days.map((d) => ({
    date: d.date,
    mrr: round2(d.mrr),
    active: d.active,
    newSubs: d.newSubs,
    churned: d.churned,
    netSubs: d.newSubs - d.churned,
    newMrr: round2(d.newMrr),
    churnedMrr: round2(d.churnedMrr),
    netMrr: round2(d.newMrr - d.churnedMrr),
    spend: d.spend,
    revenue: round2(d.revenue - d.refunds),
    cogs: round2(d.fulfillment + d.productCost),
    unitsShipped: d.units,
    ltv: round2(d.mrr / Math.max(1, d.active) / 0.066),
  }));

  const cohorts: Cohort[] = [];
  for (let m = 11; m >= 0; m--) {
    const ref = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - m, 1));
    const key = ref.toISOString().slice(0, 7);
    const size = sum(all.filter((d) => d.date.startsWith(key)), (d) => d.newSubs);
    const retention = Math.pow(0.935, m) * (0.97 + (m % 3) * 0.01);
    const realizedLtv = 41 * (1 + m * 0.86);
    cohorts.push({
      month: key,
      size,
      retention: Math.min(1, round2(retention * 100) / 100),
      realizedLtv: round2(realizedLtv),
      activePaid: round2(41 * (m + 1)),
      activeRevenue: round2(size * retention * 41),
      revenue: round2(size * realizedLtv),
    });
  }

  const products: ProductRow[] = [
    ["SKU-GRN-30", "Daily Greens · 30 servings", 1410],
    ["SKU-PRO-VAN", "Plant Protein · Vanilla", 980],
    ["SKU-PRO-CHO", "Plant Protein · Cacao", 760],
    ["SKU-ELC-20", "Electrolytes · 20 sticks", 545],
    ["SKU-SLP-60", "Night Magnesium · 60 caps", 380],
    ["SKU-COL-30", "Marine Collagen · 30 days", 245],
  ].map(([key, title, units]) => {
    const u = Math.round((units as number) * (last.active / 2400));
    return { key: key as string, title: title as string, units: u, subscriptions: Math.round(u / 1.7) };
  });

  const daily: DailyRow[] = days.map((d, i) => {
    const pending = i >= days.length - 2;
    const estimatedOrders = pending ? Math.round(d.orders * 0.6) : 0;
    const missingProductCosts = i === days.length - 1 ? 2 : 0;
    const cogsKnown = missingProductCosts === 0;
    const productCost = round2(d.productCost);
    const fulfillment = round2(d.fulfillment);
    const cogsDay = cogsKnown ? round2(d.productCost + d.fulfillment) : null;
    return {
      date: d.date,
      orders: d.orders,
      revenue: round2(d.revenue - d.refunds),
      refunds: round2(d.refunds),
      adSpend: d.spend,
      productCost,
      fulfillment,
      cogs: cogsDay,
      netAfterAds: cogsDay === null ? null : round2(d.revenue - d.refunds - cogsDay - d.spend),
      missingCosts: missingProductCosts,
      missingProductCosts,
      missingFulfillmentCharges: 0,
      estimatedOrders,
    };
  });

  const last30 = all.slice(-30);
  const grossMrr = last.mrr;
  const churnRate = div(sum(last30, (d) => d.churned), sum(last30, (d) => d.active) / 30.4375) ?? 0;
  const churnAdjustment = grossMrr * churnRate;
  const failedPaymentRate = 0.043;
  const failedAdjustment = (grossMrr - churnAdjustment) * failedPaymentRate;
  const received = sum(last30, (d) => d.revenue);
  const refundsTotal = sum(last30, (d) => d.refunds);
  const refundRate = div(refundsTotal, received) ?? 0;
  const refundAdjustment = (grossMrr - churnAdjustment - failedAdjustment) * refundRate;

  const roasRevenue = revenue;
  const disputes = round2(revenue * 0.002);
  const contribution = roasRevenue - roasRevenue * feeRate - fulfillmentTotal - sum(days, (d) => d.productCost) - disputes;
  const firstOrders = sum(days, (d) => d.firstOrders);
  const firstContribution = contributionPerOrder * 1.12;
  const renewalContribution = contributionPerOrder * 0.96;
  const renewalsPerFirstOrder = (subscriberShare ?? 0) * (lifetimeMonths * ordersPerMonth - 1);
  const ltvContribution = firstContribution + renewalsPerFirstOrder * renewalContribution;
  const roasCac = div(spend, firstOrders);

  return {
    performance: demoPerformance(days, daily),
    summary: {
      mrr: round2(mrr),
      mrrStart: round2(mrrStart),
      mrrChange: round2(mrr - mrrStart),
      mrrGrowthPct: div(mrr - mrrStart, mrrStart),
      mrrGrowthPerDay: round2((mrr - mrrStart) / n),
      active: last.active,
      activeStart: startDay.active,
      newSubs,
      churned,
      netSubs: newSubs - churned,
      paused: last.paused,
      monthlyChurn,
      subscriberMonths: round2(subscriberMonths),
      lifetimeChurn,
      lifetimeMonths,
      arpu: round2(arpu),
      ltv: monthlyChurn ? round2(arpu / monthlyChurn) : null,
      revenue: round2(revenue),
      orders,
      revenuePerOrder: round2(revenuePerOrder),
      feeRate,
      feePerOrder: round2(feePerOrder),
      fulfillmentPerOrder: round2(fulfillmentPerOrder),
      productPerOrder: round2(productPerOrder),
      productKnown: true,
      contributionPerOrder: round2(contributionPerOrder),
      ordersPerMonth,
      contributionPerMonth: round2(contributionPerMonth),
      lifetimeContribution: round2(lifetimeContribution),
      cogs: round2(cogs),
      grossMargin: div(revenue - cogs, revenue),
      spend,
      newCustomers,
      cac: cac === null ? null : round2(cac),
      subscriberShare,
      subscriberSpend: subscriberSpend === null ? null : round2(subscriberSpend),
      newMrr: round2(newMrr),
      spendPerNewMrr: subscriberSpend === null ? null : div(subscriberSpend, newMrr),
      lifetimeMrrWon: round2(lifetimeMrrWon),
      ltvMrrPerAdDollar: subscriberSpend ? lifetimeMrrWon / subscriberSpend : null,
      ltvProfit: cac === null ? null : round2(lifetimeContribution - cac),
      ltvProfitRoas: cac ? lifetimeContribution / cac : null,
      paybackMonths: cac !== null && contributionPerMonth ? cac / contributionPerMonth : null,
      metaVsFulfillment: { meta: spend, fulfillment: round2(fulfillmentTotal), ratio: div(spend, fulfillmentTotal) },
      unitsPerWeek: Math.round((last.active * 1.7 * 7) / 30.4375),
      unitsPerMonth: Math.round(last.active * 1.7),
      unitsShipped: sum(days, (d) => d.units),
    },
    series,
    weekly: periodRows(days, weekStart),
    monthly: periodRows(days, monthStart),
    cohorts,
    products,
    collection: {
      grossMrr: round2(grossMrr),
      churnRate,
      churnAdjustment: round2(churnAdjustment),
      failedPaymentRate,
      failedCycles: Math.round(last.active * 0.043),
      attemptedCycles: last.active,
      failedAdjustment: round2(failedAdjustment),
      failedMrr: round2(failedAdjustment * 1.4),
      failedContracts: Math.round(last.active * 0.031),
      received: round2(received),
      refunds: round2(refundsTotal),
      refundRate,
      refundAdjustment: round2(refundAdjustment),
      trueMrr: round2(grossMrr - churnAdjustment - failedAdjustment - refundAdjustment),
      active: last.active,
    },
    daily,
    roas: {
      spend,
      revenue: round2(roasRevenue),
      fulfillment: round2(fulfillmentTotal),
      disputes,
      cogs: round2(cogs),
      orders,
      firstOrders,
      feeRate,
      classicRoas: div(roasRevenue, spend),
      contribution: round2(contribution),
      realRoas: div(contribution, spend),
      netAfterAds: round2(contribution - spend),
      cac: roasCac === null ? null : round2(roasCac),
      subscribeRate: subscriberShare,
      lifetimeMonths,
      firstContribution: round2(firstContribution),
      renewalContribution: round2(renewalContribution),
      renewalsPerFirstOrder,
      ltvContribution: round2(ltvContribution),
      ltvRoas: roasCac ? ltvContribution / roasCac : null,
      connected: { shopify: true, loop: true, meta: true, fulfillment: true },
    },
    source: {
      connected: true,
      storeName: "Demo Store",
      syncedAt: new Date(Date.now() - 6 * 60_000).toISOString(),
      syncing: false,
      error: null,
      subscriptions: Math.round(last.active * 1.9),
      orders: sum(all, (d) => d.orders),
      metaConnected: true,
      productCostPerUnit: null,
      productCostCurrency: null,
      rateDate: today.toISOString().slice(0, 10),
    },
    builtAt: new Date(Date.now() - 4 * 60_000).toISOString(),
  };
}
