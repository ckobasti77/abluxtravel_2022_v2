// Step 18 evidence: navbar controls, hide-on-scroll, religious hero sharpness and an image inventory.
// PLAYWRIGHT_BROWSERS_PATH=.tools/ms-playwright E2E_BASE_URL=http://localhost:3000 node scripts/qa/step18-shots.mjs --tag before|after [--only nav,scroll,hero,images]
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const args = process.argv.slice(2);
const argValue = (name) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : null);
const TAG = argValue("tag") ?? "after";
const only = new Set((argValue("only") ?? "nav,scroll,hero,images").split(","));
const OUT = path.join(ROOT, "night-run", "qa", "18");
mkdirSync(OUT, { recursive: true });

const PUBLIC_ROUTES = [
  "/", "/ponude", "/aranzmani", "/aranzmani/turska", "/verski-turizam", "/destinacije", "/putovanja", "/putovanja/grcka",
  "/zemlje", "/iznajmljivanje-vozila", "/o-nama", "/kontakt", "/auth",
  "/ponude/malta-ostrvo-vitezova-istorije-valeta-mayak", "/ponude/park-beach-limasol-bigblue",
];
const WIDTHS = [
  { name: "1440", viewport: { width: 1440, height: 900 } },
  { name: "390", viewport: { width: 390, height: 844 }, mobile: true },
];

const browser = await chromium.launch();
const report = { tag: TAG, base: BASE, nav: [], scroll: [], hero: [], images: [] };

async function open(width, theme, route, extra = {}) {
  const context = await browser.newContext({
    viewport: width.viewport,
    deviceScaleFactor: width.mobile ? 3 : 1,
    isMobile: Boolean(width.mobile),
    hasTouch: Boolean(width.mobile),
    reducedMotion: extra.reducedMotion ? "reduce" : "no-preference",
  });
  await context.addInitScript((value) => {
    try {
      localStorage.setItem("ablux_theme", value);
    } catch {}
  }, theme);
  const page = await context.newPage();
  await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 90_000 }).catch(() => {});
  await page.waitForTimeout(800);
  return { context, page };
}

const shot = (page, name, clip) => page.screenshot({ path: path.join(OUT, `${TAG}-${name}.png`), clip, animations: "disabled" });

if (only.has("nav")) {
  for (const width of WIDTHS) {
    for (const theme of ["light", "dark"]) {
      for (const route of ["/", "/ponude"]) {
        const { context, page } = await open(width, theme, route);
        const label = `nav-${width.name}-${theme === "light" ? "papir" : "tinta"}-${route === "/" ? "hero" : "solid"}`;
        const clip = { x: 0, y: 0, width: width.viewport.width, height: 80 };
        await shot(page, label, clip);
        // Keyboard focus on the search icon.
        await page.focus(".snav__utils .snav__icon").catch(() => {});
        await page.keyboard.press("Shift+Tab").catch(() => {});
        await page.keyboard.press("Tab").catch(() => {});
        await shot(page, `${label}-focus`, clip);
        const metrics = await page.evaluate(() =>
          [...document.querySelectorAll(".snav__utils .snav__icon, .snav-lang__btn")]
            .filter((el) => el.getBoundingClientRect().width > 0)
            .map((el) => {
              const box = el.getBoundingClientRect();
              const icon = el.querySelector("svg")?.getBoundingClientRect();
              const style = getComputedStyle(el);
              return {
                label: el.getAttribute("aria-label") ?? el.textContent,
                box: [Math.round(box.width), Math.round(box.height)],
                iconOffset: icon ? [+(icon.left + icon.width / 2 - (box.left + box.width / 2)).toFixed(2), +(icon.top + icon.height / 2 - (box.top + box.height / 2)).toFixed(2)] : null,
                border: style.borderTopWidth + " " + style.borderTopStyle,
                background: style.backgroundColor,
                shadow: style.boxShadow,
                outline: el === document.activeElement ? style.outlineStyle + " " + style.outlineWidth : undefined,
              };
            }),
        );
        report.nav.push({ label, metrics });
        await context.close();
      }
    }
  }
}

