/**
 * DEV-ONLY endpoint — kiểm tra Facebook Ads Library API token.
 * XÓA file này trước khi deploy production.
 */
import { NextResponse } from "next/server";
import { searchFacebookAds } from "@/lib/facebook-ads";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  try {
    const data = await searchFacebookAds({
      search_terms: "sale",
      ad_reached_countries: ["VN"],
      ad_active_status: "ACTIVE",
      limit: 3,
    });

    return NextResponse.json({
      success: true,
      total: data.data.length,
      hasPaging: !!data.paging,
      sample: data.data[0] ?? null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // Lấy response body từ Facebook nếu có
    const fbError =
      err &&
      typeof err === "object" &&
      "response" in err &&
      err.response &&
      typeof err.response === "object" &&
      "data" in err.response
        ? err.response.data
        : null;
    return NextResponse.json(
      { success: false, error: message, fbError },
      { status: 502 }
    );
  }
}
