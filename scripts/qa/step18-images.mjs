// Step 18: screenshot every distinct visible image (img + CSS backgrounds) on the public pages for a visual check.
// PLAYWRIGHT_BROWSERS_PATH=.tools/ms-playwright E2E_BASE_URL=http://localhost:3000 node scripts/qa/step18-images.mjs <outDir> [routes...]
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const [outArg, ...routeArgs] = process.argv.slice(2);
const out = path.resolve(outArg ?? "night-run/qa/18/images");
mkdirSync(out, { recursive: true });
const routes = routeArgs.length
  ? routeArgs
  : ["/", "/ponude", "/aranzmani", "/aranzmani/turska", "/verski-turizam", "/destinacije", "/putovanja", "/putovanja/grcka", "/zemlje", "/iznajmljivanje-vozila", "/o-nama", "/kontakt", "/auth", "/ponude/malta-ostrvo-vitezova-istorije-valeta-mayak"];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const seen = new Set();
const index = [];
for (const route of routes) {
  await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 90_000 }).catch(() => {});
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  });
  await page.waitForTimeout(1000);
  const handles = await page.$$("img, [style*='background-image']");
  for (const handle of handles) {
    const src = await handle.evaluate((el) => (el.tagName === "IMG" ? el.currentSrc || el.src : getComputedStyle(el).backgroundImage));
    const box = await handle.boundingBox();
    if (!box || box.width < 60 || box.height < 40 || seen.has(src) || /logo-|partners\/partner-/.test(src)) continue;
    seen.add(src);
    const file = path.join(out, `${String(seen.size).padStart(3, "0")}.png`);
    await handle.scrollIntoViewIfNeeded().catch(() => {});
    await handle.screenshot({ path: file, animations: "disabled" }).catch(() => {});
    index.push({ n: seen.size, route, src: src.replace(BASE, "") });
  }
}
writeFileSync(path.join(out, "index.json"), JSON.stringify(index, null, 2));
for (const item of index) console.log(item.n, item.route, item.src.slice(0, 120));
await browser.close();
