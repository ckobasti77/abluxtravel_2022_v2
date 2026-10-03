// Lists CSS classes defined in the given stylesheets that no source file references.
// Usage: node scripts/design/css-usage.mjs app/globals.css [more.css]
import fs from "node:fs";
import path from "node:path";

const roots = ["app", "components", "lib"];
const sources = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (/\.(tsx?|jsx?|mdx?)$/.test(entry.name)) sources.push(fs.readFileSync(p, "utf8"));
  }
}
roots.forEach(walk);
const code = sources.join("\n");
// Prefixes of dynamically built class names, e.g. `ablux-route-ticket--${tone}`.
const dynamicPrefixes = [...code.matchAll(/([a-z][a-z0-9_-]*?(?:--|__|-))\$\{/g)].map((m) => m[1]);

export function isUsed(cls) {
  const re = new RegExp(`(^|[^a-zA-Z0-9_-])${cls.replace(/[-]/g, "\-")}($|[^a-zA-Z0-9_-])`);
  if (re.test(code)) return true;
  return dynamicPrefixes.some((prefix) => cls.startsWith(prefix) && cls.length > prefix.length);
}

if (process.argv[1] && process.argv[1].endsWith("css-usage.mjs")) {
  for (const file of process.argv.slice(2)) {
    const css = fs.readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/url\([^)]*\)/g, "");
    const classes = new Set([...css.matchAll(/\.(-?[a-zA-Z_][a-zA-Z0-9_-]*)/g)].map((m) => m[1]).filter((c) => !/^\d/.test(c)));
    const unused = [...classes].filter((c) => !isUsed(c)).sort();
    console.log(`${file}: ${classes.size} classes, ${unused.length} unused`);
    console.log(unused.join(" "));
  }
}
