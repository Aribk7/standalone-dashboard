import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { fmt, type FormatKind } from "@/lib/format";

interface Props {
  value: number | null | undefined;
  format: FormatKind;
  /** Whether an increase is good news (churn going up is not). */
  upIsGood?: boolean;
  suffix?: string;
  size?: "sm" | "md";
}

/** Signed change with an arrow; colour = direction × whether up is good. */
export function Delta({ value, format, upIsGood = true, suffix, size = "sm" }: Props) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const flat = Math.abs(value) < 1e-9;
  const good = flat ? null : value > 0 === upIsGood;
  const tone = good === null ? "text-ink-3 bg-white/[0.04]" : good ? "text-good bg-good/[0.09]" : "text-bad bg-bad/[0.09]";
  const Icon = flat ? Minus : value > 0 ? ArrowUpRight : ArrowDownRight;
  const pad = size === "md" ? "px-2 py-1 text-[12.5px]" : "px-1.5 py-0.5 text-[11.5px]";
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-md font-medium tnum ${pad} ${tone}`}>
      <Icon size={size === "md" ? 14 : 12} strokeWidth={2.5} />
      {fmt(format, Math.abs(value))}
      {suffix && <span className="ml-0.5 font-normal opacity-70">{suffix}</span>}
    </span>
  );
}
