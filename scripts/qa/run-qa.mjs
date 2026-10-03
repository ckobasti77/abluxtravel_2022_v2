// Step 14 QA: public routes at 1440×900 and 390×844 in Papir and Tinta,
// admin screens as the QA editor, console errors, failed requests, horizontal
// overflow, images without alt, focus visibility, axe (serious + critical),
// internal link crawl, a diacritics sheet and a reduced-motion homepage run.
// Screenshots and JSON go to night-run/qa/14/ (not in git). Credentials come
// from night-run/SECRETS.local.md and are never printed.
//   PLAYWRIGHT_BROWSERS_PATH=.tools/ms-playwright E2E_BASE_URL=http://localhost:3137 \
//     node --env-file=.env.local scripts/qa/run-qa.mjs [--skip admin,crawl,axe] [--only <route>] [--out <dir>]
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { readSecret, ROOT } from "../lib/convex-cli.mjs";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3137";
const args = process.argv.slice(2);
const argValue = (name) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : null);
const skip = new Set((argValue("skip") ?? "").split(",").filter(Boolean));
const only = argValue("only");
const OUT = path.join(ROOT, "night-run", "qa", argValue("out") ?? "14");
mkdirSync(OUT, { recursive: true });

const ROUTES = [
  { name: "pocetna", path: "/" },
  { name: "ponude", path: "/ponude" },
  { name: "ponude-filteri", path: "/ponude?tip=letovanje&prevoz=autobus" },
  { name: "ponude-prazno", path: "/ponude?tip=zimovanje&prevoz=brod" },
  { name: "ponuda-mayak", path: "/ponude/malta-ostrvo-vitezova-istorije-valeta-mayak" },
  { name: "ponuda-bigblue", path: "/ponude/park-beach-limasol-bigblue" },
  { name: "ponuda-viva", path: "/ponude/putovanje-napulj-7-dana-autobus-2026-viva" },
  { name: "aranzmani", path: "/aranzmani" },
  { name: "aranzman-turska", path: "/aranzmani/turska" },
  { name: "verski-turizam", path: "/verski-turizam" },
  { name: "destinacije", path: "/destinacije" },
  { name: "putovanja-grcka", path: "/putovanja/grcka" },
  { name: "iznajmljivanje-vozila", path: "/iznajmljivanje-vozila" },
  { name: "o-nama", path: "/o-nama" },
  { name: "kontakt", path: "/kontakt" },
  { name: "auth", path: "/auth" },
  { name: "404", path: "/ne-postoji-qa-14", expectStatus: 404 },
].filter((route) => !only || route.path === only || route.name === only);

const ADMIN_SCREENS = [
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
];
const ADMIN_MOBILE = ["/admin", "/admin/upiti", "/admin/ponude", "/admin/partneri"];

const CONFIGS = [
  { name: "desktop-papir", viewport: { width: 1440, height: 900 }, theme: "light" },
  { name: "mobile-papir", viewport: { width: 390, height: 844 }, theme: "light", mobile: true },
  { name: "desktop-tinta", viewport: { width: 1440, height: 900 }, theme: "dark" },
  { name: "mobile-tinta", viewport: { width: 390, height: 844 }, theme: "dark", mobile: true },
];

// Third-party noise that says nothing about our pages.
const IGNORED_REQUEST = /(_vercel\/insights|_vercel\/speed-insights|google-analytics|googletagmanager|favicon\.ico$)/;
const DIACRITICS = "Najtraženije ČĆŽŠĐ čćžšđ";

const browser = await chromium.launch();
const results = { base: BASE, startedAt: new Date().toISOString(), pages: [], admin: [], axe: [], focus: [], links: [], diacritics: [], reducedMotion: [] };
const internalLinks = new Map(); // href -> first page that links to it

