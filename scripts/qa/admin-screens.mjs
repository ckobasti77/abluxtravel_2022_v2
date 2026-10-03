// Step 13 QA: signs in (credentials from night-run/SECRETS.local.md, never
// printed), visits every admin screen at desktop and phone width in Papir and
// Tinta, and saves screenshots plus console errors to night-run/qa/13/.
//   PLAYWRIGHT_BROWSERS_PATH=.tools/ms-playwright E2E_BASE_URL=http://localhost:3100 \
//     node --env-file=.env.local scripts/qa/admin-screens.mjs [--account editor|owner] [--only <path>]
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { readSecret, ROOT } from "../lib/convex-cli.mjs";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const OUT = path.join(ROOT, "night-run", "qa", "13");
mkdirSync(OUT, { recursive: true });
const args = process.argv.slice(2);
const accountKey = args.includes("--account") ? args[args.indexOf("--account") + 1] : "owner";
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
const ACCOUNTS = { owner: "abluxtravel@gmail.com", editor: "qa-editor@ablux.local" };

const SCREENS = [
  "/admin",
  "/admin/upiti",
  "/admin/ponude",
  "/admin/izmene",
  "/admin/partneri",
  "/admin/partneri?prikaz=istorija",
  "/admin/partneri/rucni-unos",
  "/admin/pocetna",
  "/admin/aranzmani",
  "/admin/putovanja",
  "/admin/verski-turizam",
  "/admin/iznajmljivanje-vozila",
  "/admin/podesavanja",
  "/admin/podesavanja/korisnici",
  "/admin/podesavanja/dnevnik",
].filter((screen) => !only || screen === only);

const browser = await chromium.launch();
const report = [];

async function session(viewport, theme) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript((value) => {
    localStorage.setItem("ablux_language", "sr");
    localStorage.setItem("ablux_theme", value);
  }, theme);
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text().slice(0, 300));
  });
  page.on("pageerror", (error) => errors.push(error.message.slice(0, 300)));
  const email = ACCOUNTS[accountKey];
  const password = readSecret(email);
  if (!password) throw new Error(`nema lozinke za ${accountKey}`);
  await page.goto(`${BASE}/auth?mode=signin`, { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 60000 });
  return { context, page, errors };
}

const runs = [
  { name: "desktop-papir", viewport: { width: 1440, height: 900 }, theme: "light" },
  { name: "mobile-papir", viewport: { width: 390, height: 844 }, theme: "light" },
  { name: "desktop-tinta", viewport: { width: 1440, height: 900 }, theme: "dark" },
];

for (const run of runs) {
  const { context, page, errors } = await session(run.viewport, run.theme);
  for (const screen of run.name === "desktop-tinta" ? SCREENS.slice(0, 6) : SCREENS) {
    errors.length = 0;
    const started = Date.now();
    await page.goto(`${BASE}${screen}`, { waitUntil: "domcontentloaded", timeout: 180000 });
    try {
      await page.locator(".adm-top__title").first().waitFor({ timeout: 90000 });
    } catch {
      const file = `FAIL-${run.name}-${screen.replace(/[/?=]/g, "_")}.png`;
      await page.screenshot({ path: path.join(OUT, file) });
      const text = (await page.locator("body").innerText()).slice(0, 400);
      report.push({ run: run.name, screen, failed: true, text, errors: [...errors] });
      console.log(`FAIL ${run.name} ${screen}: ${text.replace(/\s+/g, " ").slice(0, 200)} | ${errors.join(" | ").slice(0, 600)}`);
      continue;
    }
    await page.waitForTimeout(3500);
    const title = await page.locator(".adm-top__title").first().textContent();
    const h1 = await page.locator("h1").count();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const file = `${run.name}-${screen.replace(/^\/admin\/?/, "").replace(/[/?=]/g, "_") || "pregled"}.png`;
    await page.screenshot({ path: path.join(OUT, file), fullPage: false });
    report.push({ run: run.name, screen, title, h1, overflow, ms: Date.now() - started, errors: [...errors] });
    console.log(`${run.name.padEnd(14)} ${screen.padEnd(34)} h1=${h1} overflow=${overflow} errors=${errors.length} ${title}`);
  }
  await context.close();
}

writeFileSync(path.join(OUT, `screens-${accountKey}.json`), JSON.stringify(report, null, 2));
await browser.close();
