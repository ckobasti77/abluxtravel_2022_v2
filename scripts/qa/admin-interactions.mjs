// Step 13 QA: drawers, command palette, mobile menu and the manual-offer form.
// Read-only: opens screens and panels but saves nothing.
//   PLAYWRIGHT_BROWSERS_PATH=.tools/ms-playwright E2E_BASE_URL=http://localhost:3137 \
//     node --env-file=.env.local scripts/qa/admin-interactions.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { readSecret, ROOT } from "../lib/convex-cli.mjs";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3137";
const OUT = path.join(ROOT, "night-run", "qa", "13");
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const results = [];

async function session(viewport, theme = "light") {
  const context = await browser.newContext({ viewport });
  await context.addInitScript((value) => {
    localStorage.setItem("ablux_language", "sr");
    localStorage.setItem("ablux_theme", value);
  }, theme);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message.slice(0, 300)));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text().slice(0, 300));
  });
  await page.goto(`${BASE}/auth?mode=signin`, { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').fill("abluxtravel@gmail.com");
  await page.locator('input[autocomplete="current-password"]').fill(readSecret("abluxtravel@gmail.com"));
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 60000 });
  return { context, page, errors };
}

async function step(name, page, errors, fn) {
  errors.length = 0;
  try {
    await fn();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(OUT, `x-${name}.png`) });
    results.push({ name, ok: true, errors: [...errors] });
    console.log(`PASS ${name}${errors.length ? ` (console: ${errors.length})` : ""}`);
  } catch (error) {
    await page.screenshot({ path: path.join(OUT, `x-FAIL-${name}.png`) }).catch(() => {});
    results.push({ name, ok: false, error: String(error?.message ?? error).slice(0, 300), errors: [...errors] });
    console.log(`FAIL ${name}: ${String(error?.message ?? error).split("\n")[0]}`);
  }
}

{
  const { context, page, errors } = await session({ width: 1440, height: 900 });
  await step("offer-drawer", page, errors, async () => {
    await page.goto(`${BASE}/admin/ponude?partner=mayak`, { waitUntil: "domcontentloaded" });
    await page.locator("table.adm-table .adm-row-button").first().click({ timeout: 90000 });
    await page.locator(".adm-sheet[open] .adm-sheet__title").waitFor({ timeout: 30000 });
    await page.getByText("ABLux izmene").first().waitFor({ timeout: 30000 });
  });
  await step("offer-bulk-bar", page, errors, async () => {
    await page.keyboard.press("Escape");
    await page.locator("table.adm-table tbody input.adm-check").nth(0).check();
    await page.locator("table.adm-table tbody input.adm-check").nth(1).check();
    await page.locator(".adm-bulk").waitFor({ timeout: 10000 });
  });
  await step("palette", page, errors, async () => {
    await page.keyboard.press("Control+k");
    await page.locator(".adm-palette[open]").waitFor({ timeout: 10000 });
    await page.keyboard.type("malta");
    await page.locator(".adm-palette__group", { hasText: "Ponude" }).waitFor({ timeout: 20000 });
  });
  await step("palette-enter", page, errors, async () => {
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await page.waitForURL((url) => url.searchParams.has("ponuda") || url.pathname !== "/admin/ponude", { timeout: 20000 });
  });
  await step("inquiry-drawer", page, errors, async () => {
    await page.goto(`${BASE}/admin/upiti`, { waitUntil: "domcontentloaded" });
    await page.locator("table.adm-table .adm-row-button").first().click({ timeout: 90000 });
    await page.locator(".adm-sheet[open]").waitFor({ timeout: 30000 });
    await page.getByText("Beleške agencije").first().waitFor({ timeout: 30000 });
  });
  await step("partner-drawer", page, errors, async () => {
    await page.goto(`${BASE}/admin/partneri?partner=sunline`, { waitUntil: "domcontentloaded" });
    await page.locator(".adm-sheet[open]").waitFor({ timeout: 90000 });
    await page.getByText("Poslednji uvozi").first().waitFor({ timeout: 30000 });
  });
  await step("run-confirm", page, errors, async () => {
    await page.goto(`${BASE}/admin/partneri`, { waitUntil: "domcontentloaded" });
    const run = page.getByRole("button", { name: "Pokreni sada" });
    await run.waitFor({ timeout: 90000 });
    if (await run.isEnabled()) {
      await run.click();
      await page.locator(".ui-dialog[open]").waitFor({ timeout: 10000 });
    }
  });
  await step("run-detail", page, errors, async () => {
    await page.keyboard.press("Escape");
    await page.goto(`${BASE}/admin/partneri?prikaz=istorija`, { waitUntil: "domcontentloaded" });
    await page.locator("table.adm-table .adm-row-button").first().click({ timeout: 90000 });
    await page.locator(".adm-sheet[open] details").first().waitFor({ timeout: 30000 });
  });
  await step("manual-form", page, errors, async () => {
    await page.goto(`${BASE}/admin/partneri/rucni-unos?novo=1`, { waitUntil: "domcontentloaded" });
    await page.locator(".adm-sheet[open] form").waitFor({ timeout: 90000 });
  });
  await step("user-menu", page, errors, async () => {
    await page.goto(`${BASE}/admin/podesavanja`, { waitUntil: "domcontentloaded" });
    await page.locator(".adm-user__button").click({ timeout: 90000 });
    await page.locator(".adm-menu").waitFor({ timeout: 10000 });
  });
  await context.close();
}

{
  const { context, page, errors } = await session({ width: 390, height: 844 });
  await step("mobile-drawer", page, errors, async () => {
    await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Otvori meni" }).click({ timeout: 90000 });
    await page.locator(".adm-drawer[open] .adm-nav__link").first().waitFor({ timeout: 10000 });
  });
  await step("mobile-offer-drawer", page, errors, async () => {
    await page.keyboard.press("Escape");
    await page.goto(`${BASE}/admin/ponude`, { waitUntil: "domcontentloaded" });
    await page.locator(".adm-only-narrow .adm-row-button").first().click({ timeout: 90000 });
    await page.locator(".adm-sheet[open] .adm-sheet__title").waitFor({ timeout: 30000 });
  });
  await step("mobile-inquiry", page, errors, async () => {
    await page.goto(`${BASE}/admin/upiti`, { waitUntil: "domcontentloaded" });
    await page.locator(".adm-only-narrow .adm-row-button").first().click({ timeout: 90000 });
    await page.locator(".adm-sheet[open]").waitFor({ timeout: 30000 });
  });
  await context.close();
}

writeFileSync(path.join(OUT, "interactions.json"), JSON.stringify(results, null, 2));
await browser.close();
