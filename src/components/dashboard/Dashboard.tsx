"use client";

import { QueryClient, QueryClientProvider, keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, getJson, postJson } from "@/lib/client";
import { RANGE_COOKIE, type RangeId } from "@/lib/ranges";
import type { LoopReport, ReportPayload } from "@/lib/types";
import { Footer } from "./Footer";
import { DailyPerformance } from "./DailyPerformance";
import { SectionNav } from "./SectionNav";
import { ErrorState, LoadingState, RateLimitBanner } from "./States";
import { TopBar } from "./TopBar";
import { Acquisition } from "./sections/Acquisition";
import { Cohorts } from "./sections/Cohorts";
import { Collection } from "./sections/Collection";
import { Growth } from "./sections/Growth";
import { Overview } from "./sections/Overview";
import { Products } from "./sections/Products";
import { StorePnl } from "./sections/StorePnl";
import { UnitEconomics } from "./sections/UnitEconomics";



const reportQuery = (range: RangeId) => ({
  queryKey: ["loop-report", range] as const,
  queryFn: ({ signal }: { signal: AbortSignal }) => getJson<ReportPayload<LoopReport>>(`/api/loop/report?range=${range}`, signal),
  staleTime: 5 * 60_000,
  gcTime: 60 * 60_000,
});

export function Dashboard({ demo, initialRange }: { demo: boolean; initialRange: RangeId }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: true,
            retry: (n, e) => e instanceof ApiError && (e.code === "upstream" || e.code === "server" || e.code === "rate_limited") && n < 3,
            retryDelay: (n, e) => (e instanceof ApiError && e.retryAfter ? e.retryAfter * 1000 : Math.min(8000, 800 * 2 ** n)),
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <DashboardInner demo={demo} initialRange={initialRange} />
    </QueryClientProvider>
  );
}

function DashboardInner({ demo, initialRange }: { demo: boolean; initialRange: RangeId }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [range, setRangeState] = useState<RangeId>(initialRange);
  const [view, setView] = useState<"daily" | "subscriptions">("daily");

  // Extend the long-lived session cookie; bounce to sign-in if it was revoked.
  useEffect(() => {
    postJson("/api/auth/session").catch((e) => {
      if (e instanceof ApiError && e.status === 401) router.replace("/");
    });
  }, [router]);

  const setRange = useCallback((r: RangeId) => {
    setRangeState(r);
    // Remembered per browser so the dashboard reopens on the same range.
    document.cookie = `${RANGE_COOKIE}=${r}; path=/; max-age=${400 * 86_400}; samesite=lax`;
  }, []);

  const prefetch = useCallback((r: RangeId) => qc.prefetchQuery(reportQuery(r)), [qc]);

  const q = useQuery({ ...reportQuery(range), placeholderData: keepPreviousData });

  // Warm the most-used neighbours once the first report is in.
  useEffect(() => {
    if (!q.isSuccess) return;
    const t = setTimeout(() => {
      (["7D", "30D", "90D"] as RangeId[]).filter((r) => r !== range).forEach((r) => prefetch(r));
    }, 1500);
    return () => clearTimeout(t);
  }, [q.isSuccess, range, prefetch]);

  const error = useMemo(
    () => (q.error instanceof ApiError ? q.error : q.error ? new ApiError(0, "server", "Something went wrong.") : null),
    [q.error],
  );

  useEffect(() => {
    if (error?.code === "unauthenticated") router.replace("/");
  }, [error, router]);

  const report = q.data?.data;
  const stale = q.isPlaceholderData || (q.isFetching && !q.isLoading && q.data?.range.id !== range);
  const animKey = q.data ? `${q.data.range.id}` : "init";
  const blocking = error && !report;

  return (
    <div className="min-h-dvh">
      <TopBar
        range={range}
        onRange={setRange}
        onHoverRange={prefetch}
        storeName={report?.source?.storeName ?? null}
        syncedAt={report?.source?.syncedAt ?? null}
        syncing={!!report?.source?.syncing}
        sourceError={report?.source?.error ?? null}
        demo={demo || !!q.data?.demo}
        fetching={q.isFetching}
      />

      <main className="mx-auto w-full max-w-[1320px] px-4 pb-24 sm:px-6">
        <AnimatePresence>{error?.code === "rate_limited" && report && <RateLimitBanner retryAfter={error.retryAfter} />}</AnimatePresence>

        {blocking ? (
          <ErrorState error={error} onRetry={() => q.refetch()} />
        ) : !report ? (
          <LoadingState />
        ) : (
          <>
            <div className="mb-6 mt-5 flex gap-5 border-b border-line text-[12px]" role="group" aria-label="Dashboard view">
              <button onClick={() => setView("daily")} aria-pressed={view === "daily"} className={`border-b-2 pb-3 font-medium ${view === "daily" ? "border-accent text-ink" : "border-transparent text-ink-3"}`}>Daily performance</button>
              <button onClick={() => setView("subscriptions")} aria-pressed={view === "subscriptions"} className={`border-b-2 pb-3 font-medium ${view === "subscriptions" ? "border-accent text-ink" : "border-transparent text-ink-3"}`}>Subscription analytics</button>
            </div>
            {error && error.code !== "rate_limited" && <p role="alert" className="mb-5 rounded-xl border border-warn/20 bg-warn/10 p-3 text-[12px] text-warn">Refresh failed: {error.message} Showing the last available report.</p>}
            {view === "daily" ? <div aria-busy={stale} className={stale ? "opacity-55" : ""}><DailyPerformance report={report} demo={demo || !!q.data?.demo} refreshing={q.isFetching} onRefresh={() => q.refetch()} from={q.data!.range.from} to={q.data!.range.to} /></div> : <>
            <SectionNav />
            <motion.div
              animate={{ opacity: stale ? 0.55 : 1 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col gap-14"
            >
              <Overview report={report} animKey={animKey} />
              <UnitEconomics report={report} />
              <Acquisition report={report} animKey={animKey} />
              <Growth report={report} animKey={animKey} />
              <div className="grid gap-14 xl:grid-cols-2 xl:gap-5">
                <Cohorts report={report} />
                <Products report={report} />
              </div>
              <Collection report={report} />
              <StorePnl report={report} animKey={animKey} />
            </motion.div>
            <Footer report={report} asOf={q.data?.asOf ?? null} />
            </>}
          </>
        )}
      </main>
    </div>
  );
}
