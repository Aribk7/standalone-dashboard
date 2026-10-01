"use client";

import type { ReactNode } from "react";
import { Sparkline } from "@/components/charts/Sparkline";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Card } from "@/components/ui/Card";
import { InfoTip } from "@/components/ui/InfoTip";
import type { FormatKind } from "@/lib/format";

interface Props {
  label: string;
  value: number | null;
  format: FormatKind;
  sub?: ReactNode;
  info?: ReactNode;
  trend?: (number | null)[];
  delay?: number;
  size?: "sm" | "md";
  emphasis?: boolean;
}

export function StatTile({ label, value, format, sub, info, trend, delay = 0, size = "md", emphasis }: Props) {
  const showTrend = trend && trend.filter((v) => v !== null).length > 2;
  return (
    <Card
      delay={delay}
      className={`flex flex-col p-4 ${size === "md" ? "min-h-[118px] sm:p-5" : "min-h-[104px]"} ${emphasis ? "!border-accent/30" : ""}`}
    >
      <div className="flex items-center gap-1">
        <span className="truncate text-[12.5px] text-ink-3">{label}</span>
        {info && <InfoTip>{info}</InfoTip>}
      </div>
      <div className="mt-auto flex items-end justify-between gap-2 pt-2">
        <AnimatedNumber
          value={value}
          format={format}
          className={`block min-w-0 truncate font-semibold tracking-[-0.03em] text-ink ${size === "md" ? "text-[24px] sm:text-[26px]" : "text-[21px]"}`}
        />
        {showTrend && (
          <div className="mb-1 hidden shrink-0 sm:block">
            <Sparkline values={trend} width={64} height={24} />
          </div>
        )}
      </div>
      {sub && <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-ink-3">{sub}</div>}
    </Card>
  );
}
