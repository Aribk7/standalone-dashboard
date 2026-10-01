import "server-only";
import { unstable_cache } from "next/cache";
import { API_BASE } from "./env";
import { decrypt } from "./crypto";
import { store } from "./store";

// Client for the 24F Client API v1 (read-only, Bearer key).

export const API_KEY_PATTERN = /^24f_fin_[0-9a-f]{64}$/;

export class UpstreamError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public retryAfter?: number,
  ) {
    super(message);
  }
}

interface Envelope<T> {
  data: T;
  as_of?: string;
  api_version?: string;
  next_cursor?: string | null;
}

export async function f24Get<T>(apiKey: string, path: string, params: Record<string, string> = {}): Promise<Envelope<T>> {
  const url = new URL(API_BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(25_000),
      });
    } catch {
      if (attempt < 1) {
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
      throw new UpstreamError(502, "unreachable", "24F could not be reached");
    }

    if (res.ok) return (await res.json()) as Envelope<T>;

    if ((res.status === 500 || res.status === 502 || res.status === 503) && attempt < 1) {
      await new Promise((r) => setTimeout(r, 700));
      continue;
    }

    let code = "error";
    let message = `24F responded with ${res.status}`;
    try {
      const body = (await res.json()) as { error?: { code?: string; message?: string } };
      code = body.error?.code ?? code;
      message = body.error?.message ?? message;
    } catch {
      // non-JSON error body
    }
    const retryAfter = Number(res.headers.get("retry-after")) || undefined;
    throw new UpstreamError(res.status, code, message, retryAfter);
  }
}

/** Reports are cached per account for 15 minutes, matching 24F's own refresh rate. */
export const cachedReport = unstable_cache(
  async (accountId: string, path: string, from: string, to: string) => {
    const account = await store().getAccount(accountId);
    if (!account) throw new UpstreamError(401, "unauthenticated", "Account not found");
    const apiKey = decrypt(account.keyCiphertext);
    const res = await f24Get<unknown>(apiKey, path, { from, to });
    return { data: res.data, asOf: res.as_of ?? null };
  },
  ["f24-report-v1"],
  { revalidate: 900 },
);
