import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveHeroScenes } from "./hero-manifest";

describe("resolveHeroScenes", () => {
  it("falls back to the approved stills when the manifest is missing", () => {
    const scenes = resolveHeroScenes(null);
    expect(scenes.hodocasca.motion).toBe("loop");
    expect(scenes.hodocasca.desktop.poster).toBe("/generated/ablux-hero-reference-desktop.png");
    expect(scenes.hodocasca.mobile.poster).toBe("/generated/ablux-hero-reference-mobile.png");
    expect(scenes.mediteran.desktop.poster).toBe("/generated/route-mediteran.png");
    expect(scenes.evropa.desktop.mp4).toBeUndefined();
    expect(scenes.rentabus.desktop.poster).toBeNull();
    expect(scenes.evropa.usesFallback).toBe(true);
  });

  it("reads drone scenes, prefixes the media folder and keeps missing keys optional", () => {
    const scenes = resolveHeroScenes({
      version: 2,
      scenes: {
        hodocasca: { motion: "drone", desktop: { poster: "h-d.avif", mp4: "h-d.mp4" }, mobile: { poster: "h-m.avif" } },
        mediteran: { desktop: { poster: "m-d.avif", mp4: "m-d.mp4", webm: "m-d.webm" } },
        rentabus: { motion: "still", desktop: { poster: "r.avif", mp4: "r.mp4" } },
      },
    });
    expect(scenes.hodocasca.motion).toBe("drone");
    expect(scenes.hodocasca.desktop).toEqual({ poster: "/media/hero/h-d.avif", mp4: "/media/hero/h-d.mp4", webm: undefined });
    expect(scenes.hodocasca.mobile.mp4).toBeUndefined();
    // Missing motion = loop; missing mobile poster = the scene's desktop poster.
    expect(scenes.mediteran.motion).toBe("loop");
    expect(scenes.mediteran.mobile.poster).toBe("/media/hero/m-d.avif");
    expect(scenes.mediteran.desktop.webm).toBe("/media/hero/m-d.webm");
    // "still" never plays a video, even if one is listed.
    expect(scenes.rentabus.desktop.mp4).toBeUndefined();
    expect(scenes.rentabus.desktop.poster).toBe("/media/hero/r.avif");
    expect(scenes.evropa.desktop.poster).toBe("/generated/route-evropski-gradovi.png");
  });

  it("ignores paths and unknown file types", () => {
    const scenes = resolveHeroScenes({
      scenes: { evropa: { motion: "spin", desktop: { poster: "../secret.avif", mp4: "https://x.test/a.mp4" } } },
    });
    expect(scenes.evropa.motion).toBe("loop");
    expect(scenes.evropa.desktop.poster).toBe("/generated/route-evropski-gradovi.png");
    expect(scenes.evropa.desktop.mp4).toBeUndefined();
  });

  it("matches the delivered manifest", () => {
    const raw = JSON.parse(readFileSync(join(process.cwd(), "public/media/hero/manifest.json"), "utf8"));
    const scenes = resolveHeroScenes(raw);
    for (const key of ["hodocasca", "mediteran", "evropa", "ostrog"] as const) {
      expect(scenes[key].desktop.poster).toMatch(/^\/media\/hero\/.+\.avif$/);
    }
  });
});
