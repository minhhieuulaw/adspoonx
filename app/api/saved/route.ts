import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET — lấy danh sách saved ad IDs của user
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const saved = await prisma.savedAd.findMany({
    where: { userId: session.user.id },
    select: { adId: true, id: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(saved);
}

// POST — lưu hoặc bỏ lưu (toggle) một ad
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as { adId: string; adData: object };
  const { adId, adData } = body;

  if (!adId) {
    return NextResponse.json({ error: "adId is required" }, { status: 400 });
  }

  // Toggle: nếu đã lưu thì xóa, chưa lưu thì thêm
  const existing = await prisma.savedAd.findUnique({
    where: { userId_adId: { userId: session.user.id, adId } },
  });

  if (existing) {
    await prisma.savedAd.delete({ where: { id: existing.id } });
    return NextResponse.json({ saved: false });
  }

  await prisma.savedAd.create({
    data: {
      userId: session.user.id,
      adId,
      adData: adData ?? {},
    },
  });

  return NextResponse.json({ saved: true });
}
