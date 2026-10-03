// Step 19 QA: admin logo and sidebar. Signs in as the QA editor (password from
// night-run/SECRETS.local.md, never printed), takes screenshots (desktop
// expanded/collapsed in Papir and Tinta, 390 px with the drawer) and measures:
//   - centring: every sidebar icon's centre x within 1 px of the others,
//   - fixed sidebar: on /admin/ponude scrolled to the bottom, top 0 and bottom = viewport height.
//   PLAYWRIGHT_BROWSERS_PATH=.tools/ms-playwright E2E_BASE_URL=http://localhost:3000 \
//     node --env-file=.env.local scripts/qa/admin-sidebar.mjs --phase before|after
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { readSecret, ROOT } from "../lib/convex-cli.mjs";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const args = process.argv.slice(2);
const phase = args.includes("--phase") ? args[args.indexOf("--phase") + 1] : "after";
const OUT = path.join(ROOT, "night-run", "qa", "19");
mkdirSync(OUT, { recursive: true });
const EMAIL = "qa-editor@ablux.local";
const password = readSecret(EMAIL);
if (!password) throw new Error("nema lozinke za QA urednika");

// Playwright hides scrollbars by default; keep them so the scrollbar bug is measurable.
const browser = await chromium.launch({ ignoreDefaultArgs: ["--hide-scrollbars"] });
const report = { phase, base: BASE, runs: [], fixed: [], failures: [] };

async function session(viewport, theme, collapsed) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript(
    ([themeValue, collapsedValue]) => {
      localStorage.setItem("ablux_language", "sr");
      localStorage.setItem("ablux_theme", themeValue);
      localStorage.setItem("ablux_admin_sidebar", collapsedValue ? "1" : "0");
      // Hide the Next.js dev indicator so it does not cover the sidebar foot.
      document.addEventListener("DOMContentLoaded", () => {
        const style = document.createElement("style");
        style.textContent = "nextjs-portal { display: none !important; }";
        document.head.append(style);
      });
    },
    [theme, collapsed]
  );
  const page = await context.newPage();
  await page.goto(`${BASE}/auth?mode=signin`, { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 60000 });
  return { context, page };
}

async function open(page, route) {
  await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.locator(".adm-top__title").first().waitFor({ timeout: 90000 });
  await page.waitForTimeout(1500);
}

/** Centre x of every icon in the sidebar (nav items + bottom buttons). */
async function iconCentres(page) {
  return page.evaluate(() => {
    const side = document.querySelector(".adm-side");
    if (!side) return null;
    const icons = [...side.querySelectorAll(".adm-nav__link > svg")];
    const centres = icons.map((icon) => {
      const rect = icon.getBoundingClientRect();
      return Math.round((rect.left + rect.width / 2) * 100) / 100;
    });
    const logo = [...side.querySelectorAll(".adm-logo img")].find((img) => img.getBoundingClientRect().width > 0);
    const logoRect = logo?.getBoundingClientRect();
    const scroll = side.querySelector(".adm-nav__scroll");
    return {
      centres,
      spread: centres.length ? Math.max(...centres) - Math.min(...centres) : null,
      logoCentre: logoRect ? Math.round((logoRect.left + logoRect.width / 2) * 100) / 100 : null,
      sideWidth: side.getBoundingClientRect().width,
      scrollbarWidth: scroll ? scroll.offsetWidth - scroll.clientWidth : null,
    };
  });
}

const DESKTOP = { width: 1440, height: 900 };
const desktopRuns = [
  { name: "desktop-expanded-papir", theme: "light", collapsed: false },
  { name: "desktop-collapsed-papir", theme: "light", collapsed: true },
  { name: "desktop-expanded-tinta", theme: "dark", collapsed: false },
  { name: "desktop-collapsed-tinta", theme: "dark", collapsed: true },
];

