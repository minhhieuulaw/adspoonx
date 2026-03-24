import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserPlan, PLAN_LABELS, PLAN_SCANS, getUserScans } from "@/lib/subscription";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ plan: "free", label: "Free", scansBalance: 0, scansTotal: 50, scansResetAt: null });
  }

  const [plan, { balance, resetAt }] = await Promise.all([
    getUserPlan(session.user.id),
    getUserScans(session.user.id),
  ]);

  return NextResponse.json({
    plan,
    label: PLAN_LABELS[plan],
    scansBalance: balance,
    scansTotal: PLAN_SCANS[plan],
    scansResetAt: resetAt,
  });
}
