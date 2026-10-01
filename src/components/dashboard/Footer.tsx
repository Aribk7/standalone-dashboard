import { timeAgo } from "@/lib/format";
import type { LoopReport } from "@/lib/types";

export function Footer({ report, asOf }: { report: LoopReport; asOf: string | null }) {
  const s = report.source;
  return (
    <footer className="mt-20 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-[12px] text-ink-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span>All figures in USD · dates in UTC</span>
        {s?.syncedAt && <span>Store synced {timeAgo(s.syncedAt)}</span>}
        {report.builtAt && <span>Report built {timeAgo(report.builtAt)}</span>}
        {asOf && <span>Fetched {timeAgo(asOf)}</span>}
      </div>
      <span>Data from your 24F account · refreshes every 15 minutes</span>
    </footer>
  );
}
