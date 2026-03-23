import pg from 'pg';
const client = new pg.Client(process.env.DATABASE_URL);
await client.connect();

const { rows } = await client.query(`
  SELECT "rawData"->'snapshot'->'page_categories' as cats,
         "rawData"->'categories' as cats2,
         "bodyText", "title", "pageName",
         "rawData"->'snapshot'->>'link_url' as link_url,
         "rawData"->'snapshot'->>'caption' as caption
  FROM "Ad"
  WHERE "isActive" = true
  LIMIT 3000
`);

// 1. Count page_categories
const catCounts = {};
rows.forEach(r => {
  const cats = r.cats || r.cats2 || [];
  if (Array.isArray(cats)) {
    cats.forEach(c => { catCounts[c] = (catCounts[c] || 0) + 1; });
  }
});

console.log(`=== TOP PAGE CATEGORIES (${Object.keys(catCounts).length} unique) ===\n`);
Object.entries(catCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 50)
  .forEach(([cat, count]) => console.log(`  ${String(count).padStart(5)} | ${cat}`));

// 2. Check domain patterns from link_url
console.log(`\n=== TOP DOMAINS ===\n`);
const domainCounts = {};
rows.forEach(r => {
  const url = r.link_url || r.caption || '';
  try {
    const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace('www.', '');
    domainCounts[domain] = (domainCounts[domain] || 0) + 1;
  } catch {}
});
Object.entries(domainCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 30)
  .forEach(([d, c]) => console.log(`  ${String(c).padStart(4)} | ${d}`));

// 3. Check how many have categories
const withCats = rows.filter(r => {
  const cats = r.cats || r.cats2 || [];
  return Array.isArray(cats) && cats.length > 0 && cats[0] !== '';
}).length;
console.log(`\n${withCats}/${rows.length} ads have page_categories (${(withCats/rows.length*100).toFixed(1)}%)`);

await client.end();
