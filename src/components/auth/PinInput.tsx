"use client";

import { motion, useAnimationControls } from "motion/react";
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";

export interface PinInputHandle {
  shake: () => void;
  clear: () => void;
  focus: () => void;
}

interface Props {
  length: number;
  disabled?: boolean;
  state?: "idle" | "error" | "success";
  onComplete: (pin: string) => void;
  onChange?: (pin: string) => void;
  ref?: Ref<PinInputHandle>;
}

// One real <input> (so paste, autofill and mobile number pads all work) drawn
// as individual animated digit cells.
export function PinInput({ length, disabled, state = "idle", onComplete, onChange, ref }: Props) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const controls = useAnimationControls();

  useImperativeHandle(ref, () => ({
    shake: () => {
      controls.start({ x: [0, -12, 11, -8, 6, -3, 0], transition: { duration: 0.45, ease: "easeOut" } });
    },
    clear: () => {
      setValue("");
      onChange?.("");
    },
    focus: () => inputRef.current?.focus(),
  }));

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const update = (raw: string) => {
    const next = raw.replace(/\D/g, "").slice(0, length);
    setValue(next);
    onChange?.(next);
    if (next.length === length) onComplete(next);
  };

  const activeIndex = Math.min(value.length, length - 1);

  return (
    <motion.div animate={controls} className="relative">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => update(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={disabled}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={length}
        aria-label={`${length}-digit PIN`}
        className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
      />
      <div className="flex justify-center gap-1.5 sm:gap-2.5" aria-hidden>
        {Array.from({ length }, (_, i) => {
          const digit = value[i];
          const isActive = focused && i === activeIndex && value.length < length;
          const tone =
            state === "error"
              ? "border-bad/60 bg-bad/[0.06]"
              : state === "success"
                ? "border-accent/70 bg-accent/[0.12]"
                : digit
                  ? "border-line-strong bg-surface-3"
                  : "border-line bg-surface-2";
          return (
            <div
              key={i}
              style={{ animationDelay: `${0.05 + i * 0.035}s` }}
              className={`digit-in relative grid h-14 w-[34px] place-items-center rounded-xl border text-xl sm:rounded-2xl sm:text-2xl font-semibold transition-colors duration-200 sm:h-16 sm:w-12 ${tone} ${i === 3 ? "mr-1.5 sm:mr-3" : ""}`}
            >
              {digit ? (
                <motion.span
                  key={digit + i}
                  initial={{ scale: 0.4, opacity: 0, y: 6 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 520, damping: 26 }}
                >
                  {digit}
                </motion.span>
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-ink-3/40" />
              )}
              {isActive && (
                <motion.span
                  layoutId="pin-caret"
                  className="absolute inset-0 rounded-xl sm:rounded-2xl ring-2 ring-accent/80"
                  transition={{ type: "spring", stiffness: 600, damping: 40 }}
                />
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
