/**
 * Admin endpoints:
 * GET  /api/admin/crawl  — DB stats
 * POST /api/admin/crawl  — trigger manual crawl
 */
import { NextRequest, NextResponse } from "next/server";
import { crawlAndStore, crawlBatch, cleanOldAds, getDbStats, DEFAULT_CRAWL_JOBS } from "@/lib/crawler";
import { auth } from "@/auth";

export const maxDuration = 300;

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "").split(",").map(e => e.trim().toLowerCase());

async function checkAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const email = session.user.email?.toLowerCase() ?? "";
  // Allow if ADMIN_EMAILS is set and matches, or fallback allow any logged-in user in dev
  if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(email)) return null;
  return session;
}

// GET — return DB stats
export async function GET() {
  const session = await checkAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stats = await getDbStats();
  return NextResponse.json({ ok: true, stats, jobs: DEFAULT_CRAWL_JOBS });
}

// POST — trigger crawl
export async function POST(req: NextRequest) {
  const session = await checkAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    action?: "crawl_single" | "crawl_all" | "clean";
    keyword?: string;
    country?: string;
  };

  if (body.action === "clean") {
    const deleted = await cleanOldAds();
    return NextResponse.json({ ok: true, deleted });
  }

  if (body.action === "crawl_all") {
    const results = await crawlBatch(DEFAULT_CRAWL_JOBS.slice(0, 10));
    const totalSaved = results.reduce((s, r) => s + r.saved, 0);
    return NextResponse.json({ ok: true, totalSaved, results });
  }

  // Default: crawl_single
  const { keyword, country } = body;
  if (!keyword || !country) {
    return NextResponse.json({ error: "keyword and country required" }, { status: 400 });
  }
  const saved = await crawlAndStore({ keyword, country });
  return NextResponse.json({ ok: true, saved });
}
