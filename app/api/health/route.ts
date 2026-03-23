import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const count = await prisma.ad.count();
    const activeUS = await prisma.ad.count({ where: { isActive: true, country: "US" } });
    return NextResponse.json({ ok: true, totalAds: count, activeUS });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
