import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map(e => e.trim().toLowerCase());

async function assertAdmin() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() ?? "";
  if (!session || !ADMIN_EMAILS.includes(email)) return false;
  return true;
}

// GET /api/admin/announcements — list all
export async function GET() {
  if (!await assertAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const list = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(list);
}

// POST /api/admin/announcements — create
export async function POST(req: NextRequest) {
  if (!await assertAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { message, color, link, linkText, expiresAt } = await req.json() as {
    message: string; color?: string; link?: string; linkText?: string; expiresAt?: string;
  };

  if (!message?.trim()) return NextResponse.json({ error: "message required" }, { status: 400 });

  const item = await prisma.announcement.create({
    data: {
      message: message.trim(),
      color:   color ?? "purple",
      link:    link ?? null,
      linkText: linkText ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
