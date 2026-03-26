import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map(e => e.trim().toLowerCase());

async function assertAdmin() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() ?? "";
  return !!(session && ADMIN_EMAILS.includes(email));
}

// PATCH /api/admin/announcements/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await assertAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const body = await req.json() as Record<string, unknown>;
  const updated = await prisma.announcement.update({
    where: { id },
    data: {
      ...(typeof body.message   === "string"  && { message:   body.message.trim() }),
      ...(typeof body.color     === "string"  && { color:     body.color }),
      ...(typeof body.isActive  === "boolean" && { isActive:  body.isActive }),
      ...(typeof body.link      === "string"  && { link:      body.link || null }),
      ...(typeof body.linkText  === "string"  && { linkText:  body.linkText || null }),
      ...(body.expiresAt !== undefined        && { expiresAt: body.expiresAt ? new Date(body.expiresAt as string) : null }),
    },
  });
  return NextResponse.json(updated);
}

// DELETE /api/admin/announcements/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await assertAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  await prisma.announcement.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
