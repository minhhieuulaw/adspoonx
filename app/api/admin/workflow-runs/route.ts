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

// GET /api/admin/workflow-runs?limit=50
export async function GET(req: NextRequest) {
  if (!await assertAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "50"), 200);
  const runs = await prisma.workflowRun.findMany({
    orderBy: { runAt: "desc" },
    take: limit,
  });
  return NextResponse.json(runs);
}
