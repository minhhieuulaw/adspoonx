#!/bin/bash
# Replacement for Vercel cron — runs daily at 2AM UTC
# Add to crontab: 0 2 * * * /home/deploy/scripts/crawl-cron.sh >> /home/deploy/logs/crawl.log 2>&1

CRON_SECRET="${CRON_SECRET:-}"
APP_URL="${APP_URL:-http://localhost:3000}"

if [ -z "$CRON_SECRET" ]; then
  echo "[$(date)] ERROR: CRON_SECRET not set"
  exit 1
fi

response=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  "${APP_URL}/api/cron/crawl")

if [ "$response" = "200" ]; then
  echo "[$(date)] Crawl triggered successfully"
else
  echo "[$(date)] Crawl failed with status: $response"
fi
