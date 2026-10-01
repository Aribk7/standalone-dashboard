"use client";

import { motion } from "motion/react";
import { CloudOff, Hourglass, KeyRound, Link2Off, Lock, RotateCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { ApiError } from "@/lib/client";
import { ReplaceKeyForm } from "./ReplaceKeyForm";

export function LoadingState() {
  return (
    <div className="mt-8 flex flex-col gap-5" aria-busy="true" aria-label="Loading your dashboard">
      <div className="flex gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="shimmer h-8 w-24 rounded-full" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="card p-6 lg:col-span-8">
          <div className="shimmer h-4 w-48" />
          <div className="shimmer mt-4 h-14 w-72" />
          <div className="shimmer mt-8 h-[260px] w-full" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:col-span-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="card p-4">
              <div className="shimmer h-3 w-20" />
              <div className="shimmer mt-3 h-7 w-24" />
            </div>
          ))}
        </div>
      </div>
      <div className="card h-[320px] p-6">
        <div className="shimmer h-4 w-56" />
        <div className="shimmer mt-6 h-[230px] w-full" />
      </div>
    </div>
  );
}

function Panel({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="card mx-auto mt-16 max-w-[480px] p-8 text-center"
    >
      <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl border border-line bg-surface-2 text-accent-soft">{icon}</div>
      <h2 className="text-[19px] font-semibold tracking-tight">{title}</h2>
      <div className="mt-2 text-[13.5px] leading-relaxed text-ink-3">{children}</div>
    </motion.div>
  );
}

export function ErrorState({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  switch (error.code) {
    case "key_invalid":
      return (
        <Panel icon={<KeyRound size={22} />} title="Your API key stopped working">
          <p className="mb-6">It may have been revoked or expired in 24F. Paste a new key from the API button in your 24F workspace.</p>
          <div className="text-left">
            <ReplaceKeyForm />
          </div>
        </Panel>
      );
    case "not_activated":
      return (
        <Panel icon={<Lock size={22} />} title="Workspace not activated">
          <p>Your 24F workspace isn&apos;t activated yet. Once it is, your dashboard will fill in automatically.</p>
        </Panel>
      );
    case "not_connected":
      return (
        <Panel icon={<Link2Off size={22} />} title="Connect your subscriptions">
          <p>{error.message} Connect it in your 24F Loop Analytics workspace and your figures will appear here.</p>
          <Button variant="subtle" className="mt-6" onClick={onRetry}>
            <RotateCw size={15} /> Check again
          </Button>
        </Panel>
      );
    case "rate_limited":
      return (
        <Panel icon={<Hourglass size={22} />} title="Taking a short breather">
          <Countdown seconds={error.retryAfter ?? 60} onDone={onRetry} />
        </Panel>
      );
    default:
      return (
        <Panel icon={<CloudOff size={22} />} title="Couldn't load your figures">
          <p>{error.message}</p>
          <Button variant="subtle" className="mt-6" onClick={onRetry}>
            <RotateCw size={15} /> Try again
          </Button>
        </Panel>
      );
  }
}

function Countdown({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) {
      onDone();
      return;
    }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left, onDone]);
  return (
    <p>
      24F limits how often data can be read. Trying again in <span className="font-medium text-ink tnum">{Math.max(0, left)}s</span>.
    </p>
  );
}

export function RateLimitBanner({ retryAfter }: { retryAfter?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: -8, height: 0 }}
      className="overflow-hidden"
    >
      <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-warn/25 bg-warn/[0.07] px-4 py-2.5 text-[13px] text-warn">
        <Hourglass size={15} />
        Showing your last figures. 24F&apos;s rate limit was reached; refreshing again in about {retryAfter ?? 60}s.
      </div>
    </motion.div>
  );
}