function slug(value) {
  return value.replace(/^\//, "").replace(/[/?=&]/g, "_") || "pocetna";
}

async function newContext(config, extra = {}) {
  const context = await browser.newContext({
    viewport: config.viewport,
    isMobile: Boolean(config.mobile),
    hasTouch: Boolean(config.mobile),
    deviceScaleFactor: 1,
    ...extra,
  });
  await context.addInitScript((theme) => {
    localStorage.setItem("ablux_language", "sr");
    localStorage.setItem("ablux_theme", theme);
  }, config.theme);
  return context;
}

function watch(page) {
  const log = { console: [], failed: [] };
  page.on("console", (message) => {
    if (message.type() === "error") log.console.push(message.text().slice(0, 300));
  });
  page.on("pageerror", (error) => log.console.push(`pageerror: ${error.message.slice(0, 300)}`));
  page.on("requestfailed", (request) => {
    const url = request.url();
    const reason = request.failure()?.errorText ?? "";
    // Aborted media/prefetch requests are normal navigation behaviour.
    if (IGNORED_REQUEST.test(url) || /ERR_ABORTED|NS_BINDING_ABORTED/.test(reason)) return;
    log.failed.push(`${reason} ${url.slice(0, 200)}`);
  });
  page.on("response", (response) => {
    const url = response.url();
    if (response.status() >= 400 && !IGNORED_REQUEST.test(url) && response.request().resourceType() !== "document") {
      log.failed.push(`${response.status()} ${url.slice(0, 200)}`);
    }
  });
  return log;
}

// Walks down the page so lazy images and scroll reveals settle, then back up.
async function scrollThrough(page) {
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.8);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    window.scrollTo(0, document.documentElement.scrollHeight);
    await new Promise((resolve) => setTimeout(resolve, 300));
    window.scrollTo(0, 0);
    await new Promise((resolve) => setTimeout(resolve, 400));
  });
}

async function inspect(page) {
  return page.evaluate(() => {
    const width = window.innerWidth;
    const overflow = document.documentElement.scrollWidth - width;
    const wide = [];
    if (overflow > 0) {
      for (const element of document.querySelectorAll("body *")) {
        const rect = element.getBoundingClientRect();
        if (rect.width > 0 && rect.right > width + 1) {
          const style = getComputedStyle(element);
          if (style.position === "fixed" || style.visibility === "hidden") continue;
          wide.push(`${element.tagName.toLowerCase()}.${String(element.className).trim().split(/\s+/).slice(0, 3).join(".")} right=${Math.round(rect.right)}`);
          if (wide.length >= 6) break;
        }
      }
    }
    const noAlt = [...document.querySelectorAll("img:not([alt])")].map((image) => image.currentSrc || image.src).slice(0, 10);
    const h1 = [...document.querySelectorAll("h1")].map((heading) => heading.textContent.trim().slice(0, 80));
    const links = [...document.querySelectorAll("a[href]")]
      .map((anchor) => anchor.getAttribute("href"))
      .filter((href) => href && href.startsWith("/") && !href.startsWith("//"));
    // Serif headings whose box clips the glyphs (carons above č/ž/š).
    const clipped = [];
    for (const heading of document.querySelectorAll("h1, h2, h3")) {
      if (/sr-only/.test(String(heading.className))) continue;
      const style = getComputedStyle(heading);
      if (style.overflow === "visible" && style.overflowY === "visible") continue;
      if (heading.scrollHeight > heading.clientHeight + 1) clipped.push(heading.textContent.trim().slice(0, 60));
    }
    return { overflow, wide, noAlt, h1, links, clipped, title: document.title };
  });
}

async function checkFocus(page, route) {
  const missing = [];
  let checked = 0;
  await page.mouse.click(2, 2).catch(() => {});
  for (let index = 0; index < 30; index += 1) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => {
      const element = document.activeElement;
      if (!element || element === document.body) return null;
      // The ring may sit on the element, its ::after (stretched links), a parent card
      // (:has(:focus-visible)) or an inner layer, so all of them are compared.
      const snapshot = (node, pseudo) => {
        const style = getComputedStyle(node, pseudo);
        return [style.outlineStyle, style.outlineWidth, style.outlineColor, style.boxShadow, style.backgroundColor, style.borderColor, style.textDecorationLine, style.color].join("|");
      };
      const read = () => {
        const parts = [snapshot(element), snapshot(element, "::after"), snapshot(element, "::before")];
        let parent = element.parentElement;
        for (let depth = 0; parent && depth < 4; depth += 1, parent = parent.parentElement) parts.push(snapshot(parent));
        for (const child of [...element.children].slice(0, 4)) parts.push(snapshot(child));
        return parts.join("§");
      };
      const focused = read();
      const rect = element.getBoundingClientRect();
      const visible = rect.width > 0 && rect.height > 0;
      const outlineOk = (() => {
        const style = getComputedStyle(element);
        return style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0;
      })();
      element.blur();
      const blurred = read();
      element.focus({ preventScroll: true });
      const label = `${element.tagName.toLowerCase()}${element.className ? "." + String(element.className).trim().split(/\s+/).slice(0, 2).join(".") : ""} "${(element.getAttribute("aria-label") || element.textContent || "").trim().slice(0, 40)}"`;
      return { label, visible, changed: outlineOk || focused !== blurred };
    });
    if (!info) continue;
    checked += 1;
    if (info.visible && !info.changed) missing.push(info.label);
  }
  results.focus.push({ route, checked, missing: [...new Set(missing)] });
}

