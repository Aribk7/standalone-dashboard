"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

/** A freshly issued PIN, revealed digit by digit. */
export function PinDigits({ pin }: { pin: string }) {
  return (
    <div className="relative mx-auto flex justify-center gap-1.5 sm:gap-2" aria-label={`PIN ${pin.split("").join(" ")}`} role="img">
      {pin.split("").map((d, i) => (
        <motion.div
          key={`${pin}-${i}`}
          initial={{ opacity: 0, y: 18, rotateX: -80, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, rotateX: 0, filter: "blur(0px)" }}
          transition={{ delay: 0.15 + i * 0.07, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className={`grid h-14 w-[34px] place-items-center rounded-xl border border-accent/40 bg-accent/[0.08] text-xl font-semibold text-white sm:h-16 sm:w-12 sm:rounded-2xl sm:text-2xl ${
            i === 3 ? "mr-1.5 sm:mr-3" : ""
          }`}
          style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 0 24px -8px rgba(139,124,255,0.6)" }}
        >
          {d}
        </motion.div>
      ))}
    </div>
  );
}

export function CopyPinButton({ pin }: { pin: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pin);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked; the PIN is on screen to copy by hand
    }
  };
  return (
    <Button variant="subtle" onClick={copy}>
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span key="c" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="inline-flex items-center gap-2 text-good">
            <Check size={16} /> Copied
          </motion.span>
        ) : (
          <motion.span key="n" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="inline-flex items-center gap-2">
            <Copy size={15} /> Copy PIN
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  );
}
