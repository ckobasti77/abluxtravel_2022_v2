// Browser checks for login/logout, the admin guard and the IPS checkout.
// Run (dev server must be running):
//   PLAYWRIGHT_BROWSERS_PATH=.tools/ms-playwright E2E_BASE_URL=http://localhost:3000 \
//     node --env-file=.env.local scripts/security/e2e-auth.mjs
// Credentials come from night-run/SECRETS.local.md and are never printed.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { readSecret, ROOT } from "../lib/convex-cli.mjs";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const QA_DIR = path.join(ROOT, "night-run", "qa");
mkdirSync(QA_DIR, { recursive: true });

const ACCOUNTS = {
  owner: "abluxtravel@gmail.com",
  editor: "qa-editor@ablux.local",
  customer: "qa-customer@ablux.local",
};

const results = [];
const record = (name, status, detail = "") => {
  results.push({ name, status, detail });
  console.log(`${status.padEnd(4)} ${name}${detail ? ` — ${detail}` : ""}`);
};
async function check(name, fn) {
  try {
    const detail = await fn();
    record(name, "PASS", typeof detail === "string" ? detail : "");
  } catch (error) {
    record(name, error?.skip ? "SKIP" : "FAIL", error?.message ?? String(error));
  }
}
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const skip = (message) => Object.assign(new Error(message), { skip: true });

const browser = await chromium.launch();

async function newSession() {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  // UI checks use the Serbian copy (the default site language).
  await context.addInitScript(() => localStorage.setItem("ablux_language", "sr"));
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  return { context, page, consoleErrors };
}

async function signIn(page, email) {
  const password = readSecret(email);
  assert(password, `nema lozinke za ${email} u SECRETS.local.md`);
  await page.goto(`${BASE}/auth?mode=signin`, { waitUntil: "networkidle" });
  // Wait for hydration, otherwise the form submits natively (GET).
  await page.waitForFunction(() => {
    const form = document.querySelector("form");
    return Boolean(form && Object.keys(form).some((key) => key.startsWith("__react")));
  });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.locator('form button[type="submit"]').click();
}

const shot = (page, name) =>
  page.screenshot({ path: path.join(QA_DIR, `03-${name}.png`), fullPage: false });

// 1. Anonymous /admin is redirected to the sign-in page.
await check("anon /admin -> /auth", async () => {
  const { context, page } = await newSession();
  await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  const url = new URL(page.url());
  await context.close();
  assert(url.pathname === "/auth", `url je ${url.pathname}`);
  assert(url.searchParams.get("next") === "/admin", `next=${url.searchParams.get("next")}`);
});

// 2–5. Editor flow.
{
  const { context, page, consoleErrors } = await newSession();

  await check("editor login -> /admin, uloga Urednik", async () => {
    await signIn(page, ACCOUNTS.editor);
    await page.waitForURL((url) => url.pathname === "/admin", { timeout: 30000 });
    await page.getByText("Urednik", { exact: true }).first().waitFor({ timeout: 30000 });
    await shot(page, "admin-editor");
  });

  await check("editor /admin/aranzmani radi bez auth grešaka", async () => {
    await page.goto(`${BASE}/admin/aranzmani`, { waitUntil: "domcontentloaded" });
    // First visit in dev mode compiles the page, which can take a while.
    await page.getByRole("button", { name: "Odjavi se" }).first().waitFor({ timeout: 90000 });
    await page.waitForTimeout(4000);
    await shot(page, "admin-aranzmani");
    const authErrors = consoleErrors.filter((text) => /UNAUTHENTICATED|FORBIDDEN/.test(text));
    assert(authErrors.length === 0, `konzola: ${authErrors[0]}`);
  });

  await check("reload zadržava sesiju; httpOnly kolačići; nema starog localStorage", async () => {
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByText("Urednik", { exact: true }).first().waitFor({ timeout: 30000 });
    assert(new URL(page.url()).pathname.startsWith("/admin"), "izbačen iz admina");
    const cookies = await context.cookies();
    const jwt = cookies.find((cookie) => cookie.name.endsWith("__convexAuthJWT"));
    const refresh = cookies.find((cookie) => cookie.name.endsWith("__convexAuthRefreshToken"));
    assert(jwt?.httpOnly && refresh?.httpOnly, "auth kolačići nisu httpOnly ili ne postoje");
    const legacy = await page.evaluate(() => localStorage.getItem("abluxtravel2022_session"));
    assert(legacy === null, "stari localStorage ključ postoji");
  });

  await check("editor: Admin link u navigaciji i editor dock na /kontakt", async () => {
    await page.goto(`${BASE}/kontakt`, { waitUntil: "domcontentloaded" });
    await page.locator('a[href="/admin"]').first().waitFor({ timeout: 30000 });
    await page.getByText(/Vidljivo samo osoblju|Visible to staff only/).first().waitFor({ timeout: 30000 });
  });

  await check("editor ne vidi tabelu uloga (samo vlasnik)", async () => {
    await page.goto(`${BASE}/admin/podesavanja/korisnici`, { waitUntil: "domcontentloaded" });
    await page.getByText("Promena lozinke").first().waitFor({ timeout: 30000 });
    assert((await page.getByText("Korisnici i uloge").count()) === 0, "editor vidi tabelu uloga");
  });

  await check("odjava iz sidebara -> /auth, /admin ponovo traži prijavu", async () => {
    await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Odjavi se" }).first().click();
    await page.waitForURL((url) => url.pathname === "/auth", { timeout: 30000 });
    await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
    assert(new URL(page.url()).pathname === "/auth", `url je ${page.url()}`);
  });

  await context.close();
}

