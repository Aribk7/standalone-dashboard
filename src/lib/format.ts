// Number and date formatting shared by every view. Everything in the Loop
// report is USD.

export function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

const usd0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usd2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usdCompact = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
const int = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const dec1 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export const DASH = "—";

/** $12,480 — whole dollars once amounts are large, cents when small. */
export function money(value: unknown, opts: { cents?: boolean; compact?: boolean; sign?: boolean } = {}): string {
  const n = num(value);
  if (n === null) return DASH;
  const abs = Math.abs(n);
  let out: string;
  if (opts.compact && abs >= 10_000) out = usdCompact.format(abs);
  else if (opts.cents ?? abs < 100) out = usd2.format(abs);
  else out = usd0.format(abs);
  if (n < 0) return `−${out}`;
  return opts.sign && n > 0 ? `+${out}` : out;
}

export function count(value: unknown, opts: { compact?: boolean; sign?: boolean } = {}): string {
  const n = num(value);
  if (n === null) return DASH;
  const abs = Math.abs(n);
  const out = opts.compact && abs >= 10_000 ? compact.format(abs) : int.format(abs);
  if (n < 0) return `−${out}`;
  return opts.sign && n > 0 ? `+${out}` : out;
}

export function decimal(value: unknown, digits = 1): string {
  const n = num(value);
  if (n === null) return DASH;
  return n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** Ratios arrive as fractions (0.042 → 4.2%). */
export function pct(value: unknown, opts: { digits?: number; sign?: boolean } = {}): string {
  const n = num(value);
  if (n === null) return DASH;
  const v = n * 100;
  const digits = opts.digits ?? (Math.abs(v) < 10 ? 1 : 0);
  const out = Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  if (v < 0) return `−${out}%`;
  return opts.sign && v > 0 ? `+${out}%` : `${out}%`;
}

export function multiple(value: unknown): string {
  const n = num(value);
  if (n === null) return DASH;
  return `${dec1.format(n)}×`;
}

export function months(value: unknown): string {
  const n = num(value);
  if (n === null) return DASH;
  return `${dec1.format(n)} mo`;
}

const dayFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const monthFmt = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
const fullFmt = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

function parseDay(value: string): Date {
  return new Date(value.length <= 10 ? `${value}T00:00:00Z` : value);
}

export function shortDate(value: string): string {
  return dayFmt.format(parseDay(value));
}

export function monthLabel(value: string): string {
  return monthFmt.format(parseDay(value.length === 7 ? `${value}-01` : value));
}

export function fullDate(value: string): string {
  return fullFmt.format(parseDay(value));
}

export function timeAgo(value: string | null | undefined, now = Date.now()): string {
  if (!value) return DASH;
  const t = new Date(value).getTime();
  if (!Number.isFinite(t)) return DASH;
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} d ago`;
}

export type FormatKind = "money" | "moneyCents" | "moneyCompact" | "count" | "countCompact" | "pct" | "multiple" | "months" | "decimal";

/** One entry point so client components can pass a format by name. */
export function fmt(kind: FormatKind, value: unknown, opts: { sign?: boolean } = {}): string {
  switch (kind) {
    case "money":
      return money(value, { sign: opts.sign });
    case "moneyCents":
      return money(value, { cents: true, sign: opts.sign });
    case "moneyCompact":
      return money(value, { compact: true, sign: opts.sign });
    case "count":
      return count(value, { sign: opts.sign });
    case "countCompact":
      return count(value, { compact: true, sign: opts.sign });
    case "pct":
      return pct(value, { sign: opts.sign });
    case "multiple":
      return multiple(value);
    case "months":
      return months(value);
    case "decimal":
      return decimal(value);
  }
}
