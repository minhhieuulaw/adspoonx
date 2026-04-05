\echo === WORKFLOW RUNS LAST 7 DAYS ===
SELECT schedule, status, COUNT(*) AS runs, SUM("newAds") AS total_new, MAX("runAt") AS last_run
FROM "WorkflowRun"
WHERE "runAt" > NOW() - INTERVAL '7 days'
GROUP BY schedule, status
ORDER BY MAX("runAt") DESC;

\echo === AD TOTAL STATS ===
SELECT COUNT(*) AS total,
       COUNT("videoUrl") AS with_videoUrl_col,
       COUNT(NULLIF("videoUrl", '')) AS nonempty_video,
       COUNT("imageUrl") AS with_imageUrl,
       COUNT(NULLIF("imageUrl", '')) AS nonempty_image
FROM "Ad";

\echo === NEW ADS LAST 24H ===
SELECT COUNT(*) FROM "Ad" WHERE "scrapedAt" > NOW() - INTERVAL '24 hours';

\echo === VIDEOURL BREAKDOWN ===
SELECT
  CASE
    WHEN "videoUrl" IS NULL THEN 'NULL'
    WHEN "videoUrl" = '' THEN 'EMPTY'
    WHEN "videoUrl" LIKE 'https://videos.adspoonx.com/%' THEN 'R2_custom_domain'
    WHEN "videoUrl" LIKE 'https://pub-%.r2.dev/%' THEN 'R2_pub_dev'
    WHEN "videoUrl" LIKE '%fbcdn.net%' THEN 'FB_CDN'
    ELSE 'OTHER'
  END AS kind,
  COUNT(*) AS n
FROM "Ad"
GROUP BY kind
ORDER BY n DESC;

\echo === IMAGEURL BREAKDOWN ===
SELECT
  CASE
    WHEN "imageUrl" IS NULL THEN 'NULL'
    WHEN "imageUrl" = '' THEN 'EMPTY'
    WHEN "imageUrl" LIKE '%fbcdn.net%' THEN 'FB_CDN'
    WHEN "imageUrl" LIKE '%r2.dev%' OR "imageUrl" LIKE '%videos.adspoonx.com%' THEN 'R2'
    ELSE 'OTHER'
  END AS kind,
  COUNT(*) AS n
FROM "Ad"
GROUP BY kind
ORDER BY n DESC;

\echo === RAWDATA HAS VIDEO FIELD BREAKDOWN ===
SELECT
  CASE
    WHEN "rawData"->>'videoUrl' IS NOT NULL AND "rawData"->>'videoUrl' != '' THEN 'rawData.videoUrl'
    WHEN "rawData"->'snapshot'->>'video_hd_url' IS NOT NULL THEN 'snapshot.video_hd_url'
    WHEN "rawData"->'snapshot'->>'video_sd_url' IS NOT NULL THEN 'snapshot.video_sd_url'
    ELSE 'NO_VIDEO_IN_RAW'
  END AS kind,
  COUNT(*) AS n
FROM "Ad"
GROUP BY kind
ORDER BY n DESC;

\echo === ADS SCRAPED FROM FB API vs OTHER (last 7 days) ===
SELECT
  CASE
    WHEN "rawData" ? 'ad_snapshot_url' AND NOT ("rawData" ? 'snapshot') THEN 'FB_API_only'
    WHEN "rawData" ? 'snapshot' THEN 'HTML_or_Apify (has snapshot)'
    ELSE 'UNKNOWN'
  END AS source,
  COUNT(*) AS n
FROM "Ad"
WHERE "scrapedAt" > NOW() - INTERVAL '7 days'
GROUP BY source
ORDER BY n DESC;
