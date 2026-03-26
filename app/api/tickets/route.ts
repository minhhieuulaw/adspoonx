import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// POST /api/tickets — user tạo ticket
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { subject, body, priority } = await req.json() as {
    subject: string; body: string; priority?: string;
  };

  if (!subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "subject và body là bắt buộc" }, { status: 400 });
  }

  const VALID_PRIORITIES = ["low", "normal", "high", "urgent"];
  const ticket = await prisma.ticket.create({
    data: {
      userId:   session.user.id,
      subject:  subject.trim(),
      body:     body.trim(),
      priority: VALID_PRIORITIES.includes(priority ?? "") ? priority! : "normal",
    },
  });
  return NextResponse.json(ticket, { status: 201 });
}

// GET /api/tickets — user xem ticket của mình
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tickets = await prisma.ticket.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(tickets);
}
