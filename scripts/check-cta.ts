import { prisma as p } from "../lib/prisma";

async function main() {
  const total = await p.ad.count();
  console.log("Total ads:", total);

  const rows: Array<{ cta: string; cnt: number }> = await p.$queryRawUnsafe(`
    SELECT
      COALESCE("rawData"->'snapshot'->'cards'->0->>'cta_text', "rawData"->'snapshot'->>'cta_text', 'NO_CTA') as cta,
      COUNT(*)::int as cnt
    FROM "Ad"
    GROUP BY cta
    ORDER BY cnt DESC
    LIMIT 25
  `);

  console.log("\nCTA distribution:");
  for (const r of rows) {
    console.log(`  ${r.cta}: ${r.cnt}`);
  }

  await p.$disconnect();
}

main().catch(console.error);
