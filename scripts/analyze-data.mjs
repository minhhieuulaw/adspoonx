import pg from 'pg';
const client = new pg.Client(process.env.DATABASE_URL);
await client.connect();

// Get 10 diverse ads with full rawData
const { rows } = await client.query(`
  SELECT "adArchiveId", "pageName", "bodyText", "title", "description", "rawData"
  FROM "Ad"
  WHERE "isActive" = true AND "bodyText" IS NOT NULL AND length("bodyText") > 50
  ORDER BY random()
  LIMIT 10
`);

console.log(`=== SAMPLE ADS DATA ANALYSIS ===\n`);

rows.forEach((ad, i) => {
  const raw = ad.rawData || {};
  const snap = raw.snapshot || {};

  console.log(`--- AD #${i+1}: ${ad.pageName} ---`);
  console.log(`  Body (first 200ch): ${(ad.bodyText || '').slice(0, 200)}`);
  console.log(`  Title: ${ad.title || '(none)'}`);
  console.log(`  Description: ${ad.description || '(none)'}`);
  console.log(`  Link Caption: ${snap.link_url || raw.link_url || '(none)'}`);
  console.log(`  CTA: ${snap.cta_text || (snap.cards?.[0]?.cta_text) || '(none)'}`);
  console.log(`  Link Title: ${snap.cards?.[0]?.link_title || snap.link_title || '(none)'}`);
  console.log(`  Link Desc: ${snap.cards?.[0]?.link_description || snap.link_description || '(none)'}`);
  console.log(`  Page Categories: ${JSON.stringify(raw.page_categories || snap.page_categories || '(none)')}`);
  console.log(`  Bylines: ${raw.bylines || snap.bylines || '(none)'}`);
  console.log(`  Caption: ${snap.caption || raw.caption || '(none)'}`);
  console.log();
});

// Check what fields exist across all rawData
console.log(`\n=== RAW DATA FIELD FREQUENCY (sample 500) ===\n`);
const { rows: sample } = await client.query(`
  SELECT "rawData" FROM "Ad" WHERE "rawData" IS NOT NULL LIMIT 500
`);

const fieldCounts = {};
sample.forEach(r => {
  const raw = r.rawData || {};
  Object.keys(raw).forEach(k => { fieldCounts[k] = (fieldCounts[k] || 0) + 1; });
  const snap = raw.snapshot || {};
  Object.keys(snap).forEach(k => { fieldCounts[`snapshot.${k}`] = (fieldCounts[`snapshot.${k}`] || 0) + 1; });
});

Object.entries(fieldCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([k, v]) => console.log(`  ${k}: ${v}/${sample.length}`));

await client.end();
