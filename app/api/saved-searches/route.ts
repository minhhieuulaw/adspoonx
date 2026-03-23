import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET — lấy danh sách saved searches của user
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searches = await prisma.savedSearch.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ data: searches });
}

// POST — lưu bộ tìm kiếm mới
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const name = (body.name ?? "").trim();
  const filters = body.filters;

  if (!name || !filters) {
    return NextResponse.json({ error: "Missing name or filters" }, { status: 400 });
  }

  // Giới hạn 20 saved searches / user
  const count = await prisma.savedSearch.count({ where: { userId: session.user.id } });
  if (count >= 20) {
    return NextResponse.json({ error: "Maximum 20 saved searches reached" }, { status: 400 });
  }

  const search = await prisma.savedSearch.create({
    data: {
      userId: session.user.id,
      name,
      filters,
    },
  });

  return NextResponse.json({ data: search }, { status: 201 });
}

// DELETE — xóa saved search
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  // Chỉ xóa nếu thuộc về user
  await prisma.savedSearch.deleteMany({
    where: { id, userId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}