async function runAxe(page, where, config) {
  try {
    const report = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    for (const violation of report.violations) {
      if (violation.impact !== "serious" && violation.impact !== "critical") continue;
      results.axe.push({
        where,
        config,
        id: violation.id,
        impact: violation.impact,
        help: violation.help,
        count: violation.nodes.length,
        targets: violation.nodes.slice(0, 5).map((node) => `${node.target.join(" ")} :: ${node.failureSummary?.split("\n").slice(1, 2).join(" ").slice(0, 160)}`),
      });
    }
  } catch (error) {
    results.axe.push({ where, config, id: "axe-error", impact: "critical", help: String(error).slice(0, 200), count: 0, targets: [] });
  }
}

// ---------- public routes ----------
for (const config of CONFIGS) {
  const context = await newContext(config);
  const page = await context.newPage();
  for (const route of ROUTES) {
    const log = watch(page);
    const started = Date.now();
    let status = 0;
    try {
      const response = await page.goto(`${BASE}${route.path}`, { waitUntil: "load", timeout: 120000 });
      status = response?.status() ?? 0;
      await page.waitForTimeout(1500);
      await scrollThrough(page);
      await page.waitForTimeout(600);
    } catch (error) {
      log.console.push(`navigation: ${String(error).slice(0, 200)}`);
    }
    const info = await inspect(page).catch(() => ({ overflow: -1, wide: [], noAlt: [], h1: [], links: [], clipped: [] }));
    for (const href of info.links) {
      const clean = href.split("#")[0];
      if (clean && !internalLinks.has(clean)) internalLinks.set(clean, route.path);
    }
    await page.screenshot({ path: path.join(OUT, `${config.name}-${route.name}.png`), fullPage: true, timeout: 60000 }).catch((error) => log.console.push(`screenshot: ${String(error).slice(0, 120)}`));
    if (!skip.has("axe")) await runAxe(page, route.path, config.name);
    if (config.name === "desktop-papir" && !skip.has("focus")) await checkFocus(page, route.path);
    const expected = route.expectStatus ?? 200;
    const entry = {
      config: config.name,
      route: route.path,
      status,
      statusOk: status === expected,
      ms: Date.now() - started,
      overflow: info.overflow,
      wide: info.wide,
      noAlt: info.noAlt,
      h1: info.h1,
      clipped: info.clipped,
      // The 404 page logs its own document status; that is the expected result, not an error.
      console: [...new Set(log.console)].filter((text) => !(route.expectStatus === 404 && /status of 404/.test(text))),
      failed: [...new Set(log.failed)],
    };
    results.pages.push(entry);
    page.removeAllListeners("console");
    page.removeAllListeners("pageerror");
    page.removeAllListeners("requestfailed");
    page.removeAllListeners("response");
    console.log(
      `${config.name.padEnd(14)} ${route.path.slice(0, 48).padEnd(48)} ${status} ${entry.ms}ms overflow=${info.overflow} h1=${info.h1.length} noAlt=${info.noAlt.length} console=${entry.console.length} failed=${entry.failed.length}`,
    );
  }
  await context.close();
}

// ---------- reduced motion homepage ----------
for (const config of [CONFIGS[0], CONFIGS[1]]) {
  const context = await newContext(config, { reducedMotion: "reduce" });
  const page = await context.newPage();
  const media = [];
  page.on("request", (request) => {
    if (request.resourceType() === "media" || /\.(mp4|webm)(\?|$)/.test(request.url())) media.push(request.url().slice(0, 160));
  });
  const log = watch(page);
  await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 120000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(OUT, `reduced-motion-${config.name}-top.png`) });
  await scrollThrough(page);
  await page.screenshot({ path: path.join(OUT, `reduced-motion-${config.name}-full.png`), fullPage: true });
  const animating = await page.evaluate(() =>
    document.getAnimations().filter((animation) => animation.playState === "running" && (animation.effect?.getTiming().iterations ?? 1) === Infinity).length,
  );
  results.reducedMotion.push({ config: config.name, mediaRequests: media, infiniteAnimations: animating, console: log.console });
  console.log(`reduced-motion ${config.name}: media=${media.length} infiniteAnimations=${animating} console=${log.console.length}`);
  await context.close();
}

