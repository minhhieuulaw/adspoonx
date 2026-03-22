// Apify webhook handler — called by Apify when each actor run succeeds
// URL: /api/webhook/apify?secret=...&keyword=...&country=...
import { NextRequest, NextResponse } from "next/server";
import { upsertAds } from "@/lib/crawler";

export const maxDuration = 10;

interface ApifyWebhookBody {
  eventType: string;
  eventData?: { actorRunId?: string };
}

export async function POST(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  if (searchParams.get("secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keyword = searchParams.get("keyword") ?? "";
  const country = searchParams.get("country") ?? "US";

  let body: ApifyWebhookBody;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  if (body.eventType !== "ACTOR.RUN.SUCCEEDED") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const runId = body.eventData?.actorRunId;
  if (!runId) return NextResponse.json({ error: "No runId" }, { status: 400 });

  const token = process.env.APIFY_API_TOKEN;
  if (!token) return NextResponse.json({ error: "No token" }, { status: 500 });

  const res = await fetch(
    `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${token}&limit=300&format=json`
  );
  if (!res.ok) return NextResponse.json({ error: "Fetch failed" }, { status: 500 });

  const items = await res.json();
  const saved = await upsertAds(items, { keyword, country });

  console.log(`[webhook/apify] ${keyword}/${country}: ${saved} ads saved`);
  return NextResponse.json({ ok: true, saved });
}
