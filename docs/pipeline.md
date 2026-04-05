# AdSpoonX — Unified Crawl Pipeline

_Last updated: 2026-04-05 after the unified-pipeline refactor._

## TL;DR

All ads come from **one** source: the Facebook Ad Library Graph API, enriched
by a Playwright-based snapshot scraper running on the VPS. No more Apify, no
more 356-cookie HTML scraper, no more parallel data paths.

```
FB Graph API  →  text metadata
      │
      ▼
Playwright snapshot scraper (cookie pool, headless Chromium)
      │
      ▼
Quality filter (CTA + domain + product detection)
      │
      ▼
db_writer upsert (Ad + Shop rows, text only first)
      │
      ▼
r2_uploader (download → ffmpeg H.264 720p CRF28 → upload R2)
      │
      ▼
UPDATE Ad row with videoUrlWeb, thumbnailR2Url, pageProfilePictureUrl, videoBytes, videoDurationSec
```

## Infrastructure

| Component | Host | Purpose |
|---|---|---|
| `api_runner.py` + `api_runner_intl.py` | VPS `178.104.83.178` (screen) | Main crawl loops, US+CA and EU/APAC/LATAM |
| PostgreSQL 16 | Coolify `5.78.207.17:5432` | Primary DB (`adspoonx`) |
| Cloudflare R2 | `adspoonx-videos` bucket | Video + avatar + thumbnail storage |
| Next.js app | Coolify `adspoonx.com` / `staging.adspoonx.com` | API + UI |

**Auth chain**: VPS scraper → Graph API (`FB_AD_LIBRARY_TOKEN`) for text,
cookies from `accounts_live.txt` for snapshot scraping, then writes to Coolify
DB directly over Postgres and uploads to R2 via boto3. No Apify involved.

## fb-scraper module layout

```
api_runner.py         US+CA orchestrator
api_runner_intl.py    EU/APAC/LATAM orchestrator
fb_api_scraper.py     Graph API v21.0 /ads_archive client (rate limited)
snapshot_scraper.py   Playwright pool: N browsers × N cookies
cookie_pool.py        Rotation, per-cookie throttle, /me health check
quality_filter.py     CTA whitelist + domain blacklist + product detection
r2_uploader.py        boto3 + ffmpeg, single H.264 MP4 per ad (play + download)
db_writer.py          Ad/Shop/KeywordPerformance UPSERT
keywords.py           Master keyword list
```

## Cookie pool

- File: `/root/fb-scraper/accounts_live.txt` (chmod 600, gitignored)
- Format: `uid|cookie_string|fb_token` (one per line)
- Health check: `python3 test_cookie_health.py` → rewrites `accounts_live.txt`
  with only accounts whose `/me` Graph API call succeeds
- Rotation: round-robin with `COOKIE_MIN_INTERVAL_SEC=6` per cookie throttle
- Auto-disable: 3 consecutive fails → marked dead, Telegram alert

## Video/media format decision (A1, 2026-04-05)

**H.264 MP4 720p CRF 28** for BOTH web playback and download. One file per ad,
no dual-version complexity. Rationale:
- Universal compatibility (every OS, every browser)
- No on-demand transcoding needed for downloads
- ~3–6 MB per 30-second ad
- Browser streams progressively via `-movflags +faststart`

ffmpeg command (mirrored in `lib/video-transcode.ts` and `fb-scraper/r2_uploader.py`):
```bash
ffmpeg -i input.mp4 \
  -vf "scale=-2:720" \
  -c:v libx264 -crf 28 -preset fast \
  -movflags +faststart \
  -c:a aac -b:a 96k \
  output.mp4
```

## R2 key layout

```
videos/web/{md5(video_url)}.mp4      Transcoded web version (main play + download)
avatars/{pageId}.jpg                 Page avatar (deduped by pageId)
thumbnails/{md5(video_url)}.jpg      Poster frame (first second of video)
```

**Legacy keys** (still referenced by older ads): `videos/{md5}.mp4` flat layout
from the old Apify crawler. The orphan cleanup script (`scripts/r2-orphan-cleanup.mjs`)
removes entries that no Ad row references any more.

## Quick ops reference

### Is the scraper running?
```bash
ssh root@178.104.83.178 "screen -ls | grep api-"
# expect: api-runner and api-intl sessions
```

### Restart scrapers
```bash
ssh root@178.104.83.178 '
  pkill -9 chromium 2>/dev/null
  screen -S api-runner -X quit 2>/dev/null
  screen -S api-intl   -X quit 2>/dev/null
  cd /root/fb-scraper
  screen -dmS api-runner bash -c "source venv/bin/activate && python3 api_runner.py >> logs/api_runner.log 2>&1"
  screen -dmS api-intl   bash -c "source venv/bin/activate && python3 api_runner_intl.py >> logs/api_intl.log 2>&1"
'
```

### Check DB stats
```bash
ssh root@5.78.207.17 'docker exec -i coolify-db psql -U postgres -c "
  SELECT COUNT(*) AS total,
         COUNT(\"videoUrlWeb\") AS with_video,
         COUNT(\"pageProfilePictureUrl\") AS with_avatar
  FROM \"Ad\" WHERE \"updatedAt\" > NOW() - INTERVAL '"'"'1 hour'"'"';"'
```

### Refresh cookie pool health
```bash
ssh root@178.104.83.178 "cd /root/fb-scraper && source venv/bin/activate && python3 test_cookie_health.py"
```

### R2 orphan cleanup (dry-run first!)
```bash
cd landing-page
node scripts/r2-orphan-cleanup.mjs           # DRY RUN
node scripts/r2-orphan-cleanup.mjs --delete  # requires typing DELETE
```

### Deploy staging
```bash
git push origin staging
ssh root@5.78.207.17 'curl -s -X GET "http://localhost:8000/api/v1/deploy?uuid=tci1lezaqydcwpnkadhvp9nl&force=false" \
  -H "Authorization: Bearer 1|5Pj6lxpJPrDrZF0ux8GJCF3uQj2bjEAxwIDejxrDe417dad8"'
```
Verify: new container in `docker ps`, `grep videoUrlWeb` in `.next/server/chunks`,
`curl https://staging.adspoonx.com/api/health` → 200.

### Deploy production
Same as staging but UUID `uxawo67kt4yq8x4uqcz18z9i` and domain `adspoonx.com`,
branch `main`. Always deploy staging first.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `videoUrlWeb` NULL for all new ads | Cookie pool empty or all dead | Run `test_cookie_health.py`, regenerate cookies |
| Playwright "checkpoint" in logs | Cookie locked | Auto-disabled after 3 fails; wait for pool rotation |
| FB API `Rate limited (613)` | Burst too aggressive | Lower `COOKIE_MIN_INTERVAL_SEC` throttle won't help — `fb_api_scraper` has its own 10s sleep, just wait |
| Workflow logging HTTP 403 | `WORKFLOW_API_KEY` mismatch | `grep WORKFLOW_API_KEY` on both VPS .env and Coolify env, sync |
| ffmpeg "Error writing trailer" | Source video corrupt | Normal, `r2_uploader` skips and moves on |
| R2 bucket growing fast | Orphan accumulation | Run `scripts/r2-orphan-cleanup.mjs` monthly |

## What NOT to touch

- **Apify crawler** — deleted 2026-04-05, never coming back
- **HTML scraper** (`html_scraper.py`, `scraper.py`, etc.) — deleted, replaced by Playwright snapshot
- **356-cookie farm + 200 proxies** — dead, not recoverable
- **Dual-version video** (`videoUrlOriginal` + `videoUrlWeb`) — rejected, single MP4 only
