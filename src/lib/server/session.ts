import "server-only";
import { cookies, headers } from "next/headers";
import { isProduction } from "./env";
import { newSessionToken, sessionTokenHash, ipHash } from "./crypto";
import { store, type Account } from "./store";

// Session cookie: an opaque random token. The database only keeps its hash.
// Browsers cap cookie lifetime at about 400 days, so the cookie is re-issued
// on visits to keep returning devices signed in indefinitely.

export const SESSION_COOKIE = isProduction ? "__Host-loop_session" : "loop_session";
const MAX_AGE_S = 400 * 86_400;
const TOUCH_AFTER_MS = 12 * 3_600_000;

function cookieOptions() {
  return { httpOnly: true, secure: isProduction, sameSite: "lax" as const, path: "/", maxAge: MAX_AGE_S };
}

export async function startSession(accountId: string): Promise<void> {
  const token = newSessionToken();
  const h = await headers();
  await store().createSession(sessionTokenHash(token), accountId, h.get("user-agent"));
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions());
}

export async function currentSession(): Promise<{ account: Account; tokenHash: string; lastSeenAt: number } | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const tokenHash = sessionTokenHash(token);
  const session = await store().getSession(tokenHash);
  if (!session) return null;
  const account = await store().getAccount(session.accountId);
  if (!account) return null;
  return { account, tokenHash, lastSeenAt: session.lastSeenAt };
}

/** Called from a route handler on dashboard load: extends the cookie and records activity. */
export async function refreshSession(s: { tokenHash: string; lastSeenAt: number }): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return;
  if (Date.now() - s.lastSeenAt > TOUCH_AFTER_MS) await store().touchSession(s.tokenHash);
  jar.set(SESSION_COOKIE, token, cookieOptions());
}

export async function endSession(opts: { everywhere?: boolean } = {}): Promise<void> {
  const s = await currentSession();
  if (s) {
    if (opts.everywhere) await store().deleteSessionsForAccount(s.account.id);
    else await store().deleteSession(s.tokenHash);
  }
  (await cookies()).delete(SESSION_COOKIE);
}

export async function clientIpHash(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return ipHash(ip);
}
