#!/usr/bin/env python3
"""Audit R2 bucket: count objects per prefix, total size, look for dupes."""
import os
import sys
from collections import defaultdict

try:
    import boto3
    from botocore.client import Config
except ImportError:
    print("boto3 not installed")
    sys.exit(1)


def parse_env(path):
    env = {}
    if not os.path.exists(path):
        return env
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def main():
    env = parse_env("/root/fb-scraper/.env")
    # Fall back to landing-page .env.local if running locally
    if not env.get("R2_ACCOUNT_ID"):
        env = parse_env("/tmp/landing.env")

    account = env.get("R2_ACCOUNT_ID", "")
    key = env.get("R2_ACCESS_KEY_ID", "")
    secret = env.get("R2_SECRET_ACCESS_KEY", "")
    bucket = env.get("R2_BUCKET_NAME", "adspoonx-videos")

    if not account:
        print("missing R2_ACCOUNT_ID")
        sys.exit(1)

    s3 = boto3.client(
        "s3",
        endpoint_url=f"https://{account}.r2.cloudflarestorage.com",
        aws_access_key_id=key,
        aws_secret_access_key=secret,
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )

    print(f"=== BUCKET: {bucket} ===")

    prefix_stats = defaultdict(lambda: {"count": 0, "size": 0})
    total_count = 0
    total_size = 0
    dup_hashes = defaultdict(int)   # strip extension -> count

    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket):
        for obj in page.get("Contents", []):
            k = obj["Key"]
            sz = obj["Size"]
            total_count += 1
            total_size += sz

            # Top-level prefix
            top = k.split("/", 1)[0] if "/" in k else "(root)"
            prefix_stats[top]["count"] += 1
            prefix_stats[top]["size"] += sz

            # Two-level prefix for videos/*
            if "/" in k:
                parts = k.split("/")
                if len(parts) >= 3:
                    two = f"{parts[0]}/{parts[1]}"
                    prefix_stats[two]["count"] += 1
                    prefix_stats[two]["size"] += sz

            # Dedup check: strip directory + extension, count hash
            base = k.rsplit("/", 1)[-1].rsplit(".", 1)[0]
            dup_hashes[base] += 1

    print(f"\nTOTAL: {total_count:,} objects, {total_size / 1024 / 1024 / 1024:.2f} GB")
    print("\n=== PER PREFIX ===")
    for p, s in sorted(prefix_stats.items(), key=lambda x: -x[1]["size"]):
        gb = s["size"] / 1024 / 1024 / 1024
        mb_avg = s["size"] / max(1, s["count"]) / 1024 / 1024
        print(f"  {p:30} {s['count']:>8,} objs  {gb:>8.2f} GB  avg {mb_avg:.1f} MB")

    print("\n=== DUPLICATES (same hash in different folders) ===")
    dups = {h: c for h, c in dup_hashes.items() if c > 1}
    print(f"  {len(dups)} hashes appearing >1 time")
    for h, c in sorted(dups.items(), key=lambda x: -x[1])[:10]:
        print(f"  {h}  x{c}")


if __name__ == "__main__":
    main()