if (only.has("scroll")) {
  for (const width of WIDTHS) {
    const { context, page } = await open(width, "light", "/");
    const top = () => page.evaluate(() => {
      const bar = document.querySelector(".snav")?.getBoundingClientRect();
      const pill = document.querySelector(".tsearch-pill")?.getBoundingClientRect();
      return { navBottom: bar ? Math.round(bar.bottom) : null, pillTop: pill ? Math.round(pill.top) : null };
    });
    const states = [];
    await page.mouse.wheel(0, 1600);
    await page.waitForTimeout(700);
    states.push({ step: "down", ...(await top()) });
    await shot(page, `scroll-${width.name}-down`, { x: 0, y: 0, width: width.viewport.width, height: 160 });
    await page.mouse.wheel(0, -200);
    await page.waitForTimeout(700);
    states.push({ step: "up", ...(await top()) });
    await shot(page, `scroll-${width.name}-up`, { x: 0, y: 0, width: width.viewport.width, height: 160 });
    report.scroll.push({ width: width.name, states });
    await context.close();
  }
}

if (only.has("hero")) {
  for (const width of WIDTHS) {
    const { context, page } = await open(width, "light", "/verski-turizam");
    await page.waitForSelector(".rel-hero-media .ablux-scene-media__video.is-playing", { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(3500);
    const info = await page.evaluate(() =>
      [...document.querySelectorAll(".rel-hero-media")]
        .filter((el) => el.getBoundingClientRect().width > 0)
        .map((el) => {
          const media = el.querySelector("video.is-playing") ?? el.querySelector("img");
          const box = media.getBoundingClientRect();
          return {
            tag: media.tagName,
            src: media.currentSrc,
            intrinsic: media.tagName === "VIDEO" ? [media.videoWidth, media.videoHeight] : [media.naturalWidth, media.naturalHeight],
            rendered: [Math.round(box.width), Math.round(box.height)],
            dpr: window.devicePixelRatio,
            transform: getComputedStyle(media).transform,
            filter: getComputedStyle(media).filter,
          };
        }),
    );
    report.hero.push({ width: width.name, info });
    await shot(page, `hero-${width.name}`);
    const vw = width.viewport.width;
    await shot(page, `hero-${width.name}-detail`, { x: Math.round(vw * 0.5), y: 120, width: Math.round(vw * 0.45), height: Math.round(vw * 0.3) });
    await context.close();
  }
}

if (only.has("images")) {
  const seen = new Map();
  for (const width of WIDTHS) {
    for (const route of PUBLIC_ROUTES) {
      const { context, page } = await open(width, "light", route);
      // Scroll through so lazy images load.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 600) {
          window.scrollTo(0, y);
          await new Promise((resolve) => setTimeout(resolve, 120));
        }
      });
      await page.waitForTimeout(800);
      const found = await page.evaluate(() => {
        const out = [];
        for (const img of document.querySelectorAll("img")) {
          const box = img.getBoundingClientRect();
          out.push({ kind: "img", url: img.currentSrc || img.src, alt: img.alt, size: [Math.round(box.width), Math.round(box.height)], where: img.closest("[class]")?.className?.toString().slice(0, 80) });
        }
        for (const source of document.querySelectorAll("video[poster]")) out.push({ kind: "poster", url: source.poster });
        for (const el of document.querySelectorAll("*")) {
          const bg = getComputedStyle(el).backgroundImage;
          for (const match of bg.matchAll(/url\("?([^")]+)"?\)/g)) out.push({ kind: "css", url: match[1], where: el.className?.toString().slice(0, 80) });
        }
        return out;
      });
      for (const item of found) {
        if (!item.url || item.url.startsWith("data:")) continue;
        const entry = seen.get(item.url) ?? { ...item, pages: [] };
        if (!entry.pages.includes(route)) entry.pages.push(route);
        seen.set(item.url, entry);
      }
      if (width.name === "1440") await page.screenshot({ path: path.join(OUT, `${TAG}-page${route.replaceAll("/", "_") || "_"}.png`), fullPage: true }).catch(() => {});
      await context.close();
    }
  }
  report.images = [...seen.values()];
}

writeFileSync(path.join(OUT, `${TAG}-report.json`), JSON.stringify(report, null, 2));
await browser.close();
console.log(`step18 ${TAG}: nav ${report.nav.length}, scroll ${report.scroll.length}, hero ${report.hero.length}, images ${report.images.length} → night-run/qa/18`);
