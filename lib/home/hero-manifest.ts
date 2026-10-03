// Hero media contract (docs/design/hero-prompts.md): every file lives in
// public/media/hero/ and is listed in manifest.json. Any key may be missing;
// this module turns the raw manifest into scenes the hero can always render.
// Pure code (no fs), shared by the server page and tests.

export const HERO_MEDIA_BASE = "/media/hero/";

export type HeroMotion = "drone" | "loop" | "still";
export type HeroSceneKey = "hodocasca" | "mediteran" | "evropa" | "ostrog" | "rentabus";

/** The three hero channels (tickets), in order; the first is the default. */
export const HERO_CHANNELS = ["hodocasca", "mediteran", "evropa"] as const;
export type HeroChannelKey = (typeof HERO_CHANNELS)[number];

export type HeroVariant = {
  /** Poster (first frame); null only when neither the manifest nor the fallback has one. */
  poster: string | null;
  mp4?: string;
  webm?: string;
};

export type HeroScene = {
  key: HeroSceneKey;
  motion: HeroMotion;
  desktop: HeroVariant;
  mobile: HeroVariant;
  /** True when a poster came from public/generated/ instead of the manifest. */
  usesFallback: boolean;
};

export type HeroScenes = Record<HeroSceneKey, HeroScene>;

const SCENE_KEYS: HeroSceneKey[] = ["hodocasca", "mediteran", "evropa", "ostrog", "rentabus"];

/** Approved stills in public/generated/ used when the manifest has no poster. */
const FALLBACK_POSTERS: Record<HeroSceneKey, { desktop: string | null; mobile: string | null }> = {
  hodocasca: { desktop: "/generated/ablux-hero-reference-desktop.png", mobile: "/generated/ablux-hero-reference-mobile.png" },
  ostrog: { desktop: "/generated/ablux-hero-ostrog-desktop.png", mobile: "/generated/ablux-hero-ostrog-mobile.png" },
  mediteran: { desktop: "/generated/route-mediteran.png", mobile: "/generated/route-mediteran.png" },
  evropa: { desktop: "/generated/route-evropski-gradovi.png", mobile: "/generated/route-evropski-gradovi.png" },
  rentabus: { desktop: null, mobile: null },
};

const FILE_RE = {
  poster: /^[a-z0-9][a-z0-9._-]*\.(avif|webp|jpe?g|png)$/i,
  mp4: /^[a-z0-9][a-z0-9._-]*\.mp4$/i,
  webm: /^[a-z0-9][a-z0-9._-]*\.webm$/i,
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** A plain file name from the manifest becomes a public URL; anything else is ignored. */
function file(value: unknown, kind: keyof typeof FILE_RE): string | undefined {
  if (typeof value !== "string" || !FILE_RE[kind].test(value) || value.includes("..")) return undefined;
  return `${HERO_MEDIA_BASE}${value}`;
}

function motionOf(value: unknown): HeroMotion {
  return value === "drone" || value === "still" || value === "loop" ? value : "loop";
}

function variantOf(raw: unknown): { poster?: string; mp4?: string; webm?: string } {
  const entry = record(raw);
  if (!entry) return {};
  return { poster: file(entry.poster, "poster"), mp4: file(entry.mp4, "mp4"), webm: file(entry.webm, "webm") };
}

/** Resolve the raw manifest (or null when it is missing) into renderable scenes. */
export function resolveHeroScenes(manifest: unknown): HeroScenes {
  const scenes = record(record(manifest)?.scenes) ?? {};
  const result = {} as HeroScenes;

  for (const key of SCENE_KEYS) {
    const raw = record(scenes[key]);
    const motion = motionOf(raw?.motion);
    const desktop = variantOf(raw?.desktop);
    const mobile = variantOf(raw?.mobile);
    const fallback = FALLBACK_POSTERS[key];
    const still = motion === "still";

    const desktopPoster = desktop.poster ?? fallback.desktop;
    // A missing mobile poster uses the scene's own desktop poster before the generic fallback.
    const mobilePoster = mobile.poster ?? desktop.poster ?? fallback.mobile;

    result[key] = {
      key,
      motion,
      desktop: { poster: desktopPoster, mp4: still ? undefined : desktop.mp4, webm: still ? undefined : desktop.webm },
      mobile: { poster: mobilePoster, mp4: still ? undefined : mobile.mp4, webm: still ? undefined : mobile.webm },
      usesFallback: !desktop.poster || !mobile.poster,
    };
  }
  return result;
}

/** Human summary for QA and the night report: which assets are present. */
export function describeHeroScenes(scenes: HeroScenes): string[] {
  return SCENE_KEYS.map((key) => {
    const scene = scenes[key];
    const parts = [
      `motion=${scene.motion}`,
      `desktop: ${scene.desktop.mp4 ? "video" : "still"}`,
      `mobile: ${scene.mobile.mp4 ? "video" : "still"}`,
      scene.usesFallback ? "fallback poster" : "manifest posters",
    ];
    return `${key}: ${parts.join(", ")}`;
  });
}
