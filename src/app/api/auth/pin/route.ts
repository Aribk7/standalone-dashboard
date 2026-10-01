import { PIN_LENGTH, pinIndex } from "@/lib/server/crypto";
import { apiError, ok, readJson } from "@/lib/server/http";
import { blockedFor, failureDelay, recordAttempt } from "@/lib/server/ratelimit";
import { clientIpHash, startSession } from "@/lib/server/session";
import { store } from "@/lib/server/store";

// Sign in on a new device with a PIN.
export async function POST(req: Request) {
  const body = await readJson(req);
  const pin = typeof body.pin === "string" ? body.pin.replace(/\D/g, "") : "";
  const ip = await clientIpHash();

  const wait = await blockedFor("pin", ip);
  if (wait) return apiError(429, "rate_limited", "Too many attempts. Try again in a few minutes.", wait);

  if (pin.length !== PIN_LENGTH) {
    return apiError(400, "bad_request", `Your PIN has ${PIN_LENGTH} digits.`);
  }

  const account = await store().findAccountByPin(pinIndex(pin));
  if (!account) {
    await recordAttempt("pin", ip, false);
    await failureDelay();
    return apiError(401, "unauthenticated", "That PIN doesn't match any dashboard.");
  }

  await recordAttempt("pin", ip, true);
  await startSession(account.id);
  return ok({ ok: true });
}
