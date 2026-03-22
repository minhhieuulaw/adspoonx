// DEV ONLY — remove before production
import { NextRequest, NextResponse } from "next/server";

const APIFY_BASE = "https://api.apify.com/v2";

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const actor = searchParams.get("actor") ?? "basic"; // basic | premium
  const q = searchParams.get("q") ?? "nike";

  const actorId =
    actor === "premium"
      ? "memo23~facebook-ads-library-scraper-cheerio"
      : "curious_coder~facebook-ads-library-scraper";

  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "APIFY_API_TOKEN not set" }, { status: 500 });
  }

  const input = {
    searchTerms: q,
    countries: ["US"],
    activeStatus: "ACTIVE",
    maxResults: 2, // minimal for testing
  };

  try {
    const url =
      `${APIFY_BASE}/acts/${actorId}/run-sync-get-dataset-items` +
      `?token=${token}&timeout=120&memory=1024&format=json`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    const raw = await res.json();
    // Log full raw output so we can adjust mappers
    console.log("[test-apify] RAW OUTPUT:", JSON.stringify(raw, null, 2));

    return NextResponse.json({ actor: actorId, input, raw });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
