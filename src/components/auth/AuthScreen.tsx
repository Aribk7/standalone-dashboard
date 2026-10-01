"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, KeyRound, ShieldCheck, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { LoopMark } from "@/components/ui/Logo";
import { CopyPinButton, PinDigits } from "./PinDigits";
import { PinInput, type PinInputHandle } from "./PinInput";

const PIN_LENGTH = 8;
const KEY_PATTERN = /^24f_fin_[0-9a-f]{64}$/;
const ease = [0.16, 1, 0.3, 1] as const;

type Mode = "pin" | "key" | "reveal";

async function post<T>(url: string, body: unknown): Promise<{ ok: true; data: T } | { ok: false; message: string; code?: string }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, data: json as T };
    return { ok: false, message: json?.error?.message ?? "Something went wrong.", code: json?.error?.code };
  } catch {
    return { ok: false, message: "You appear to be offline." };
  }
}

export function AuthScreen({ demoAvailable }: { demoAvailable: boolean }) {
  const [mode, setMode] = useState<Mode>("pin");
  const [pin, setPin] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    router.prefetch("/dashboard");
  }, [router]);

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease }}
        className="mb-10 flex flex-col items-center gap-4 text-center"
      >
        <LoopMark size={44} />
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.03em] sm:text-[34px]">
            <span className="text-gradient">Loop Analytics</span>
          </h1>
          <p className="mt-1.5 text-[14px] text-ink-3">Your subscription numbers, beautifully clear.</p>
        </div>
      </motion.div>

      <motion.div layout transition={{ layout: { duration: 0.55, ease } }} className="card w-full max-w-[460px] overflow-hidden" data-glow>
        <AnimatePresence mode="popLayout" initial={false}>
          {mode === "pin" && <PinStep key="pin" onNew={() => setMode("key")} onSuccess={() => router.replace("/dashboard")} />}
          {mode === "key" && (
            <KeyStep
              key="key"
              demoAvailable={demoAvailable}
              onBack={() => setMode("pin")}
              onCreated={(p) => {
                setPin(p);
                setMode("reveal");
              }}
              onExisting={() => router.replace("/dashboard")}
            />
          )}
          {mode === "reveal" && pin && <RevealStep key="reveal" pin={pin} onDone={() => router.replace("/dashboard")} />}
        </AnimatePresence>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="mt-8 flex items-center gap-2 text-[12px] text-ink-3"
      >
        <ShieldCheck size={14} className="text-ink-3" />
        Read-only access. Your key is encrypted and never shown again.
      </motion.p>
    </main>
  );
}

const stepMotion = {
  initial: { opacity: 0, x: 24, filter: "blur(8px)" },
  animate: { opacity: 1, x: 0, filter: "blur(0px)" },
  exit: { opacity: 0, x: -24, filter: "blur(8px)" },
  transition: { duration: 0.45, ease },
};

function StepHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="mb-7 flex flex-col items-center text-center">
      <div className="mb-4 grid h-11 w-11 place-items-center rounded-2xl border border-line bg-surface-2 text-accent-soft">{icon}</div>
      <h2 className="text-[19px] font-semibold tracking-tight">{title}</h2>
      <p className="mt-1.5 max-w-[320px] text-[13.5px] leading-relaxed text-ink-3">{subtitle}</p>
    </div>
  );
}

