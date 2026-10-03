// Step 13 QA: a status change and a bulk hide, each reverted with "Poništi".
// Touches only the QA inquiry from step 10 and one offer (restored right away).
//   PLAYWRIGHT_BROWSERS_PATH=.tools/ms-playwright E2E_BASE_URL=http://localhost:3137 \
//     node --env-file=.env.local scripts/qa/admin-undo.mjs
import { chromium } from "playwright";
import { readSecret } from "../lib/convex-cli.mjs";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3137";
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.addInitScript(() => localStorage.setItem("ablux_language", "sr"));
const page = await context.newPage();
await page.goto(`${BASE}/auth?mode=signin`, { waitUntil: "networkidle" });
await page.locator('input[type="email"]').fill("qa-editor@ablux.local");
await page.locator('input[autocomplete="current-password"]').fill(readSecret("qa-editor@ablux.local"));
await page.locator('form button[type="submit"]').click();
await page.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 60000 });

const log = (ok, name, detail = "") => console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);

// 1. Inquiry status → U obradi → Poništi → Novo.
try {
  await page.goto(`${BASE}/admin/upiti?q=`, { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("Ime, telefon, e-adresa ili ponuda").fill("QA Noćni");
  const row = page.locator("table.adm-table .adm-row-button", { hasText: "QA Noćni Test" }).first();
  await row.click({ timeout: 60000 });
  const sheet = page.locator(".adm-sheet[open]");
  await sheet.getByRole("button", { name: "Potvrđeno" }).waitFor({ timeout: 30000 });
  // Leave the QA inquiry as "Novo" before and after the check.
  if (!(await sheet.getByRole("button", { name: "Novo", pressed: true }).count())) {
    await sheet.getByRole("button", { name: "Novo" }).click();
    await sheet.getByRole("button", { name: "Novo", pressed: true }).waitFor({ timeout: 15000 });
  }
  await sheet.getByRole("button", { name: "U obradi" }).click();
  await page.locator(".ui-toast", { hasText: "Status: U obradi" }).waitFor({ timeout: 15000 });
  await sheet.getByRole("button", { name: "U obradi", pressed: true }).waitFor({ timeout: 15000 });
  await page.locator(".ui-toast", { hasText: "Status: U obradi" }).getByRole("button", { name: "Poništi" }).click();
  await sheet.getByRole("button", { name: "Novo", pressed: true }).waitFor({ timeout: 15000 });
  log(true, "upit: status U obradi i Poništi vraća Novo");
} catch (error) {
  await page.screenshot({ path: "night-run/qa/13/x-FAIL-undo-inquiry.png" });
  log(false, "upit: status + Poništi", String(error.message).split("\n")[0]);
}

// 2. Bulk hide one public offer → Poništi → back on the site.
try {
  await page.goto(`${BASE}/admin/ponude?stanje=public&partner=rapsody`, { waitUntil: "domcontentloaded" });
  await page.keyboard.press("Escape");
  const first = page.locator("table.adm-table tbody tr").first();
  const title = (await first.locator(".adm-row-title").textContent({ timeout: 60000 }))?.trim();
  await first.locator("input.adm-check").check();
  await page.locator(".adm-bulk").getByRole("button", { name: "Sakrij" }).click();
  await page.locator(".ui-toast", { hasText: "sakriveno" }).waitFor({ timeout: 15000 });
  await page.locator(".ui-toast").getByRole("button", { name: "Poništi" }).click();
  await page.waitForTimeout(2500);
  await page.goto(`${BASE}/admin/ponude?stanje=public&partner=rapsody`, { waitUntil: "domcontentloaded" });
  await page.locator("table.adm-table .adm-row-title", { hasText: title }).first().waitFor({ timeout: 60000 });
  log(true, "ponude: Sakrij pa Poništi vraća ponudu na sajt", title);
} catch (error) {
  log(false, "ponude: Sakrij + Poništi", String(error.message).split("\n")[0]);
}

await browser.close();
