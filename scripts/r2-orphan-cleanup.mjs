#!/usr/bin/env node
/**
 * R2 orphan cleanup — list every object in the bucket, cross-check against the
 * Ad table, and optionally delete objects that no ad rows reference.
 *
 * Usage:
 *   node scripts/r2-orphan-cleanup.mjs          # DRY RUN (default, safe)
 *   node scripts/r2-orphan-cleanup.mjs --delete # actually delete orphans
 *
 * Safety:
 *   - Never deletes without the --delete flag
 *   - Prints a summary + requires typing "DELETE" interactively if --delete
 *   - Deletes in batches of 1000 (S3 DeleteObjects limit) with throttling
 *   - Skips any key referenced by Ad.videoUrl, Ad.videoUrlWeb, Ad.thumbnailR2Url,
 *     Ad.pageProfilePictureUrl, or Shop.profilePicture
 *
 * Background: cookies deduped + URL-hash keys mean old hashes from Apify runs
 * (that no ad references any more) pile up. Expected ~55 GB orphan on the
 * 161 GB bucket as of 2026-04-05 audit.
 */
import "dotenv/config";
import readline from "readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import pg from "pg";

const DRY_RUN = !process.argv.includes("--delete");
const BATCH_SIZE = 1000;

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: /supabase|pooler/.test(process.env.DATABASE_URL ?? "") ? { rejectUnauthorized: true } : false,
});
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
const BUCKET = process.env.R2_BUCKET_NAME ?? "adspoonx-videos";
const R2_BASE = (process.env.R2_PUBLIC_URL ?? "https://videos.adspoonx.com").replace(/\/$/, "");
const LEGACY_PUB_PREFIXES = [
  "https://pub-eec897ae726d8bdc6f84ab1e9bc74401.r2.dev",
  "https://pub-8ce6fe263fcc4e2293dedad7c89467ce.r2.dev",
];

/** Extract the R2 key (e.g. "videos/web/abc.mp4") from a public URL. */
function urlToKey(url) {
  if (!url || typeof url !== "string") return null;
  const allPrefixes = [R2_BASE, ...LEGACY_PUB_PREFIXES];
  for (const prefix of allPrefixes) {
    if (url.startsWith(prefix + "/")) {
      return url.slice(prefix.length + 1).split("?")[0];
    }
  }
  return null;
}

async function collectReferencedKeys() {
  const keys = new Set();

  // Stream all ads in a single pass — plain SQL is simpler than Prisma cursor
  const adRes = await pool.query(
    `SELECT "videoUrl", "videoUrlWeb", "thumbnailR2Url", "pageProfilePictureUrl" FROM "Ad"`
  );
  for (const row of adRes.rows) {
    for (const url of Object.values(row)) {
      const k = urlToKey(url);
      if (k) keys.add(k);
    }
  }
  console.log(`  ads scanned: ${adRes.rowCount.toLocaleString()} rows → ${keys.size.toLocaleString()} unique keys`);

  const shopRes = await pool.query(`SELECT "profilePicture" FROM "Shop"`);
  for (const row of shopRes.rows) {
    const k = urlToKey(row.profilePicture);
    if (k) keys.add(k);
  }
  console.log(`  shops scanned: ${shopRes.rowCount.toLocaleString()} rows → ${keys.size.toLocaleString()} total keys referenced`);
  return keys;
}

async function listAllR2Keys() {
  const all = [];
  let token;
  do {
    const r = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      ContinuationToken: token,
      MaxKeys: 1000,
    }));
    for (const o of r.Contents ?? []) {
      all.push({ key: o.Key, size: o.Size });
    }
    process.stdout.write(`\r  R2 objects listed: ${all.length.toLocaleString()}`);
    token = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (token);
  process.stdout.write("\n");
  return all;
}

async function deleteInBatches(keys) {
  let deleted = 0;
  for (let i = 0; i < keys.length; i += BATCH_SIZE) {
    const chunk = keys.slice(i, i + BATCH_SIZE);
    await s3.send(new DeleteObjectsCommand({
      Bucket: BUCKET,
      Delete: { Objects: chunk.map(k => ({ Key: k })), Quiet: true },
    }));
    deleted += chunk.length;
    process.stdout.write(`\r  deleted: ${deleted.toLocaleString()} / ${keys.length.toLocaleString()}`);
    // Polite throttle so we don't hammer the bucket
    await new Promise(r => setTimeout(r, 200));
  }
  process.stdout.write("\n");
}

async function main() {
  console.log(`R2 bucket:  ${BUCKET}`);
  console.log(`Mode:       ${DRY_RUN ? "DRY RUN (no deletions)" : "⚠️  DELETE MODE"}`);
  console.log("");

  console.log("Step 1/3: Collecting referenced keys from DB...");
  const referenced = await collectReferencedKeys();

  console.log("\nStep 2/3: Listing all objects in R2 bucket...");
  const allObjects = await listAllR2Keys();

  const totalSize = allObjects.reduce((a, o) => a + o.size, 0);
  const orphans = allObjects.filter(o => !referenced.has(o.key));
  const orphanSize = orphans.reduce((a, o) => a + o.size, 0);
  const liveSize = totalSize - orphanSize;

  const byPrefix = {};
  for (const o of orphans) {
    const top = o.key.split("/")[0] || "(root)";
    byPrefix[top] ??= { n: 0, bytes: 0 };
    byPrefix[top].n++;
    byPrefix[top].bytes += o.size;
  }

  console.log("\n=== SUMMARY ===");
  console.log(`  total objects      ${allObjects.length.toLocaleString()}`);
  console.log(`  total size         ${(totalSize / 1024 / 1024 / 1024).toFixed(2)} GB`);
  console.log(`  referenced keys    ${referenced.size.toLocaleString()}`);
  console.log(`  live objects       ${(allObjects.length - orphans.length).toLocaleString()}  (${(liveSize / 1024 / 1024 / 1024).toFixed(2)} GB)`);
  console.log(`  orphan objects     ${orphans.length.toLocaleString()}  (${(orphanSize / 1024 / 1024 / 1024).toFixed(2)} GB)`);
  console.log("\n  orphans by prefix:");
  for (const [p, s] of Object.entries(byPrefix).sort((a, b) => b[1].bytes - a[1].bytes)) {
    console.log(`    ${p.padEnd(20)} ${s.n.toString().padStart(8).toLocaleString()} objs  ${(s.bytes / 1024 / 1024 / 1024).toFixed(2)} GB`);
  }

  if (DRY_RUN) {
    console.log("\n(dry run — nothing deleted. Rerun with --delete to actually remove orphans.)");
    await pool.end();
    return;
  }

  if (orphans.length === 0) {
    console.log("\nnothing to delete.");
    await pool.end();
    return;
  }

  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(`\nType "DELETE" to confirm deletion of ${orphans.length.toLocaleString()} objects (${(orphanSize / 1024 / 1024 / 1024).toFixed(2)} GB): `);
  rl.close();
  if (answer !== "DELETE") {
    console.log("aborted.");
    await pool.end();
    return;
  }

  console.log("\nStep 3/3: Deleting orphans in batches of 1000...");
  await deleteInBatches(orphans.map(o => o.key));
  console.log(`\n✅ cleanup complete — freed ${(orphanSize / 1024 / 1024 / 1024).toFixed(2)} GB`);
  await pool.end();
}

main().catch(err => {
  console.error("ERROR:", err);
  process.exit(1);
});
