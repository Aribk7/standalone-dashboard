import "server-only";
import { store } from "./store";

// Brute-force protection for sign-in. A PIN alone identifies an account, so
// wrong guesses are limited per network address and across the whole site.

const MIN = 60_000;

const LIMITS = {
  pin: { perIp: 6, ipWindow: 15 * MIN, global: 60, globalWindow: 60 * MIN },
  key: { perIp: 10, ipWindow: 15 * MIN, global: 200, globalWindow: 60 * MIN },
} as const;

export type AttemptKind = keyof typeof LIMITS;

/** Returns seconds to wait if the caller is currently blocked, otherwise null. */
export async function blockedFor(kind: AttemptKind, ipHash: string): Promise<number | null> {
  const l = LIMITS[kind];
  const now = Date.now();
  const [ipFails, globalFails] = await Promise.all([
    store().countFailures(kind, now - l.ipWindow, ipHash),
    store().countFailures(kind, now - l.globalWindow),
  ]);
  if (ipFails >= l.perIp) return Math.ceil(l.ipWindow / 1000);
  if (globalFails >= l.global) return 5 * 60;
  return null;
}

export async function recordAttempt(kind: AttemptKind, ipHash: string, success: boolean): Promise<void> {
  await store().recordAttempt(ipHash, kind, success);
}

/** Uniform delay on failures so responses don't leak timing and guessing stays slow. */
export const failureDelay = () => new Promise((r) => setTimeout(r, 450 + Math.random() * 250));
