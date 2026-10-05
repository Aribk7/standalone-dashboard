import { redirect } from "next/navigation";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { DashboardPreview } from "@/components/dashboard/DashboardPreview";
import { previewModeEnabled } from "@/lib/preview";
import { demoLoopReport } from "@/lib/server/demo";
import { demoEnabled, localClientKey } from "@/lib/server/env";
import { currentSession } from "@/lib/server/session";

export default async function Home() {
  if (previewModeEnabled()) {
    const to = new Date();
    to.setUTCHours(0, 0, 0, 0);
    to.setUTCDate(to.getUTCDate() + 1);
    const from = new Date(to);
    from.setUTCDate(from.getUTCDate() - 90);
    const start = from.toISOString().slice(0, 10);
    const end = to.toISOString().slice(0, 10);
    return <DashboardPreview report={demoLoopReport(start, end)} to={end} />;
  }
  if (await currentSession()) redirect("/dashboard");
  return <AuthScreen demoAvailable={demoEnabled()} localKeyAvailable={!!localClientKey()} />;
}