// ---------- diacritics sheet ----------
{
  const context = await newContext(CONFIGS[0]);
  const page = await context.newPage();
  for (const target of ["/", "/ponude/malta-ostrvo-vitezova-istorije-valeta-mayak", "/o-nama", "/dev/ui"]) {
    await page.goto(`${BASE}${target}`, { waitUntil: "load", timeout: 120000 });
    await page.waitForTimeout(1500);
    await scrollThrough(page);
    const report = await page.evaluate((text) => {
      const selectors = "h1, h2, h3, h4, [class*='title'], [class*='heading'], [class*='display']";
      const touched = [];
      for (const element of document.querySelectorAll(selectors)) {
        if (element.children.length > 3 || element.closest("nav, footer, [aria-hidden='true']") || /sr-only/.test(String(element.className))) continue;
        const family = getComputedStyle(element).fontFamily;
        element.textContent = text;
        const style = getComputedStyle(element);
        const clipped = style.overflow !== "visible" && element.scrollHeight > element.clientHeight + 1;
        touched.push({ tag: element.tagName.toLowerCase(), cls: String(element.className).slice(0, 60), serif: /garamond|editorial/i.test(family), clipped });
      }
      return touched;
    }, DIACRITICS);
    await page.screenshot({ path: path.join(OUT, `diacritics-${slug(target)}.png`), fullPage: true, timeout: 60000 });
    results.diacritics.push({ route: target, headings: report.length, clipped: report.filter((item) => item.clipped) });
    console.log(`diacritics ${target}: ${report.length} headings, clipped=${report.filter((item) => item.clipped).length}`);
  }
  // Sheet of every heading level and display class in both themes.
  for (const theme of ["light", "dark"]) {
    await page.goto(`${BASE}/dev/ui`, { waitUntil: "load" });
    await page.evaluate(
      ({ text, theme }) => {
        document.documentElement.dataset.theme = theme;
        const sheet = document.createElement("section");
        sheet.id = "qa-diacritics";
        sheet.style.cssText = "padding:120px 32px 32px;background:var(--color-surface, var(--bg));color:var(--color-fg, inherit)";
        const samples = [
          ["h1", ""], ["h2", ""], ["h3", ""], ["h4", ""],
          ["h1", "ablux-hero__title"], ["h2", "ablux-section-title"], ["h1", "pg-hero__title"], ["h2", "pg-section__title"],
          ["h1", "ui-section-heading__title"], ["h2", "ui-section-heading__title"], ["h3", "ui-ticket__title"], ["h3", "ui-postcard__title"],
          ["h1", "cat-detail__title"], ["h3", "cat-card__title"], ["p", "font-serif text-5xl"], ["p", "font-serif italic text-4xl"],
        ];
        for (const [tag, className] of samples) {
          const label = document.createElement("small");
          label.textContent = `${tag}${className ? "." + className : ""}`;
          label.style.cssText = "display:block;font:12px monospace;opacity:.6;margin-top:18px";
          const node = document.createElement(tag);
          node.className = className;
          node.textContent = text;
          sheet.append(label, node);
        }
        document.body.prepend(sheet);
        window.scrollTo(0, 0);
      },
      { text: DIACRITICS, theme },
    );
    await page.waitForTimeout(400);
    await page.locator("#qa-diacritics").screenshot({ path: path.join(OUT, `diacritics-sheet-${theme}.png`) });
  }
  await context.close();
}

