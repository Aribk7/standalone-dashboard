import assert from "node:assert/strict";
import test from "node:test";
import { calculatePerformance, legacyPerformance, normalizePerformance, ratio, strictSum, summarizePerformance, withRangeCoverage } from "../src/lib/performance.ts";

const fact = (overrides = {}) => ({ canonicalId: "payment-1", provider: "A", gross: 1000, refunds: 100, fees: 30, disputes: 5, firstPaymentRevenue: 400, renewalRevenue: 600, newPaidSubscriberIds: ["subscriber-1", "subscriber-2", "subscriber-3"], ...overrides });
const ad = (overrides = {}) => ({ id: "meta-1", name: "Account 1", spend: 200, attributedRevenue: 400, currency: "USD", timeZone: "UTC", ...overrides });
const day = (overrides = {}) => ({ date: "2026-10-01", ads: [ad()], revenue: [fact()], productCost: 100, fulfillment: 50, operatingExpenses: 20, cashIn: 800, cashOut: 300, internalTransfersExcluded: true, ...overrides });
const data = (days = [day()], overrides = {}) => ({ schemaVersion: 1, currency: "USD", timeZone: "UTC", reconciled: true, days, sources: [], ...overrides });

test("profit subtracts refunds once, then fees, disputes, COGS, fulfillment, ads and overhead", () => {
  const row = calculatePerformance(data())[0];
  assert.equal(row.revenue, 900);
  assert.equal(row.profit, 495);
  assert.equal(row.blendedRoas, 4.5);
  assert.equal(row.attributedRoas, 2);
  assert.equal(row.newPaidSubscribers, 3);
  assert.equal(row.costPerNewSubscriber, 200 / 3);
  assert.equal(row.cashFlow, 500);
});
test("loss-making days stay negative even when bank inflows are positive", () => {
  const row = calculatePerformance(data([day({ revenue: [fact({ gross: 100, refunds: 0 })] })]))[0];
  assert.equal(row.profit, -305);
  assert.equal(row.cashFlow, 500);
});
test("duplicate account snapshots count once; conflicting snapshots block money totals", () => {
  assert.equal(calculatePerformance(data([day({ ads: [ad(), ad()] })]))[0].spend, 200);
  const row = calculatePerformance(data([day({ ads: [ad(), ad({ spend: 201 })] })]))[0];
  assert.equal(row.spend, null);
  assert.equal(row.profit, null);
});
test("matching payment facts from different providers are counted once", () => {
  const row = calculatePerformance(data([day({ revenue: [fact(), fact({ provider: "B" })] })]))[0];
  assert.equal(row.revenue, 900);
  assert.equal(row.fees, 30);
  assert.equal(row.newPaidSubscribers, 3);
});
test("conflicting canonical payments are flagged and suppress derived totals", () => {
  const row = calculatePerformance(data([day({ revenue: [fact(), fact({ provider: "B", gross: 1200 })] })]))[0];
  assert.equal(row.revenue, null);
  assert.equal(row.profit, null);
  assert.ok(row.issues.includes("Conflicting payment facts"));
});
test("mixed account currencies and reporting days never silently aggregate", () => {
  assert.equal(calculatePerformance(data([day({ ads: [ad({ currency: "EUR" })] })]))[0].spend, null);
  assert.equal(calculatePerformance(data([day({ ads: [ad({ timeZone: "America/New_York" })] })]))[0].spend, null);
});
test("unique first paid subscribers are deduplicated across providers and days", () => {
  const rows = calculatePerformance(data([day(), day({ date: "2026-10-02", revenue: [fact({ canonicalId: "payment-2", newPaidSubscriberIds: ["subscriber-1", "subscriber-4"] })] })]));
  assert.deepEqual(rows.map((r) => r.newPaidSubscribers), [3, 1]);
  assert.equal(summarizePerformance(rows).newPaidSubscribers, 4);
});
test("renewals and a missing paid-subscriber definition do not become new acquisitions", () => {
  const renewal = calculatePerformance(data([day({ revenue: [fact({ newPaidSubscriberIds: [], firstPaymentRevenue: 0, renewalRevenue: 1000 })] })]))[0];
  assert.equal(renewal.newPaidSubscribers, 0);
  assert.equal(renewal.costPerNewSubscriber, null);
  assert.equal(calculatePerformance(data([day({ revenue: [fact({ newPaidSubscriberIds: null })] })]))[0].newPaidSubscribers, null);
});
test("ratios use totals, not an average of daily ROAS", () => {
  const rows = calculatePerformance(data([day(), day({ date: "2026-10-02", ads: [ad({ spend: 100 })], revenue: [fact({ canonicalId: "payment-2", gross: 200, refunds: 0, newPaidSubscriberIds: ["subscriber-4"] })] })]));
  assert.equal(summarizePerformance(rows).blendedRoas, 1100 / 300);
  assert.equal(summarizePerformance(rows).costPerNewSubscriber, 300 / 4);
});
test("account filtering changes spend, retains store revenue, and disables unallocated store ratios", () => {
  const row = calculatePerformance(data([day({ ads: [ad(), ad({ id: "meta-2", spend: 100, attributedRevenue: 300 })] })]), "meta-2")[0];
  assert.equal(row.spend, 100);
  assert.equal(row.revenue, 900);
  assert.equal(row.attributedRoas, 3);
  assert.equal(row.profit, null);
  assert.equal(row.blendedRoas, null);
  assert.equal(row.costPerNewSubscriber, null);
});
test("a missing day of costs keeps the full-period profit unavailable", () => {
  const rows = calculatePerformance(data([day(), day({ date: "2026-10-02", productCost: null, revenue: [fact({ canonicalId: "payment-2" })] })]));
  assert.equal(summarizePerformance(rows).profit, null);
  assert.equal(summarizePerformance(rows).completeDays, 1);
  assert.equal(strictSum([0, 10]), 10);
  assert.equal(strictSum([null, 10]), null);
  assert.equal(strictSum([]), null);
  assert.equal(ratio(10, 0), null);
});
test("cash flow requires explicit transfer exclusion and never changes profit", () => {
  const row = calculatePerformance(data([day({ cashIn: 50000, internalTransfersExcluded: false })]))[0];
  assert.equal(row.cashFlow, null);
  assert.equal(row.profit, 495);
});
test("an omitted reporting day becomes missing data, not zero or a complete period", () => {
  const rows = calculatePerformance(withRangeCoverage(data(), "2026-10-01", "2026-10-03"));
  assert.equal(rows.length, 2);
  assert.equal(rows[1].revenue, null);
  assert.equal(rows[1].spend, null);
  assert.equal(summarizePerformance(rows).revenue, null);
  assert.equal(summarizePerformance(rows).profit, null);
});
test("normalization rejects duplicate or impossible dates and preserves malformed money as missing", () => {
  assert.equal(normalizePerformance(data([day(), day()])), null);
  assert.equal(normalizePerformance(data([day({ date: "2026-99-32" })])), null);
  assert.equal(normalizePerformance(data([day({ date: "2026-02-30" })])), null);
  assert.equal(normalizePerformance(data([], { timeZone: "not-a-zone" })), null);
  const parsed = normalizePerformance(data([day({ productCost: false, operatingExpenses: "", cashIn: -10 })]));
  assert.equal(parsed.days[0].productCost, null);
  assert.equal(parsed.days[0].operatingExpenses, null);
  assert.equal(parsed.days[0].cashIn, null);
});
test("legacy aggregates remain visible without claiming verified profit, ROAS or paid acquisitions", () => {
  const legacy = legacyPerformance({ daily: [{ date: "2026-10-01", revenue: 1000, adSpend: 200, productCost: 100, fulfillment: 50 }], source: null });
  const row = calculatePerformance(legacy)[0];
  assert.equal(row.revenue, 1000);
  assert.equal(row.spend, 200);
  assert.equal(row.profit, null);
  assert.equal(row.blendedRoas, null);
  assert.equal(row.newPaidSubscribers, null);
});
