// Rolls daily rows up into weeks or months when a range has too many days to
// draw as individual bars.

export type Grain = "day" | "week" | "month";

export function grainFor(days: number): Grain {
  if (days <= 92) return "day";
  if (days <= 400) return "week";
  return "month";
}

function bucketKey(date: string, grain: Grain): string {
  if (grain === "day") return date;
  if (grain === "month") return `${date.slice(0, 7)}-01`;
  const d = new Date(`${date}T00:00:00Z`);
  const offset = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - offset * 86_400_000).toISOString().slice(0, 10);
}

/** Sums the chosen fields per bucket. A bucket's field is null only if every day was null. */
export function bucketSum<T extends { date: string }, K extends keyof T>(rows: T[], keys: K[], grain: Grain): ({ date: string } & Record<K, number | null>)[] {
  const out = new Map<string, { date: string } & Record<K, number | null>>();
  for (const r of rows) {
    const k = bucketKey(r.date, grain);
    let b = out.get(k);
    if (!b) {
      b = { date: k } as { date: string } & Record<K, number | null>;
      for (const key of keys) (b as Record<K, number | null>)[key] = null;
      out.set(k, b);
    }
    for (const key of keys) {
      const v = r[key] as unknown as number | null;
      if (v !== null && v !== undefined) (b as Record<K, number | null>)[key] = ((b[key] as number | null) ?? 0) + v;
    }
  }
  return [...out.values()];
}
