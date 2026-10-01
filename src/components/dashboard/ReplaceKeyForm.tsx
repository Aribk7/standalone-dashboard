"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ApiError, postJson } from "@/lib/client";

const KEY_PATTERN = /^24f_fin_[0-9a-f]{64}$/;

export function ReplaceKeyForm({ onDone }: { onDone?: () => void }) {
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();
  const valid = KEY_PATTERN.test(key.trim());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      await postJson("/api/auth/connect", { key: key.trim(), replace: true });
      await qc.resetQueries();
      onDone?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input
        value={key}
        onChange={(e) => {
          setKey(e.target.value);
          setError(null);
        }}
        type="password"
        autoComplete="off"
        spellCheck={false}
        placeholder="24f_fin_…"
        aria-label="New 24F API key"
        className="h-12 w-full rounded-xl border border-line bg-surface-2 px-4 font-mono text-[13px] text-ink outline-none transition-colors placeholder:text-ink-3/60 focus:border-accent/60"
      />
      {error && <p className="text-[13px] text-bad">{error}</p>}
      <Button type="submit" disabled={!valid} loading={busy}>
        {busy ? "Verifying with 24F…" : "Save new key"}
        {!busy && <ArrowRight size={16} />}
      </Button>
    </form>
  );
}
