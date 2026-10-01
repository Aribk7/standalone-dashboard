import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { DEFAULT_RANGE, RANGE_COOKIE, isRangeId } from "@/lib/ranges";
import { currentSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await currentSession();
  if (!session) redirect("/");
  const saved = (await cookies()).get(RANGE_COOKIE)?.value;
  return <Dashboard demo={session.account.demo} initialRange={isRangeId(saved) ? saved : DEFAULT_RANGE} />;
}
