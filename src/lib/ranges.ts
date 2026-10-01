// Date ranges used by the dashboard's range buttons. All dates are UTC;
// `from` is inclusive and `to` is exclusive (tomorrow, so today is included).

export const RANGE_IDS = ["24H", "7D", "30D", "90D", "6M", "YTD", "ALL"] as const;
export type RangeId = (typeof RANGE_IDS)[number];

export const RANGE_LABELS: Record<RangeId, string> = {
  "24H": "24H",
  "7D": "7D",
  "30D": "30D",
  "90D": "90D",
  "6M": "6M",
  YTD: "YTD",
  ALL: "All",
};

export const DEFAULT_RANGE: RangeId = "30D";

const DAY_MS = 86_400_000;

function utcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function isRangeId(value: unknown): value is RangeId {
  return typeof value === "string" && (RANGE_IDS as readonly string[]).includes(value);
}

export function resolveRange(id: RangeId, now = new Date()): { from: string; to: string } {
  const today = utcMidnight(now);
  const tomorrow = new Date(today.getTime() + DAY_MS);
  const daysBack = (n: number) => new Date(tomorrow.getTime() - n * DAY_MS);

  let from: Date;
  switch (id) {
    case "24H":
      from = today;
      break;
    case "7D":
      from = daysBack(7);
      break;
    case "30D":
      from = daysBack(30);
      break;
    case "90D":
      from = daysBack(90);
      break;
    case "6M":
      from = daysBack(182);
      break;
    case "YTD":
      from = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
      break;
    case "ALL":
      from = daysBack(1095);
      break;
  }
  return { from: isoDay(from), to: isoDay(tomorrow) };
}

/** Cookie that remembers the last range a browser picked. */
export const RANGE_COOKIE = "loop_range";
