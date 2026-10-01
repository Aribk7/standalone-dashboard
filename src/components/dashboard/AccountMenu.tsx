"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, KeyRound, LogOut, MonitorSmartphone, RefreshCw, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CopyPinButton, PinDigits } from "@/components/auth/PinDigits";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ApiError, postJson } from "@/lib/client";
import { ReplaceKeyForm } from "./ReplaceKeyForm";

type Dialog = null | "pin" | "key" | "signout-all";

export function AccountMenu({ demo }: { demo: boolean }) {
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const root = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const signOut = async (everywhere = false) => {
    await postJson("/api/auth/logout", { everywhere }).catch(() => undefined);
    router.replace("/");
    router.refresh();
  };

  const items = [
    { icon: RefreshCw, label: "Get a new PIN", onClick: () => setDialog("pin") },
    ...(demo ? [] : [{ icon: KeyRound, label: "Replace API key", onClick: () => setDialog("key") }]),
    { icon: LogOut, label: "Sign out", onClick: () => signOut(false) },
    { icon: MonitorSmartphone, label: "Sign out on all devices", onClick: () => setDialog("signout-all"), danger: true },
  ];

  return (
    <div ref={root} className="relative">
      <motion.button
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account"
        className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-surface/80 text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
      >
        <UserRound size={16} />
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: "top right" }}
            className="absolute right-0 top-11 z-50 w-60 overflow-hidden rounded-2xl border border-line-strong bg-[#141519]/95 p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl"
          >
            {items.map((it, i) => (
              <motion.button
                key={it.label}
                role="menuitem"
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.03 * i }}
                onClick={() => {
                  setOpen(false);
                  it.onClick();
                }}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] transition-colors hover:bg-white/[0.06] ${
                  "danger" in it && it.danger ? "text-bad" : "text-ink-2 hover:text-ink"
                }`}
              >
                <it.icon size={15} />
                {it.label}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <NewPinDialog open={dialog === "pin"} onClose={() => setDialog(null)} />
      <Modal open={dialog === "key"} onClose={() => setDialog(null)} title="Replace API key">
        <h2 className="text-[18px] font-semibold tracking-tight">Replace API key</h2>
        <p className="mb-5 mt-1.5 text-[13.5px] leading-relaxed text-ink-3">
          Paste a new key from your 24F workspace. Your PIN and signed-in devices stay the same.
        </p>
        <ReplaceKeyForm onDone={() => setDialog(null)} />
      </Modal>
      <Modal open={dialog === "signout-all"} onClose={() => setDialog(null)} title="Sign out on all devices">
        <h2 className="text-[18px] font-semibold tracking-tight">Sign out everywhere?</h2>
        <p className="mb-6 mt-1.5 text-[13.5px] leading-relaxed text-ink-3">
          Every device signed in to this dashboard, including this one, will need the PIN again.
        </p>
        <div className="flex gap-2.5">
          <Button variant="subtle" className="flex-1" onClick={() => setDialog(null)}>
            Cancel
          </Button>
          <Button className="flex-1 !from-[#ff8a80] !to-[#e0524a] !shadow-none" onClick={() => signOut(true)}>
            Sign out all
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function NewPinDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [pin, setPin] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    onClose();
    setTimeout(() => {
      setPin(null);
      setError(null);
    }, 300);
  };

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await postJson<{ pin: string }>("/api/auth/new-pin");
      setPin(res.pin);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title="New PIN">
      {pin ? (
        <div>
          <h2 className="text-[18px] font-semibold tracking-tight">Your new PIN</h2>
          <p className="mb-6 mt-1.5 text-[13.5px] leading-relaxed text-ink-3">The old PIN no longer works. Save this one; it won&apos;t be shown again.</p>
          <PinDigits pin={pin} />
          <div className="mt-6 flex flex-col gap-2.5">
            <CopyPinButton pin={pin} />
            <Button onClick={close}>Done</Button>
          </div>
        </div>
      ) : (
        <div>
          <h2 className="text-[18px] font-semibold tracking-tight">Get a new PIN?</h2>
          <p className="mb-6 mt-1.5 text-[13.5px] leading-relaxed text-ink-3">
            Your current PIN will stop working immediately. Devices that are already signed in stay signed in.
          </p>
          {error && <p className="mb-3 text-[13px] text-bad">{error}</p>}
          <Button className="w-full" loading={busy} onClick={generate}>
            Generate new PIN <ArrowRight size={16} />
          </Button>
        </div>
      )}
    </Modal>
  );
}
