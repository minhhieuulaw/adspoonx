/**
 * GET /api/admin/stats
 * Trả về toàn bộ metrics cho admin dashboard.
 * Chỉ admin (ADMIN_EMAILS) mới được truy cập.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map(e => e.trim().toLowerCase());

async function checkAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  if (!ADMIN_EMAILS.includes(session.user.email?.toLowerCase() ?? "")) return null;
  return session;
}

export async function GET() {
  const session = await checkAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const day30ago = new Date(now.getTime() - 30 * 86_400_000);
  const day7ago  = new Date(now.getTime() -  7 * 86_400_000);

  const [
    totalUsers,
    usersLast30Days,
    subscriptionsByPlan,
    activeSubscriptions,
    scanPurchasesTotal,
    scanPurchasesLast12m,
    totalAds,
    activeAds,
    adsByCountry,
    adsByNiche,
    adsLast7Days,
    googleUsers,
    savedAdsTotal,
    unclassifiedAds,
    classifiedAds,
  ] = await Promise.all([
    // 1. Tổng users
    prisma.user.count(),

    // 2. Signup theo ngày (30 ngày gần nhất)
    prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT TO_CHAR("createdAt", 'YYYY-MM-DD') AS date, COUNT(*) AS count
      FROM "User"
      WHERE "createdAt" >= ${day30ago}
      GROUP BY date
      ORDER BY date ASC
    `,

    // 3. Subscriptions theo plan
    prisma.subscription.groupBy({
      by: ["plan", "status"],
      _count: { _all: true },
      orderBy: { _count: { plan: "desc" } },
    }),

    // 4. Active subscriptions (không expired/cancelled)
    prisma.subscription.count({
      where: {
        status: { notIn: ["cancelled", "expired"] },
        OR: [
          { currentPeriodEnd: null },
          { currentPeriodEnd: { gt: now } },
        ],
      },
    }),

    // 5. Tổng doanh thu từ scan purchases (cents)
    prisma.scanPurchase.aggregate({ _sum: { amountCents: true }, _count: { _all: true } }),

    // 6. Doanh thu scan purchases theo tháng (12 tháng gần nhất)
    prisma.$queryRaw<{ month: string; amount: bigint; count: bigint }[]>`
      SELECT
        TO_CHAR("createdAt", 'YYYY-MM') AS month,
        SUM("amountCents") AS amount,
        COUNT(*) AS count
      FROM "ScanPurchase"
      WHERE "createdAt" >= NOW() - INTERVAL '12 months'
      GROUP BY month
      ORDER BY month ASC
    `,

    // 7. Tổng ads
    prisma.ad.count(),

    // 8. Ads đang active
    prisma.ad.count({ where: { isActive: true } }),

    // 9. Ads theo country (top 15)
    prisma.ad.groupBy({
      by: ["country"],
      _count: { _all: true },
      orderBy: { _count: { country: "desc" } },
      take: 15,
    }),

    // 10. Ads theo niche (top 12)
    prisma.ad.groupBy({
      by: ["niche"],
      _count: { _all: true },
      where: { niche: { not: null } },
      orderBy: { _count: { niche: "desc" } },
      take: 12,
    }),

    // 11. Ads scraped theo ngày (7 ngày gần nhất)
    prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT TO_CHAR("scrapedAt", 'YYYY-MM-DD') AS date, COUNT(*) AS count
      FROM "Ad"
      WHERE "scrapedAt" >= ${day7ago}
      GROUP BY date
      ORDER BY date ASC
    `,

    // 12. Users đăng ký qua Google
    prisma.account.count({ where: { provider: "google" } }),

    // 13. Saved ads total
    prisma.savedAd.count(),

    // 14. Unclassified ads (niche IS NULL or 'Other') — hidden from users
    prisma.ad.count({
      where: {
        OR: [
          { niche: null },
          { niche: "Other" },
        ],
      },
    }),

    // 15. Classified ads (has real niche, visible to users)
    prisma.ad.count({
      where: {
        niche: { not: null, notIn: ["Other"] },
      },
    }),
  ]);

  // Tính conversion rate (free → paid)
  const paidUsers = subscriptionsByPlan
    .filter(s => s.plan !== "free" && s.status !== "cancelled" && s.status !== "expired")
    .reduce((sum, s) => sum + s._count._all, 0);

  const conversionRate = totalUsers > 0
    ? Math.round((paidUsers / totalUsers) * 10000) / 100
    : 0;

  return NextResponse.json({
    users: {
      total: totalUsers,
      google: googleUsers,
      email: totalUsers - googleUsers,
      last30Days: usersLast30Days.map(r => ({
        date: r.date,
        count: Number(r.count),
      })),
      paid: paidUsers,
      conversionRate,
    },
    subscriptions: {
      byPlan: subscriptionsByPlan.map(s => ({
        plan: s.plan,
        status: s.status,
        count: s._count._all,
      })),
      activeTotal: activeSubscriptions,
    },
    revenue: {
      scanPurchases: {
        totalCents: scanPurchasesTotal._sum.amountCents ?? 0,
        totalCount: scanPurchasesTotal._count._all,
        byMonth: scanPurchasesLast12m.map(r => ({
          month: r.month,
          amountCents: Number(r.amount),
          count: Number(r.count),
        })),
      },
    },
    ads: {
      total: totalAds,
      active: activeAds,
      classified: classifiedAds,
      unclassified: unclassifiedAds,
      classificationRate: totalAds > 0
        ? Math.round((classifiedAds / totalAds) * 10000) / 100
        : 0,
      byCountry: adsByCountry.map(r => ({ country: r.country, count: r._count._all })),
      byNiche: adsByNiche.map(r => ({ niche: r.niche ?? "Unknown", count: r._count._all })),
      last7Days: adsLast7Days.map(r => ({ date: r.date, count: Number(r.count) })),
    },
    savedAds: savedAdsTotal,
  });
}
