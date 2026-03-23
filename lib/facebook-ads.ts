import axios from "axios";

const FB_API_VERSION = "v21.0";
const FB_BASE_URL = `https://graph.facebook.com/${FB_API_VERSION}`;

export interface FbAd {
  id: string;
  ad_creative_bodies?: string[];
  ad_creative_link_captions?: string[];
  ad_creative_link_descriptions?: string[];
  ad_creative_link_titles?: string[];
  ad_delivery_start_time?: string;
  ad_delivery_stop_time?: string;
  ad_snapshot_url?: string;
  bylines?: string[];
  currency?: string;
  delivery_by_region?: { region: string; percentage: string }[];
  estimated_audience_size?: { lower_bound: number; upper_bound: number };
  impressions?: { lower_bound: string; upper_bound: string };
  languages?: string[];
  page_id?: string;
  page_name?: string;
  publisher_platforms?: string[];
  spend?: { lower_bound: string; upper_bound: string };
  // Apify-specific fields
  image_url?: string;
  video_url?: string;       // direct video URL (muted hover-play)
  thumbnail_url?: string;   // poster frame for video (image even when video_url exists)
  is_active?: boolean;
  cta_text?: string;
  page_profile_picture_url?: string;
  page_profile_uri?: string;
  country?: string;
  countries?: string[];     // all countries the ad ran in
  niche?: string;           // auto-detected niche (e.g. "Fashion & Apparel")
}

export interface FbAdsResponse {
  data: FbAd[];
  total?: number;
  page?: number;
  totalPages?: number;
  hasMore?: boolean;
  paging?: {
    cursors?: { before: string; after: string };
    next?: string;
  };
}

export interface SearchAdsParams {
  search_terms?: string;
  ad_reached_countries?: string[];
  ad_active_status?: "ACTIVE" | "INACTIVE" | "ALL";
  ad_type?: "ALL" | "POLITICAL_AND_ISSUE_ADS" | "HOUSING_ADS" | "EMPLOYMENT_ADS" | "CREDIT_ADS";
  limit?: number;
  after?: string; // cursor for pagination
}

const DEFAULT_FIELDS = [
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
  "estimated_audience_size",
  "impressions",
  "languages",
  "page_id",
  "page_name",
  "publisher_platforms",
  "spend",
].join(",");

export async function searchFacebookAds(
  params: SearchAdsParams
): Promise<FbAdsResponse> {
  const token = process.env.FACEBOOK_ACCESS_TOKEN;
  if (!token) throw new Error("FACEBOOK_ACCESS_TOKEN is not configured");

  const response = await axios.get<FbAdsResponse>(
    `${FB_BASE_URL}/ads_archive`,
    {
      params: {
        access_token: token,
        fields: DEFAULT_FIELDS,
        ad_reached_countries: params.ad_reached_countries?.join(",") ?? "VN",
        ad_active_status: params.ad_active_status ?? "ACTIVE",
        ad_type: params.ad_type ?? "ALL",
        search_terms: params.search_terms ?? "",
        limit: params.limit ?? 20,
        after: params.after,
      },
    }
  );

  return response.data;
}
