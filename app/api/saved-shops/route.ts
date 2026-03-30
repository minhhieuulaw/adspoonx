import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET — list user's saved shops
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const saved = await prisma.savedShop.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { shopPageId: true },
  });

  return NextResponse.json({
    data: saved.map(s => s.shopPageId),
  });
}

// POST — toggle save/unsave a shop
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { shopPageId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { shopPageId } = body;
  if (!shopPageId || typeof shopPageId !== "string") {
    return NextResponse.json({ error: "Missing shopPageId" }, { status: 400 });
  }

  // Check if already saved
  const existing = await prisma.savedShop.findUnique({
    where: { userId_shopPageId: { userId: session.user.id, shopPageId } },
  });

  if (existing) {
    await prisma.savedShop.delete({ where: { id: existing.id } });
    return NextResponse.json({ saved: false });
  }

  await prisma.savedShop.create({
    data: { userId: session.user.id, shopPageId },
  });

  return NextResponse.json({ saved: true });
}
