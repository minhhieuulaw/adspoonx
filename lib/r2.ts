/**
 * Cloudflare R2 — S3-compatible object storage for video files.
 *
 * Upload flow: Facebook CDN video → download to buffer → upload to R2
 * Public URL:  https://pub-{id}.r2.dev/{key}  (requires Public Dev URL enabled)
 */

import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? "";
const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID ?? "";
const SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY ?? "";
const BUCKET     = process.env.R2_BUCKET_NAME ?? "adspoonx-videos";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
});

/** Check if a key already exists in R2 */
export async function r2Exists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

/** Upload a buffer to R2, returns the public URL */
export async function r2Upload(key: string, body: Buffer, contentType = "video/mp4"): Promise<string> {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
  // Public dev URL format
  return `https://pub-${ACCOUNT_ID}.r2.dev/${key}`;
}

/**
 * Download a video from URL and upload to R2.
 * Returns the permanent R2 URL, or null on failure.
 * Skips if already uploaded (by key).
 * Max file size: 50MB to avoid memory issues.
 */
export async function downloadAndUploadVideo(
  videoUrl: string,
  adId: string,
): Promise<string | null> {
  const key = `videos/${adId}.mp4`;

  // Skip if already uploaded
  if (await r2Exists(key)) {
    return `https://pub-${ACCOUNT_ID}.r2.dev/${key}`;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000); // 30s timeout

    const res = await fetch(videoUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    // Check content length — skip if > 50MB
    const contentLength = parseInt(res.headers.get("content-length") ?? "0");
    if (contentLength > 50 * 1024 * 1024) return null;

    const buffer = Buffer.from(await res.arrayBuffer());

    // Skip tiny files (likely error pages)
    if (buffer.length < 10_000) return null;

    const contentType = res.headers.get("content-type") ?? "video/mp4";
    return await r2Upload(key, buffer, contentType);
  } catch {
    return null;
  }
}
