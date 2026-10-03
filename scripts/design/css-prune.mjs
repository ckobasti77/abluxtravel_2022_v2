// Removes selectors that reference classes no source file uses (see css-usage.mjs).
// Usage: node scripts/design/css-prune.mjs <file.css> [--dry]
import fs from "node:fs";
import postcss from "postcss";
import { isUsed } from "./css-usage.mjs";

const [file, flag] = process.argv.slice(2);
const root = postcss.parse(fs.readFileSync(file, "utf8"));
let removedSelectors = 0;
let removedRules = 0;
root.walkRules((rule) => {
  if (rule.parent?.type === "atrule" && /keyframes/.test(rule.parent.name)) return;
  const keep = rule.selectors.filter((sel) => {
    const classes = [...sel.matchAll(/\.(-?[a-zA-Z_][a-zA-Z0-9_-]*)/g)].map((m) => m[1]);
    const dead = classes.some((c) => !isUsed(c));
    if (dead) removedSelectors++;
    return !dead;
  });
  if (keep.length === 0) {
    rule.remove();
    removedRules++;
  } else if (keep.length !== rule.selectors.length) {
    rule.selectors = keep;
  }
});
let changed = true;
while (changed) {
  changed = false;
  root.walkAtRules((at) => {
    if (["media", "supports", "layer", "container"].includes(at.name) && at.nodes && at.nodes.length === 0) {
      at.remove();
      changed = true;
    }
  });
}
// Drop keyframes no longer referenced by any animation.
const css = root.toString();
root.walkAtRules(/keyframes$/, (at) => {
  const name = at.params.trim();
  const re = new RegExp(`animation(-name)?\s*:[^;]*\b${name}\b`);
  const codeUses = isUsed(name);
  if (!re.test(css.replace(at.toString(), "")) && !codeUses) {
    at.remove();
    removedRules++;
  }
});
console.log(`${file}: removed ${removedSelectors} selectors, ${removedRules} rules/keyframes`);
if (flag !== "--dry") fs.writeFileSync(file, root.toString().replace(/\n{3,}/g, "\n\n"));
