import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cache } from "react";
import { resolveHeroScenes, type HeroScenes } from "./hero-manifest";

/**
 * Reads public/media/hero/manifest.json on every request (pages render
 * dynamically), so new hero files only need a manifest entry, never code.
 * A missing or broken manifest falls back to the approved stills.
 */
export const loadHeroScenes = cache(async (): Promise<HeroScenes> => {
  try {
    const raw = await readFile(join(process.cwd(), "public", "media", "hero", "manifest.json"), "utf8");
    return resolveHeroScenes(JSON.parse(raw));
  } catch {
    return resolveHeroScenes(null);
  }
});
