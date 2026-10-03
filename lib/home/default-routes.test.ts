import { describe, expect, it } from "vitest";
import { DEFAULT_ROUTES, mergeRoutes, type AdminRouteCard } from "./default-routes";

const card = (patch: Partial<AdminRouteCard>): AdminRouteCard => ({
  id: "a1",
  title: { sr: "Grčka ostrva", en: "Greek islands" },
  meta: { sr: "More · ostrva", en: "Sea · islands" },
  body: null,
  href: "/ponude?zemlja=grcka",
  tone: "teal",
  imageUrl: "https://example.convex.cloud/api/storage/x",
  ...patch,
});

describe("mergeRoutes", () => {
  it("shows the five approved routes when admin has none", () => {
    expect(mergeRoutes([]).map((route) => route.id)).toEqual(DEFAULT_ROUTES.map((route) => route.id));
  });

  it("puts admin cards first and keeps five in total", () => {
    const merged = mergeRoutes([card({}), card({ id: "a2", title: { sr: "Mediteran", en: "Mediterranean" } })]);
    expect(merged).toHaveLength(5);
    expect(merged[0].id).toBe("a1");
    expect(merged[0].local).toBe(false);
    expect(merged[1].id).toBe("a2");
    // The default "Mediteran" is replaced by the admin card with the same title.
    expect(merged.filter((route) => route.title.sr === "Mediteran")).toHaveLength(1);
  });

  it("ignores cards without an image or with an outside link", () => {
    const merged = mergeRoutes([card({ imageUrl: null }), card({ id: "x", href: "//evil.test" })]);
    expect(merged.map((route) => route.id)).toEqual(DEFAULT_ROUTES.map((route) => route.id));
  });
});
