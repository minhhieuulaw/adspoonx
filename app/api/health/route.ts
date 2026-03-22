import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function maskUrl(url?: string) {
  if (!url) return "NOT_SET";
  try {
    const u = new URL(url.trim());
    return `${u.protocol}//${u.username.slice(0,8)}***@${u.hostname}:${u.port}/${u.pathname.replace("/","")}`;
  } catch { return `PARSE_ERROR(${url.slice(0,30)})`; }
}

export async function GET() {
  const dbInfo = {
    POOLER_URL:   process.env.POOLER_URL ? maskUrl(process.env.POOLER_URL) : "NOT_SET",
    DATABASE_URL: maskUrl(process.env.DATABASE_URL),
    DIRECT_URL:   process.env.DIRECT_URL ? maskUrl(process.env.DIRECT_URL) : "NOT_SET",
    PGHOST:       process.env.PGHOST ?? "NOT_SET",
  };
  try {
    const count = await prisma.ad.count();
    const activeUS = await prisma.ad.count({ where: { isActive: true, country: "US" } });
    return NextResponse.json({ ok: true, totalAds: count, activeUS, dbInfo });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e), dbInfo }, { status: 500 });
  }
}
