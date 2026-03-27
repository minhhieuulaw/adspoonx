/**
 * screenshot-check.mjs
 * Chụp screenshot các trang staging sau khi deploy — tự động đăng nhập.
 * Dùng: node scripts/screenshot-check.mjs [base_url]
 *
 * Output: screenshots/ folder với ảnh PNG từng trang
 */

import puppeteer from "puppeteer";
import { mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ── Config ──────────────────────────────────────────
const BASE_URL = process.argv[2] || "https://staging.adspoonx.com";

const TEST_EMAIL    = "test1@gmail.com";
const TEST_PASSWORD = "123456789";

const PAGES = [
  { path: "/ads",      name: "ads-finder", delay: 4000 },
  { path: "/stores",   name: "stores",     delay: 3000 },
  { path: "/trending", name: "trending",   delay: 3000 },
  { path: "/saved",    name: "saved",      delay: 2500 },
  { path: "/settings", name: "settings",  delay: 2500 },
];

const OUT_DIR = join(ROOT, "screenshots");
// ────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function login(page) {
  console.log("  🔐 Logging in...");
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle2", timeout: 30000 });
  await sleep(1000);

  // Fill email
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
  await page.type('input[type="email"], input[name="email"]', TEST_EMAIL, { delay: 40 });

  // Fill password
  await page.type('input[type="password"]', TEST_PASSWORD, { delay: 40 });

  // Submit
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 20000 }).catch(() => {});
  await sleep(1500);

  const currentUrl = page.url();
  if (currentUrl.includes("/login")) {
    throw new Error("Login failed — still on login page");
  }
  console.log(`  ✅ Logged in (→ ${currentUrl})`);
}

async function run() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  console.log(`\n📸  Screenshot check — ${BASE_URL}`);
  console.log(`📁  Output: ${OUT_DIR}\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--window-size=1440,900",
    ],
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1.5 },
  });

  const tab = await browser.newPage();

  // Block analytics/trackers
  await tab.setRequestInterception(true);
  tab.on("request", (req) => {
    const skip = ["analytics", "gtag", "hotjar", "intercom", "crisp"];
    if (skip.some((s) => req.url().includes(s))) req.abort();
    else req.continue();
  });

  // Login once, reuse cookies for all pages
  try {
    await login(tab);
  } catch (err) {
    console.error(`  ❌ Login error: ${err.message}`);
    await browser.close();
    process.exit(1);
  }

  const results = [];

  for (const page of PAGES) {
    const url = `${BASE_URL}${page.path}`;
    const outFile = join(OUT_DIR, `${page.name}.png`);

    try {
      console.log(`  → ${url}`);
      await tab.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
      await sleep(page.delay);

      // Scroll once to trigger lazy renders, then back to top
      await tab.evaluate(() => window.scrollTo(0, 400));
      await sleep(400);
      await tab.evaluate(() => window.scrollTo(0, 0));
      await sleep(300);

      await tab.screenshot({ path: outFile, fullPage: false });
      results.push({ name: page.name, path: outFile, url, ok: true });
      console.log(`     ✅ saved → screenshots/${page.name}.png`);
    } catch (err) {
      results.push({ name: page.name, path: outFile, url, ok: false, error: err.message });
      console.log(`     ❌ failed: ${err.message}`);
    }
  }

  await browser.close();

  console.log("\n─────────────────────────────────────");
  console.log(`✅ Done: ${results.filter(r => r.ok).length}/${results.length} pages captured`);
  console.log(`📁 Screenshots: ${OUT_DIR}`);
  console.log("─────────────────────────────────────\n");

  // Print paths so Claude can read them
  results.filter(r => r.ok).forEach(r => {
    console.log(`SCREENSHOT: ${r.path}`);
  });
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
