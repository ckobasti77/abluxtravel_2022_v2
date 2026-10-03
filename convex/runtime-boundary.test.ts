import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ADAPTERS } from "../scraper/adapters";
import { FAMILY_BEHAVIOR } from "../scraper/core/families";

const CONVEX_DIR = import.meta.dirname;
const NODE_ONLY = [
  /scraper\/adapters/,
  /scraper\/core\/(http|html|sanitize|finalize|matrix)["']/,
  /scraper\/testing/,
  /from ["']cheerio/,
  /from ["']sanitize-html/,
  /from ["']exceljs/,
  /from ["']@anthropic-ai\/sdk/,
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (name === "_generated" || name === "node_modules") return [];
    if (statSync(full).isDirectory()) return walk(full);
    return /\.ts$/.test(name) && !name.endsWith(".test.ts") ? [full] : [];
  });
}

describe("Convex runtime boundary", () => {
  it("keeps Node-only modules out of V8 functions", () => {
    const offenders: string[] = [];
    for (const file of walk(CONVEX_DIR)) {
      const source = readFileSync(file, "utf8");
      if (/^["']use node["'];/m.test(source)) continue;
      for (const pattern of NODE_ONLY) {
        if (pattern.test(source)) offenders.push(`${path.relative(CONVEX_DIR, file)} → ${pattern}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("keeps FAMILY_BEHAVIOR in sync with the adapters", () => {
    for (const [family, adapter] of Object.entries(ADAPTERS)) {
      if (!adapter) continue;
      const behavior = FAMILY_BEHAVIOR[family as keyof typeof FAMILY_BEHAVIOR];
      expect({ family, mergeMode: adapter.mergeMode, listedFrom: adapter.listedFrom }).toEqual({ family, ...behavior });
    }
  });
});