// ---------- admin as QA editor ----------
if (!skip.has("admin")) {
  const email = "qa-editor@ablux.local";
  const password = readSecret(email);
  if (!password) {
    results.admin.push({ error: "Nema lozinke QA urednika u SECRETS.local.md" });
  } else {
    for (const config of [CONFIGS[0], CONFIGS[1]]) {
      const context = await newContext(config);
      const page = await context.newPage();
      await page.goto(`${BASE}/auth?mode=signin`, { waitUntil: "load" });
      await page.locator('input[type="email"]').fill(email);
      await page.locator('input[autocomplete="current-password"]').fill(password);
      await page.locator('form button[type="submit"]').click();
      await page.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 60000 });
      for (const screen of config.mobile ? ADMIN_MOBILE : ADMIN_SCREENS) {
        const log = watch(page);
        await page.goto(`${BASE}${screen}`, { waitUntil: "load", timeout: 120000 });
        let ready = true;
        try {
          await page.locator(".adm-top__title").first().waitFor({ timeout: 60000 });
          await page.waitForTimeout(2500);
        } catch {
          ready = false;
        }
        const info = await inspect(page);
        await page.screenshot({ path: path.join(OUT, `admin-${config.name}-${slug(screen.replace(/^\/admin\/?/, "") || "pregled")}.png`), fullPage: true, timeout: 60000 }).catch(() => {});
        if (!config.mobile && !skip.has("axe")) await runAxe(page, screen, `admin-${config.name}`);
        if (!config.mobile && !skip.has("focus") && ["/admin", "/admin/ponude"].includes(screen)) await checkFocus(page, screen);
        results.admin.push({ config: config.name, screen, ready, overflow: info.overflow, wide: info.wide, noAlt: info.noAlt, h1: info.h1.length, console: [...new Set(log.console)], failed: [...new Set(log.failed)] });
        page.removeAllListeners("console");
        page.removeAllListeners("pageerror");
        page.removeAllListeners("requestfailed");
        page.removeAllListeners("response");
        console.log(`admin ${config.name.padEnd(14)} ${screen.padEnd(34)} ready=${ready} overflow=${info.overflow} h1=${info.h1.length} console=${log.console.length} failed=${log.failed.length}`);
      }
      await context.close();
    }
  }
}

// ---------- internal link crawl ----------
if (!skip.has("crawl")) {
  // Follow one level from what the visited pages link to (offers: sample).
  const queue = [...internalLinks.keys()].filter((href) => !href.startsWith("/admin") && !href.startsWith("/api"));
  const offers = queue.filter((href) => href.startsWith("/ponude/"));
  const others = queue.filter((href) => !href.startsWith("/ponude/"));
  const targets = [...others, ...offers.slice(0, 60)];
  let index = 0;
  async function worker() {
    while (index < targets.length) {
      const href = targets[index++];
      try {
        const response = await fetch(`${BASE}${href}`, { redirect: "follow" });
        if (response.status >= 400) results.links.push({ href, status: response.status, from: internalLinks.get(href) });
      } catch (error) {
        results.links.push({ href, status: 0, error: String(error).slice(0, 120), from: internalLinks.get(href) });
      }
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  console.log(`crawl: ${targets.length} links checked (${offers.length} offer links, ${Math.min(60, offers.length)} sampled), broken=${results.links.length}`);
}

await browser.close();
results.finishedAt = new Date().toISOString();
writeFileSync(path.join(OUT, "report.json"), JSON.stringify(results, null, 2));

// Short summary for the night report.
const problems = results.pages.filter((entry) => !entry.statusOk || entry.overflow > 0 || entry.console.length || entry.failed.length || entry.noAlt.length || entry.clipped.length);
const axeIds = new Map();
for (const item of results.axe) axeIds.set(item.id, (axeIds.get(item.id) ?? 0) + 1);
const summary = [
  `# QA ${results.startedAt}`,
  `stranice: ${results.pages.length}, sa problemom: ${problems.length}`,
  `axe (serious/critical): ${[...axeIds].map(([id, count]) => `${id}×${count}`).join(", ") || "0"}`,
  `fokus bez vidljivog stila: ${results.focus.reduce((sum, item) => sum + item.missing.length, 0)}`,
  `pokvareni linkovi: ${results.links.length}`,
  `admin sa problemom: ${results.admin.filter((item) => item.error || !item.ready || item.overflow > 0 || item.console?.length || item.failed?.length).length}/${results.admin.length}`,
  "",
  ...problems.map((entry) => `- ${entry.config} ${entry.route}: status=${entry.status} overflow=${entry.overflow} ${entry.wide.join("; ")} console=${entry.console.join(" | ").slice(0, 300)} failed=${entry.failed.join(" | ").slice(0, 300)} noAlt=${entry.noAlt.length} clipped=${entry.clipped.join(" | ")}`),
];
writeFileSync(path.join(OUT, "summary.md"), summary.join("\n"));
console.log(summary.slice(0, 6).join("\n"));
