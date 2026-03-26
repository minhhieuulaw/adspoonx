import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Called by the VPS scraper after each run to log results.
// Secured with WORKFLOW_API_KEY env var (set same key on VPS).
export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey || apiKey !== process.env.WORKFLOW_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as {
    schedule?:   string;
    status?:     string;
    totalAds?:   number;
    newAds?:     number;
    updatedAds?: number;
    errors?:     number;
    durationMs?: number;
    notes?:      string;
  };

  const run = await prisma.workflowRun.create({
    data: {
      schedule:   body.schedule   ?? "manual",
      status:     body.status     ?? "success",
      totalAds:   body.totalAds   ?? 0,
      newAds:     body.newAds     ?? 0,
      updatedAds: body.updatedAds ?? 0,
      errors:     body.errors     ?? 0,
      durationMs: body.durationMs ?? null,
      notes:      body.notes      ?? null,
    },
  });
  return NextResponse.json(run, { status: 201 });
}
