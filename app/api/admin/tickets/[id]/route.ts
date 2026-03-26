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

// PATCH /api/admin/tickets/[id] — update status và/hoặc reply
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await assertAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const VALID_STATUSES = ["open", "in_progress", "resolved", "closed"];
  const body = await req.json() as { status?: string; reply?: string };

  const updated = await prisma.ticket.update({
    where: { id },
    data: {
      ...(body.status && VALID_STATUSES.includes(body.status) && { status: body.status }),
      ...(typeof body.reply === "string" && {
        reply:     body.reply.trim() || null,
        repliedAt: body.reply.trim() ? new Date() : null,
      }),
    },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  return NextResponse.json(updated);
}
