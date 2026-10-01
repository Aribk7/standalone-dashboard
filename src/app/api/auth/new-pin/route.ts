import { apiError, ok } from "@/lib/server/http";
import { withUniquePin } from "@/lib/server/pin";
import { currentSession } from "@/lib/server/session";
import { store } from "@/lib/server/store";

// Replace this dashboard's PIN. The old PIN stops working immediately;
// devices that are already signed in stay signed in.
export async function POST() {
  const session = await currentSession();
  if (!session) return apiError(401, "unauthenticated", "Sign in first.");
  const pin = await withUniquePin((pinIndex) => store().updateAccount(session.account.id, { pinIndex }));
  return ok({ pin });
}
