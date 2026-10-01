import { apiError, ok } from "@/lib/server/http";
import { currentSession, refreshSession } from "@/lib/server/session";

// Called when the dashboard opens: re-issues the long-lived cookie.
export async function POST() {
  const session = await currentSession();
  if (!session) return apiError(401, "unauthenticated", "Signed out.");
  await refreshSession(session);
  return ok({ ok: true, demo: session.account.demo });
}
