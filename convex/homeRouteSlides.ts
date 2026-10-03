import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { requireRole } from "./lib/access";
import { audit } from "./lib/audit";

const localizedText = v.object({
  sr: v.string(),
  en: v.string(),
});

const routeTone = v.union(v.literal("brick"), v.literal("teal"), v.literal("teal-deep"), v.literal("gold"));

const normalizeText = (value: string) => value.trim().replace(/\s+/g, " ");

const normalizeAccent = (value?: string) => {
  const accent = value?.trim();
  return accent && /^#[0-9a-f]{6}$/i.test(accent) ? accent : "#0e7c7b";
};

/** Route cards link only inside the site ("/ponude?tip=…"), never to another origin. */
const normalizeHref = (value?: string) => {
  const href = value?.trim();
  if (!href) return undefined;
  if (!href.startsWith("/") || href.startsWith("//") || /[\s\\]/.test(href)) {
    throw new ConvexError("INVALID_HREF");
  }
  return href.slice(0, 300);
};

const normalizeBody = (value?: { sr: string; en: string }) => {
  if (!value) return undefined;
  const body = { sr: normalizeText(value.sr).slice(0, 220), en: normalizeText(value.en).slice(0, 220) };
  return body.sr || body.en ? body : undefined;
};

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "editor");
    const slides = await ctx.db
      .query("homeRouteSlides")
      .withIndex("by_order", (q) => q)
      .collect();

    return Promise.all(
      slides.map(async (slide) => ({
        ...slide,
        imageUrl: await ctx.storage.getUrl(slide.storageId),
      }))
    );
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const slides = await ctx.db
      .query("homeRouteSlides")
      .withIndex("by_order", (q) => q)
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return Promise.all(
      slides.map(async (slide) => ({
        ...slide,
        imageUrl: await ctx.storage.getUrl(slide.storageId),
      }))
    );
  },
});

/**
 * Homepage "Najtraženije rute": active slides that have a link are route cards
 * (legacy photo slides without a link are ignored). Public, published data only.
 */
export const routeCards = query({
  args: {},
  handler: async (ctx) => {
    const slides = await ctx.db
      .query("homeRouteSlides")
      .withIndex("by_order", (q) => q)
      .filter((q) => q.eq(q.field("isActive"), true))
      .take(50);

    const cards = await Promise.all(
      slides
        .filter((slide) => Boolean(slide.href))
        .slice(0, 5)
        .map(async (slide) => ({
          id: slide._id,
          title: slide.title,
          meta: slide.caption,
          body: slide.body ?? null,
          href: slide.href as string,
          tone: slide.tone ?? null,
          imageUrl: await ctx.storage.getUrl(slide.storageId),
        }))
    );
    return cards.filter((card) => card.imageUrl);
  },
});

export const upsert = mutation({
  args: {
    id: v.optional(v.id("homeRouteSlides")),
    title: localizedText,
    caption: localizedText,
    accent: v.optional(v.string()),
    storageId: v.id("_storage"),
    order: v.number(),
    isActive: v.boolean(),
    href: v.optional(v.string()),
    body: v.optional(localizedText),
    tone: v.optional(routeTone),
  },
  handler: async (ctx, args) => {
    const viewer = await requireRole(ctx, "editor");
    await audit(ctx, viewer, { action: "homeRouteSlides.upsert", targetTable: "homeRouteSlides", targetId: args.id });
    const now = Date.now();
    const values = {
      title: {
        sr: normalizeText(args.title.sr),
        en: normalizeText(args.title.en),
      },
      caption: {
        sr: normalizeText(args.caption.sr),
        en: normalizeText(args.caption.en),
      },
      accent: normalizeAccent(args.accent),
      storageId: args.storageId,
      order: Number(args.order),
      isActive: args.isActive,
      updatedAt: now,
      href: normalizeHref(args.href),
      body: normalizeBody(args.body),
      tone: args.tone,
    };

    if (args.id) {
      const existing = await ctx.db.get(args.id);
      await ctx.db.patch(args.id, values);

      if (existing && existing.storageId !== args.storageId) {
        await ctx.storage.delete(existing.storageId);
      }

      return args.id;
    }

    return await ctx.db.insert("homeRouteSlides", values);
  },
});

export const remove = mutation({
  args: { id: v.id("homeRouteSlides") },
  handler: async (ctx, args) => {
    const viewer = await requireRole(ctx, "editor");
    await audit(ctx, viewer, { action: "homeRouteSlides.remove", targetTable: "homeRouteSlides", targetId: args.id });
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      return;
    }

    await ctx.db.delete(args.id);
    await ctx.storage.delete(existing.storageId);
  },
});
