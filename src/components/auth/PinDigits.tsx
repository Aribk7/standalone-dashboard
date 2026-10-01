"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toaster";

/** A freshly issued PIN, revealed digit by digit. */
export function PinDigits({ pin }: { pin: string }) {
  return (
    <div className="relative mx-auto flex justify-center gap-1.5 sm:gap-2" aria-label={`PIN ${pin.split("").join(" ")}`} role="img">
      {pin.split("").map((d, i) => (
        <div
          key={`${pin}-${i}`}
          className={`digit-in grid h-14 w-[34px] place-items-center rounded-xl border border-accent/40 bg-accent/[0.08] text-xl font-semibold text-white sm:h-16 sm:w-12 sm:rounded-2xl sm:text-2xl ${
            i === 3 ? "mr-1.5 sm:mr-3" : ""
          }`}
          style={{
            animationDelay: `${0.1 + i * 0.06}s`,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 0 24px -8px rgba(139,124,255,0.6)",
          }}
        >
          {d}
        </div>
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
      toast("PIN copied to clipboard");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast("Couldn't copy. Write the PIN down instead.", "info");
    }
  };
  return (
    <Button variant="subtle" onClick={copy}>
      {copied ? (
        <span key="c" className="fade-in inline-flex items-center gap-2 text-good">
          <Check size={16} /> Copied
        </span>
      ) : (
        <span key="n" className="fade-in inline-flex items-center gap-2">
          <Copy size={15} /> Copy PIN
        </span>
      )}
    </Button>
  );
}
