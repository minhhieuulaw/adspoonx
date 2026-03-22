import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserPlan, PLAN_LABELS } from "@/lib/subscription";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ plan: "free", label: "Free" });
  }
  const plan  = await getUserPlan(session.user.id);
  const label = PLAN_LABELS[plan];
  return NextResponse.json({ plan, label });
}
