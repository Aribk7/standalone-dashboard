import { ok, readJson } from "@/lib/server/http";
import { endSession } from "@/lib/server/session";

export async function POST(req: Request) {
  const body = await readJson(req);
  await endSession({ everywhere: body.everywhere === true });
  return ok({ ok: true });
}