// Short laptop screen: the nav list overflows and scrolls, which is where a
// visible scrollbar pushed the icons left of the bottom buttons.
const SHORT = { width: 1280, height: 640 };
for (const run of desktopRuns) {
  const name = run.name.replace("desktop-", "short-");
  const { context, page } = await session(SHORT, run.theme, run.collapsed);
  await open(page, "/admin");
  const centring = await iconCentres(page);
  await page.screenshot({ path: path.join(OUT, `${phase}-${name}.png`) });
  // Wheel over the list must still scroll it (scrollbar hidden, scrolling kept).
  const scroll = page.locator(".adm-side .adm-nav__scroll");
  const box = await scroll.boundingBox();
  const before = await scroll.evaluate((el) => ({ top: el.scrollTop, max: el.scrollHeight - el.clientHeight, fade: el.dataset.fade ?? null }));
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(500);
  }
  const after = await scroll.evaluate((el) => ({ top: el.scrollTop, fade: el.dataset.fade ?? null }));
  await page.screenshot({ path: path.join(OUT, `${phase}-${name}-skrol.png`) });
  const centringOk = centring && centring.spread !== null && centring.spread <= 1;
  if (!centringOk) report.failures.push(`${name}: centriranje (raspon ${centring?.spread} px, skrolbar ${centring?.scrollbarWidth} px)`);
  if (before.max > 0 && after.top <= before.top) report.failures.push(`${name}: lista se ne skroluje točkićem`);
  report.runs.push({ ...run, name, viewport: SHORT, centring, centringOk, scroll: { before, after } });
  await context.close();
}

for (const run of args.includes("--short-only") ? [] : desktopRuns) {
  const { context, page } = await session(DESKTOP, run.theme, run.collapsed);
  await open(page, "/admin");
  await page.screenshot({ path: path.join(OUT, `${phase}-${run.name}.png`) });
  const centring = await iconCentres(page);
  const centringOk = centring && centring.spread !== null && centring.spread <= 1 &&
    (!run.collapsed || centring.logoCentre === null || Math.abs(centring.logoCentre - centring.centres[0]) <= 1);
  if (!centringOk) report.failures.push(`${run.name}: centriranje (raspon ${centring?.spread} px)`);

  // Long page scrolled to the bottom: the sidebar must stay pinned.
  await open(page, "/admin/ponude");
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(800);
  const fixed = await page.evaluate(() => {
    const side = document.querySelector(".adm-side");
    const rect = side?.getBoundingClientRect();
    return {
      scrollY: window.scrollY,
      pageHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
      top: rect ? Math.round(rect.top * 100) / 100 : null,
      bottom: rect ? Math.round(rect.bottom * 100) / 100 : null,
      position: side ? getComputedStyle(side).position : null,
    };
  });
  const fixedOk = fixed.top !== null && Math.abs(fixed.top) <= 0.5 && Math.abs(fixed.bottom - fixed.viewportHeight) <= 0.5 && fixed.scrollY > 0;
  if (!fixedOk) report.failures.push(`${run.name}: sidebar nije fiksiran (top ${fixed.top}, bottom ${fixed.bottom}, viewport ${fixed.viewportHeight}, scrollY ${fixed.scrollY})`);
  await page.screenshot({ path: path.join(OUT, `${phase}-${run.name}-ponude-dno.png`) });
  report.runs.push({ ...run, centring, centringOk });
  report.fixed.push({ ...run, ...fixed, fixedOk });
  await context.close();
}

for (const theme of args.includes("--short-only") ? [] : ["light", "dark"]) {
  const label = theme === "light" ? "papir" : "tinta";
  const { context, page } = await session({ width: 390, height: 844 }, theme, false);
  await open(page, "/admin");
  await page.screenshot({ path: path.join(OUT, `${phase}-mobile-390-${label}.png`) });
  await page.locator(".adm-top__menu").click();
  await page.locator(".adm-drawer[open]").waitFor({ timeout: 10000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, `${phase}-mobile-390-${label}-meni.png`) });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 0) report.failures.push(`mobile-${label}: horizontalni overflow ${overflow}px`);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+k");
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, `${phase}-mobile-390-${label}-paleta.png`) });
  await context.close();
}

await browser.close();
writeFileSync(path.join(OUT, `${phase}-report.json`), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ phase, runs: report.runs.map((r) => ({ name: r.name, scrollTop: r.scroll?.after?.top, fade: r.scroll ? [r.scroll.before.fade, r.scroll.after.fade] : undefined, spread: r.centring?.spread, logo: r.centring?.logoCentre, first: r.centring?.centres?.[0], scrollbar: r.centring?.scrollbarWidth })), fixed: report.fixed.map((f) => ({ name: f.name, top: f.top, bottom: f.bottom, vh: f.viewportHeight, scrollY: f.scrollY, pos: f.position })), failures: report.failures }, null, 1));
