import { encrypt, keyFingerprint } from "@/lib/server/crypto";
import { demoEnabled, localClientKey } from "@/lib/server/env";
import { API_KEY_PATTERN, UpstreamError, f24Get } from "@/lib/server/f24";
import { apiError, fromUpstream, ok, readJson } from "@/lib/server/http";
import { withUniquePin } from "@/lib/server/pin";
import { blockedFor, failureDelay, recordAttempt } from "@/lib/server/ratelimit";
import { clientIpHash, currentSession, startSession } from "@/lib/server/session";
import { store } from "@/lib/server/store";

// Connect with a 24F API key.
//  - New key: creates the dashboard, generates its PIN and signs this device in.
//  - Key already connected: signs this device in (the existing PIN keeps working).
//  - `replace: true` while signed in: swaps the stored key (e.g. after revoking the old one).
export async function POST(req: Request) {
  const body = await readJson(req);
  const local = body.local === true;
  if (local) {
    const host = new URL(req.url).hostname;
    const origin = req.headers.get("origin");
    if (process.env.NODE_ENV !== "development" || !["localhost", "127.0.0.1", "[::1]"].includes(host) || (origin && origin !== new URL(req.url).origin)) return apiError(403, "bad_request", "Local key connection is available only on this computer.");
  }
  const apiKey = local ? localClientKey() ?? "" : typeof body.key === "string" ? body.key.trim() : "";
  const replace = body.replace === true;
  const ip = await clientIpHash();

  const wait = await blockedFor("key", ip);
  if (wait) return apiError(429, "rate_limited", "Too many attempts. Try again in a few minutes.", wait);

  const isDemo = apiKey.toLowerCase() === "demo" && demoEnabled();
  if (!isDemo && !API_KEY_PATTERN.test(apiKey)) {
    await recordAttempt("key", ip, false);
    return apiError(400, "bad_request", "That doesn't look like a 24F API key. Keys start with 24f_fin_.");
  }

  if (!isDemo) {
    try {
      await f24Get(apiKey, "/connections");
    } catch (e) {
      if (e instanceof UpstreamError && e.status === 401) {
        await recordAttempt("key", ip, false);
        await failureDelay();
        return apiError(401, "key_invalid", "24F didn't accept this key. Check it hasn't been revoked.");
      }
      return fromUpstream(e);
    }
  }
  await recordAttempt("key", ip, true);

  const fingerprint = keyFingerprint(isDemo ? "demo" : apiKey);
  const ciphertext = encrypt(isDemo ? "demo" : apiKey);
  const db = store();

  if (replace) {
    const session = await currentSession();
    if (!session) return apiError(401, "unauthenticated", "Sign in first.");
    const owner = await db.findAccountByFingerprint(fingerprint);
    if (owner && owner.id !== session.account.id) {
      return apiError(400, "bad_request", "This key is already connected to a different dashboard.");
    }
    await db.updateAccount(session.account.id, { keyFingerprint: fingerprint, keyCiphertext: ciphertext });
    return ok({ status: "replaced" as const });
  }

  const existing = await db.findAccountByFingerprint(fingerprint);
  if (existing) {
    await startSession(existing.id);
    return ok({ status: "existing" as const });
  }

  let accountId = "";
  const pin = await withUniquePin(async (pinIndex) => {
    const account = await db.createAccount({ pinIndex, keyFingerprint: fingerprint, keyCiphertext: ciphertext, demo: isDemo });
    accountId = account.id;
  });
  await startSession(accountId);
  return ok({ status: "created" as const, pin });
}
