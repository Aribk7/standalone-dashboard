import { redirect } from "next/navigation";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { demoEnabled, localClientKey } from "@/lib/server/env";
import { currentSession } from "@/lib/server/session";

export default async function Home() {
  if (await currentSession()) redirect("/dashboard");
  return <AuthScreen demoAvailable={demoEnabled()} localKeyAvailable={!!localClientKey()} />;
}
