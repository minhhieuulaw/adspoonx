import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import axios from "axios";

const FB_API_VERSION = "v21.0";
const FB_BASE_URL = `https://graph.facebook.com/${FB_API_VERSION}`;

const FIELDS = [
  "id",
  "ad_creative_bodies",
  "ad_creative_link_captions",
  "ad_creative_link_descriptions",
  "ad_creative_link_titles",
  "ad_delivery_start_time",
  "ad_delivery_stop_time",
  "ad_snapshot_url",
  "bylines",
  "currency",
  "delivery_by_region",
  "estimated_audience_size",
  "impressions",
  "languages",
  "page_id",
  "page_name",
  "publisher_platforms",
  "spend",
].join(",");

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const token = process.env.FACEBOOK_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Facebook token not configured" }, { status: 500 });
  }

  try {
    const res = await axios.get(`${FB_BASE_URL}/${id}`, {
      params: { access_token: token, fields: FIELDS },
    });
    return NextResponse.json(res.data);
  } catch (err: unknown) {
    console.error("[ads/[id]] Facebook API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch ad details" },
      { status: 502 }
    );
  }
}
