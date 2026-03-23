/**
 * Subscription helpers — plan limits & DB queries
 */
import { prisma } from "./prisma";

export type Plan = "free" | "starter" | "premium" | "business";

export interface PlanLimits {
  maxResults: number;       // max ads per API page
  maxSavedAds: number;      // max saved ads
  canFilterVideo: boolean;
  canExport: boolean;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free:     { maxResults: 12,  maxSavedAds: 10,   canFilterVideo: true,  canExport: false },
  starter:  { maxResults: 48,  maxSavedAds: 100,  canFilterVideo: true,  canExport: false },
  premium:  { maxResults: 100, maxSavedAds: 500,  canFilterVideo: true,  canExport: true  },
  business: { maxResults: 200, maxSavedAds: 9999, canFilterVideo: true,  canExport: true  },
};

export const PLAN_LABELS: Record<Plan, string> = {
  free:     "Free",
  starter:  "Starter",
  premium:  "Premium",
  business: "Business",
};

/** Fetch user's current plan from DB (defaults to "free" if no subscription) */
export async function getUserPlan(userId: string): Promise<Plan> {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { plan: true, status: true, currentPeriodEnd: true },
  });

  if (!sub) return "free";

  // Treat as free if cancelled/expired or past period end
  const isExpired = sub.currentPeriodEnd && sub.currentPeriodEnd < new Date();
  if (sub.status === "cancelled" || sub.status === "expired" || isExpired) return "free";

  const plan = sub.plan as Plan;
  return plan in PLAN_LIMITS ? plan : "free";
}

export function getLimits(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}
