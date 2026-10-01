import { normalizeLoopReport } from "@/lib/normalize";
import { DEFAULT_RANGE, isRangeId, resolveRange } from "@/lib/ranges";
import { demoLoopReport } from "@/lib/server/demo";
import { cachedReport } from "@/lib/server/f24";
import { apiError, fromUpstream, ok } from "@/lib/server/http";
import { currentSession } from "@/lib/server/session";
import type { LoopReport, ReportPayload } from "@/lib/types";

export async function GET(req: Request) {
  const session = await currentSession();
  if (!session) return apiError(401, "unauthenticated", "Signed out.");

  const param = new URL(req.url).searchParams.get("range") ?? DEFAULT_RANGE;
  if (!isRangeId(param)) return apiError(400, "bad_request", "Unknown range.");
  const { from, to } = resolveRange(param);

  if (session.account.demo) {
    const body: ReportPayload<LoopReport> = {
      data: demoLoopReport(from, to),
      asOf: new Date().toISOString(),
      range: { id: param, from, to },
      demo: true,
    };
    return ok(body);
  }

  try {
    const res = await cachedReport(session.account.id, "/loop/report", from, to);
    const body: ReportPayload<LoopReport> = {
      data: normalizeLoopReport(res.data),
      asOf: res.asOf,
      range: { id: param, from, to },
      demo: false,
    };
    return ok(body);
  } catch (e) {
    return fromUpstream(e);
  }
}
