"use client";

import { motion } from "motion/react";
import { Wordmark } from "@/components/ui/Logo";
import { Segmented } from "@/components/ui/Segmented";
import { timeAgo } from "@/lib/format";
import { RANGE_IDS, RANGE_LABELS, type RangeId } from "@/lib/ranges";
import { AccountMenu } from "./AccountMenu";

const RANGE_OPTIONS = RANGE_IDS.map((id) => ({ value: id, label: RANGE_LABELS[id] }));

interface Props {
  range: RangeId;
  onRange: (r: RangeId) => void;
  onHoverRange: (r: RangeId) => void;
  storeName: string | null;
  syncedAt: string | null;
  syncing: boolean;
  sourceError: string | null;
  demo: boolean;
  fetching: boolean;
}

export function TopBar({ range, onRange, onHoverRange, storeName, syncedAt, syncing, sourceError, demo, fetching }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/70 backdrop-blur-2xl backdrop-saturate-150">
      {fetching && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px overflow-hidden" role="progressbar" aria-label="Loading">
          <div className="loading-bar" />
        </div>
      )}
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6">
        <Wordmark className="mr-auto xl:mr-0" />

        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="hidden min-w-0 items-center gap-2 rounded-full border border-line bg-surface/70 py-1 pl-2.5 pr-3 text-[12.5px] xl:mr-auto xl:flex"
          title={sourceError ?? undefined}
        >
          <span className="relative flex h-2 w-2">
            {(syncing || fetching) && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />}
            <span className={`relative inline-flex h-2 w-2 rounded-full ${sourceError ? "bg-bad" : syncing || fetching ? "bg-accent" : "bg-good"}`} />
          </span>
          <span className="truncate font-medium text-ink">{storeName ?? "Your store"}</span>
          <span className="text-ink-3">
            {sourceError ? "sync error" : syncing ? "syncing…" : syncedAt ? `synced ${timeAgo(syncedAt)}` : ""}
          </span>
          {demo && <span className="ml-1 rounded-md bg-warn/15 px-1.5 py-0.5 text-[11px] font-medium text-warn">Sample data</span>}
        </motion.div>

        <div className="no-scrollbar order-last -mx-4 w-[calc(100%+2rem)] overflow-x-auto px-4 sm:order-none sm:mx-0 sm:w-auto sm:overflow-visible sm:px-0">
          <Segmented label="Date range" options={RANGE_OPTIONS} value={range} onChange={onRange} onHover={onHoverRange} />
        </div>

        <AccountMenu demo={demo} />
      </div>
    </header>
  );
}