// Anonymous: no editor dock, no admin link.
await check("anon: nema editor docka na /kontakt", async () => {
  const { context, page } = await newSession();
  await page.goto(`${BASE}/kontakt`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  const docks = await page.getByText(/Vidljivo samo osoblju|Visible to staff only/).count();
  await context.close();
  assert(docks === 0, "dock je vidljiv anonimnom posetiocu");
});

// 6. Customer has no admin access.
await check("kupac: /admin prikazuje 'Nemate pristup', bez docka", async () => {
  const { context, page } = await newSession();
  await signIn(page, ACCOUNTS.customer);
  await page.waitForURL((url) => url.pathname === "/", { timeout: 30000 });
  await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  await page.getByText("Nemate pristup administraciji").first().waitFor({ timeout: 30000 });
  await shot(page, "admin-customer");
  await page.goto(`${BASE}/kontakt`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  const docks = await page.getByText(/Vidljivo samo osoblju|Visible to staff only/).count();
  await context.close();
  assert(docks === 0, "dock je vidljiv kupcu");
});

// 7. Owner sees the roles table.
await check("vlasnik vidi tabelu uloga", async () => {
  const { context, page } = await newSession();
  await signIn(page, ACCOUNTS.owner);
  await page.waitForURL((url) => url.pathname === "/admin", { timeout: 30000 });
  await page.goto(`${BASE}/admin/podesavanja/korisnici`, { waitUntil: "domcontentloaded" });
  await page.getByText("Korisnici i uloge").first().waitFor({ timeout: 30000 });
  await page.getByText("qa-editor@ablux.local").first().waitFor({ timeout: 30000 });
  await shot(page, "admin-korisnici-owner");
  await context.close();
});

// 8. Checkout: the IPS amount comes from the database, not from the cart.
await check("checkout: iznos sa servera (cena iz baze)", async () => {
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
  const offers = await convex.query(anyApi.offers.listLiveBoard, { limit: 100 });
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Belgrade" }).format(new Date());
  const offer = offers.find(
    (item) => item.sourceSlug === "manual-verski" && item.price > 0 && !(/^\d{4}-\d{2}-\d{2}/.test(item.departureDate ?? "") && item.departureDate.slice(0, 10) < today),
  );
  if (!offer) throw skip("nema manual-verski ponude sa cenom koja se još prodaje");
  const quote = await convex.query(anyApi.orders.quote, {
    items: [{ type: "offer", id: offer._id, quantity: 1 }],
  });
  if (!quote.ok) throw skip(`ponuda nije za korpu: ${quote.error}`);

  const { context, page } = await newSession();
  await page.goto(`${BASE}/verski-turizam`, { waitUntil: "networkidle" });
  // Tamper with the cart: the stored price is wrong on purpose.
  await page.evaluate(
    ({ id, title }) => {
      localStorage.setItem(
        "ablux_cart",
        JSON.stringify({
          state: { items: [{ id, type: "offer", title, price: 1, currency: "RSD", quantity: 1 }] },
          version: 0,
        })
      );
    },
    { id: offer._id, title: offer.title }
  );
  const response = await page.evaluate(async (id) => {
    const res = await fetch("/api/ips/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ type: "offer", id, quantity: 1, price: 1, title: "x" }],
        customer: { name: "QA test", email: "qa-checkout@ablux.local", phone: "", note: "QA (e2e) — otkazati" },
        website: "",
      }),
    });
    return { status: res.status, body: await res.json() };
  }, offer._id);
  await context.close();

  if (response.status === 502) throw skip(`NBS nedostupan: ${response.body.error}`);
  assert(response.status === 200, `status ${response.status}: ${response.body.error}`);
  const line = response.body.lines?.[0];
  assert(line && line.originalAmount === quote.lines[0].price, `iznos ${line?.originalAmount} ≠ ${quote.lines[0].price}`);
  return `orderId ${response.body.orderId}, ${line.originalAmount} ${line.currency}`;
});

await browser.close();

writeFileSync(path.join(QA_DIR, "03-e2e-auth.json"), JSON.stringify(results, null, 2));
const failed = results.filter((result) => result.status === "FAIL").length;
console.log(`\n${results.length - failed}/${results.length} bez greške (${failed} FAIL)`);
process.exit(failed ? 1 : 0);
