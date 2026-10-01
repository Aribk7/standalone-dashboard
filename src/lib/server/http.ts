import "server-only";
import { NextResponse } from "next/server";
import type { ApiErrorBody } from "../types";
import { UpstreamError } from "./f24";

type Code = ApiErrorBody["error"]["code"];

export function apiError(status: number, code: Code, message: string, retryAfter?: number) {
  const body: ApiErrorBody = { error: { code, message, ...(retryAfter ? { retryAfter } : {}) } };
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}) },
  });
}

export function ok<T>(body: T, init?: { status?: number }) {
  return NextResponse.json(body, { status: init?.status ?? 200, headers: { "Cache-Control": "no-store" } });
}

/** Maps a 24F API failure onto the dashboard's own error codes. */
export function fromUpstream(e: unknown) {
  if (e instanceof UpstreamError) {
    switch (e.status) {
      case 401:
        return apiError(401, "key_invalid", "This API key is no longer valid. It may have been revoked or expired.");
      case 403:
        return apiError(403, "not_activated", "This 24F workspace is not activated yet.");
      case 409:
        return apiError(409, "not_connected", e.message || "A data source is not connected.");
      case 429:
        return apiError(429, "rate_limited", "24F's rate limit was reached. Retrying shortly.", e.retryAfter ?? 60);
      case 400:
        return apiError(400, "bad_request", e.message);
      default:
        return apiError(502, "upstream", "24F is temporarily unavailable. Retrying shortly.");
    }
  }
  console.error(e);
  return apiError(500, "server", "Something went wrong on our side.");
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
