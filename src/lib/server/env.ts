import "server-only";
import { createHash } from "node:crypto";

// All secrets come from environment variables (Vercel project settings, or
// .env.local for local development). Nothing secret is ever committed.

export const isProduction = process.env.NODE_ENV === "production";

export function appSecret(): Buffer {
  const raw = process.env.APP_SECRET;
  if (!raw) {
    // Without a dedicated APP_SECRET, derive one from the Supabase server key,
    // which is already a server-only secret set by the Vercel integration.
    // Rotating that key then invalidates stored API keys and PINs.
    const supabaseKey = supabaseConfig()?.key;
    if (supabaseKey) return createHash("sha256").update(`loop-dashboard:app-secret:${supabaseKey}`).digest();
    if (isProduction) throw new Error("APP_SECRET is not set");
    // Local development only: a fixed throwaway secret so the app runs without setup.
    return Buffer.from("local-development-secret-not-for-production-use!!");
  }
  const buf = Buffer.from(raw, "base64");
  if (buf.length < 32) throw new Error("APP_SECRET must be at least 32 bytes, base64-encoded");
  return buf;
}

export function supabaseConfig(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return { url, key };
}

/** The sample dataset is available in local development, or when explicitly enabled. */
export function demoEnabled(): boolean {
  return !isProduction || process.env.ENABLE_DEMO === "1";
}

export const API_BASE = process.env.F24_API_BASE ?? "https://24f.site/api/finance/v1";

/** A manually entered local key. Never serialized to a client component. */
export function localClientKey(): string | null {
  return process.env.NODE_ENV === "development" ? process.env.F24_CLIENT_API_KEY?.trim() || null : null;
}