function ErrorLine({ message }: { message: string | null }) {
  return (
    <div className="min-h-[22px] pt-3 text-center">
      <AnimatePresence mode="wait">
        {message && (
          <motion.p
            key={message}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-[13px] text-bad"
            role="alert"
          >
            {message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function PinStep({ onNew, onSuccess }: { onNew: () => void; onSuccess: () => void }) {
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<"idle" | "error" | "success">("idle");
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<PinInputHandle>(null);

  const submit = async (pin: string) => {
    setBusy(true);
    setError(null);
    const res = await post("/api/auth/pin", { pin });
    if (res.ok) {
      setState("success");
      setTimeout(onSuccess, 380);
      return;
    }
    setBusy(false);
    setState("error");
    setError(res.message);
    ref.current?.shake();
    setTimeout(() => {
      ref.current?.clear();
      setState("idle");
      ref.current?.focus();
    }, 650);
  };

  return (
    <motion.div {...stepMotion} className="p-7 sm:p-9">
      <StepHeader icon={<KeyRound size={20} />} title="Welcome back" subtitle="Enter your 8-digit PIN to open your dashboard on this device." />
      <PinInput ref={ref} length={PIN_LENGTH} disabled={busy} state={state} onComplete={submit} onChange={() => setError(null)} />
      <ErrorLine message={error} />
      <div className="mt-6 border-t border-line pt-6 text-center">
        <button
          onClick={onNew}
          className="group inline-flex items-center gap-1.5 text-[13.5px] text-ink-2 transition-colors hover:text-ink"
        >
          First time here? Connect your 24F API key
          <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-0.5" />
        </button>
      </div>
    </motion.div>
  );
}

function KeyStep({
  demoAvailable,
  onBack,
  onCreated,
  onExisting,
}: {
  demoAvailable: boolean;
  onBack: () => void;
  onCreated: (pin: string) => void;
  onExisting: () => void;
}) {
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const trimmed = key.trim();
  const valid = KEY_PATTERN.test(trimmed);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, []);

  const connect = async (value: string) => {
    setBusy(true);
    setError(null);
    const res = await post<{ status: "created" | "existing"; pin?: string }>("/api/auth/connect", { key: value });
    if (!res.ok) {
      setBusy(false);
      setError(res.message);
      return;
    }
    if (res.data.status === "created" && res.data.pin) onCreated(res.data.pin);
    else onExisting();
  };

  return (
    <motion.div {...stepMotion} className="relative p-7 sm:p-9">
      <button
        onClick={onBack}
        className="absolute left-5 top-5 grid h-9 w-9 place-items-center rounded-xl text-ink-3 transition-colors hover:bg-white/[0.05] hover:text-ink"
        aria-label="Back to PIN"
      >
        <ArrowLeft size={17} />
      </button>
      <StepHeader
        icon={<Sparkles size={20} />}
        title="Connect your store"
        subtitle="Paste the API key from the API button at the top of your 24F workspace."
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) connect(trimmed);
        }}
      >
        <div
          className={`group relative flex items-center rounded-2xl border bg-surface-2 transition-colors duration-200 focus-within:border-accent/60 ${
            error ? "border-bad/50" : "border-line"
          }`}
        >
          <input
            ref={inputRef}
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
              setError(null);
            }}
            type={show ? "text" : "password"}
            autoComplete="off"
            spellCheck={false}
            placeholder="24f_fin_…"
            aria-label="24F API key"
            className="h-13 w-full bg-transparent pl-4 pr-20 font-mono text-[13px] tracking-tight text-ink outline-none placeholder:text-ink-3/60"
          />
          <div className="absolute right-2 flex items-center gap-1">
            <AnimatePresence>
              {valid && (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 22 }}
                  className="grid h-6 w-6 place-items-center rounded-full bg-good/15 text-good"
                >
                  <Check size={13} strokeWidth={3} />
                </motion.span>
              )}
            </AnimatePresence>
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="grid h-9 w-9 place-items-center rounded-xl text-ink-3 transition-colors hover:text-ink"
              aria-label={show ? "Hide key" : "Show key"}
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <ErrorLine message={error ?? (trimmed && !valid && trimmed.length > 8 ? "Keys start with 24f_fin_ followed by 64 characters." : null)} />
        <Button type="submit" className="mt-3 w-full" disabled={!valid} loading={busy}>
          {busy ? "Verifying with 24F…" : "Connect"}
          {!busy && <ArrowRight size={16} />}
        </Button>
      </form>
      {demoAvailable && (
        <button
          onClick={() => connect("demo")}
          disabled={busy}
          className="mt-4 w-full text-center text-[13px] text-ink-3 transition-colors hover:text-ink-2"
        >
          or explore with sample data
        </button>
      )}
    </motion.div>
  );
}

function RevealStep({ pin, onDone }: { pin: string; onDone: () => void }) {
  return (
    <motion.div {...stepMotion} className="p-7 sm:p-9">
      <StepHeader
        icon={<ShieldCheck size={20} />}
        title="Your dashboard PIN"
        subtitle="Use it to open your dashboard on any new device. It's shown only this once, so save it somewhere safe."
      />
      <PinDigits pin={pin} />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="mt-7 flex flex-col gap-2.5">
        <CopyPinButton pin={pin} />
        <Button onClick={onDone}>
          I&apos;ve saved it. Open my dashboard <ArrowRight size={16} />
        </Button>
      </motion.div>
    </motion.div>
  );
}
