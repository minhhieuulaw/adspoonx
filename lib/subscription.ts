/**
 * Subscription helpers — plan limits, DB queries, scan management
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
  free:     { maxResults: 200, maxSavedAds: 10,   canFilterVideo: true,  canExport: false },
  starter:  { maxResults: 200, maxSavedAds: 100,  canFilterVideo: true,  canExport: false },
  premium:  { maxResults: 500, maxSavedAds: 500,  canFilterVideo: true,  canExport: true  },
  business: { maxResults: 1000, maxSavedAds: 9999, canFilterVideo: true,  canExport: true  },
};

/** Scans allocated per month per plan */
export const PLAN_SCANS: Record<Plan, number> = {
  free:     50,
  starter:  500,
  premium:  5000,
  business: 25000,
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

// ── Scan management ───────────────────────────────────────────────────────────

/**
 * Get current scan balance for a user, auto-resetting if the reset date has passed.
 * Initialises scansResetAt on first call.
 */
export async function getUserScans(userId: string): Promise<{ balance: number; resetAt: Date }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { scansBalance: true, scansResetAt: true },
  });

  const now = new Date();

  // If reset date has passed (or never set), refresh the balance
  if (!user?.scansResetAt || user.scansResetAt < now) {
    const plan = await getUserPlan(userId);
    const newBalance = PLAN_SCANS[plan];
    const nextReset = new Date(now);
    nextReset.setMonth(nextReset.getMonth() + 1);

    await prisma.user.update({
      where: { id: userId },
      data: { scansBalance: newBalance, scansResetAt: nextReset },
    });

    return { balance: newBalance, resetAt: nextReset };
  }

  return {
    balance: user.scansBalance,
    resetAt: user.scansResetAt,
  };
}

/**
 * Atomically deduct 1 scan. Returns true if successful, false if balance was 0.
 */
export async function deductScan(userId: string): Promise<boolean> {
  // First ensure the reset cycle is current
  const { balance } = await getUserScans(userId);
  if (balance <= 0) return false;

  const { count } = await prisma.user.updateMany({
    where: { id: userId, scansBalance: { gt: 0 } },
    data: { scansBalance: { decrement: 1 } },
  });

  return count > 0;
}

/**
 * Atomically deduct N scans. Returns true if successful (had enough balance).
 */
export async function deductScans(userId: string, amount: number): Promise<boolean> {
  const { balance } = await getUserScans(userId);
  if (balance < amount) return false;

  const { count } = await prisma.user.updateMany({
    where: { id: userId, scansBalance: { gte: amount } },
    data:  { scansBalance: { decrement: amount } },
  });

  return count > 0;
}

/**
 * Add scans to a user's balance (e.g. after a purchase).
 */
export async function addScans(userId: string, amount: number): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { scansBalance: { increment: amount } },
  });
}

/**
 * Grant plan scans when a subscription activates/renews.
 * Sets balance to plan allocation and advances reset date.
 */
export async function grantPlanScans(userId: string, plan: Plan): Promise<void> {
  const nextReset = new Date();
  nextReset.setMonth(nextReset.getMonth() + 1);

  await prisma.user.update({
    where: { id: userId },
    data: {
      scansBalance: PLAN_SCANS[plan],
      scansResetAt: nextReset,
    },
  });
}
