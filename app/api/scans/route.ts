import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserScans, PLAN_SCANS, getUserPlan } from "@/lib/subscription";

export const SCAN_PACKS = [
  { id: "pack_500",   scans: 500,   price: 9,  label: "500 Scans",    variantId: Number(process.env.NEXT_PUBLIC_LS_VARIANT_SCANS_500  ?? 0) },
  { id: "pack_2000",  scans: 2000,  price: 29, label: "2,000 Scans",  variantId: Number(process.env.NEXT_PUBLIC_LS_VARIANT_SCANS_2000 ?? 0) },
  { id: "pack_10000", scans: 10000, price: 99, label: "10,000 Scans", variantId: Number(process.env.NEXT_PUBLIC_LS_VARIANT_SCANS_10000 ?? 0) },
] as const;

/** GET /api/scans — return current balance + available packs */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [{ balance, resetAt }, plan] = await Promise.all([
    getUserScans(session.user.id),
    getUserPlan(session.user.id),
  ]);

  return NextResponse.json({
    balance,
    total: PLAN_SCANS[plan],
    resetAt,
    packs: SCAN_PACKS,
  });
}

/** POST /api/scans — initiate checkout to buy a scan pack */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { packId } = await req.json() as { packId: string };
  const pack = SCAN_PACKS.find(p => p.id === packId);
  if (!pack) {
    return NextResponse.json({ error: "Invalid pack" }, { status: 400 });
  }

  if (!pack.variantId) {
    return NextResponse.json({ error: "Scan packs not configured yet" }, { status: 503 });
  }

  // Reuse the existing checkout endpoint logic via internal fetch
  const origin = req.nextUrl.origin;
  const res = await fetch(`${origin}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: req.headers.get("cookie") ?? "" },
    body: JSON.stringify({ variantId: pack.variantId }),
  });

  const data = await res.json() as { checkoutUrl?: string; error?: string };
  return NextResponse.json(data, { status: res.status });
}
