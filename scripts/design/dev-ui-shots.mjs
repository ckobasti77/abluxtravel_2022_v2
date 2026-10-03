// Screenshot /dev/ui (both themes are on the page) at desktop and mobile, collect console errors.
// Usage: PLAYWRIGHT_BROWSERS_PATH=.tools/ms-playwright E2E_BASE_URL=http://localhost:3000 node scripts/design/dev-ui-shots.mjs [outDir]
import { chromium } from "playwright";
const base = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const out = process.argv[2] ?? "night-run/qa";
const browser = await chromium.launch();
const errors = [];
for (const [name, viewport] of [["desktop", { width: 1440, height: 1000 }], ["mobile", { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  page.on("console", (msg) => { if (["error", "warning"].includes(msg.type())) errors.push(`[${name}] ${msg.type()}: ${msg.text()}`); });
  page.on("pageerror", (err) => errors.push(`[${name}] pageerror: ${err.message}`));
  await page.goto(base + "/dev/ui", { waitUntil: "load", timeout: 120000 });
  await page.evaluate(() => document.fonts.ready);
  // Scroll through so scroll-triggered motion settles, then back to top.
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += 600) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(60); }
  await page.waitForTimeout(800);
  const themes = page.locator(".dev-ui__theme");
  for (let i = 0; i < 2; i++) {
    await themes.nth(i).screenshot({ path: `${out}/dev-ui-${name}-${i === 0 ? "papir" : "tinta"}.png` });
  }
  await page.close();
}
console.log(errors.length ? errors.join("\n") : "no console errors");
await browser.close();
