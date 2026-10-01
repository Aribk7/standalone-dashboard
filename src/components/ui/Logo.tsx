/** Loop mark: a ring that draws itself in (pure CSS, so it always completes). */
export function LoopMark({ size = 28, animate = true }: { size?: number; animate?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden className={animate ? "loop-mark" : undefined}>
      <circle cx="16" cy="16" r="12" stroke="rgba(255,255,255,0.08)" strokeWidth="3.5" />
      <circle
        className="loop-ring"
        cx="16"
        cy="16"
        r="12"
        pathLength={1}
        stroke="#9d90ff"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray="0.78 1"
        transform="rotate(-90 16 16)"
      />
      <circle className="loop-dot" cx="16" cy="4" r="2.6" fill="#fff" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LoopMark />
      <span className="text-[15px] font-semibold tracking-tight">
        Loop <span className="text-ink-3 font-medium">Analytics</span>
      </span>
    </div>
  );
}
