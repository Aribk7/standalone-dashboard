"use client";

import { CheckCircle2, Info } from "lucide-react";
import { useEffect, useState } from "react";

// Tiny global toast: call toast("Saved") from anywhere on the client.

interface Toast {
  id: number;
  message: string;
  tone: "success" | "info";
}

const EVENT = "loop:toast";

export function toast(message: string, tone: Toast["tone"] = "success") {
  window.dispatchEvent(new CustomEvent<Omit<Toast, "id">>(EVENT, { detail: { message, tone } }));
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const onToast = (e: Event) => {
      const t = { ...(e as CustomEvent<Omit<Toast, "id">>).detail, id: Date.now() + Math.random() };
      setToasts((ts) => [...ts.slice(-2), t]);
      setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== t.id)), 2600);
    };
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-[200] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="toast-in flex items-center gap-2.5 rounded-xl border border-line-strong bg-[#17181d]/95 px-4 py-2.5 text-[13px] text-ink shadow-[0_16px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl"
        >
          {t.tone === "success" ? <CheckCircle2 size={16} className="text-good" /> : <Info size={16} className="text-accent-soft" />}
          {t.message}
        </div>
      ))}
    </div>
  );
}
