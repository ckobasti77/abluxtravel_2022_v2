// Render Serbian diacritics in the display serif (--font-editorial) at every weight and screenshot.
// Usage: PLAYWRIGHT_BROWSERS_PATH=.tools/ms-playwright E2E_BASE_URL=http://localhost:3000 node scripts/design/glyph-test.mjs [outDir]
import { chromium } from "playwright";
const base = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const out = process.argv[2] ?? "night-run/qa";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.goto(base + "/", { waitUntil: "load", timeout: 90000 });
const report = await page.evaluate(async () => {
  const strings = ["Najtraženije ČĆŽŠĐ čćžšđ", "Iznajmljivanje vozila sa vozačem", "Đurđevdan u Ćupriji · ŽIČA"];
  const host = document.createElement("div");
  host.id = "glyph-test";
  host.style.cssText = "position:fixed;inset:0;z-index:99999;background:#F8F4EA;color:#06151A;padding:24px;overflow:auto";
  for (const lh of ["0.88", "1.1"]) {
    const h = document.createElement("p");
    h.textContent = "line-height " + lh;
    h.style.cssText = "font:700 12px system-ui;margin:12px 0 4px";
    host.append(h);
    for (const w of [400, 500, 600, 700]) for (const st of ["normal", "italic"]) {
      const d = document.createElement("div");
      d.textContent = `${w} ${st[0]} · ${strings[(w / 100) % 3]}`;
      d.style.cssText = `font-family:var(--font-editorial),serif;font-weight:${w};font-style:${st};font-size:44px;line-height:${lh};outline:1px dashed rgba(155,58,46,.4);overflow:hidden`;
      host.append(d);
    }
  }
  document.body.append(host);
  await document.fonts.ready;
  const faces = [...document.fonts].filter((f) => f.status === "loaded").map((f) => `${f.family} ${f.weight} ${f.style} ${f.unicodeRange.slice(0, 40)}`);
  const ff = getComputedStyle(host.children[1]).fontFamily;
  return { faces, ff };
});
console.log(JSON.stringify(report, null, 2));
await page.locator("#glyph-test").screenshot({ path: `${out}/glyphs.png` });
await browser.close();
