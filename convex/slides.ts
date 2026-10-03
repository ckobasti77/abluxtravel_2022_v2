import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { requireRole } from "./lib/access";
import { audit } from "./lib/audit";

const detectMediaTypeFromName = (
  fileName?: string
): "video" | "image" | undefined => {
  if (!fileName) {
    return undefined;
  }

  const normalized = fileName.toLowerCase().split("?")[0].split("#")[0];
  if (normalized.endsWith(".mp4")) {
    return "video";
  }

  if (
    normalized.endsWith(".jpg") ||
    normalized.endsWith(".jpeg") ||
    normalized.endsWith(".png") ||
    normalized.endsWith(".webp") ||
    normalized.endsWith(".avif")
  ) {
    return "image";
  }

  return undefined;
};

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[čć]/g, "c")
    .replace(/[š]/g, "s")
    .replace(/[ž]/g, "z")
    .replace(/[đ]/g, "dj")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

type SlideMediaItem = {
  storageId: Id<"_storage">;
  mediaType: "video" | "image";
  mediaName?: string;
};

const normalizeTravelGroup = async (ctx: QueryCtx, slide: Doc<"slides">) => {
  const slug = slide.slug ?? slugify(slide.title);
  const heroMediaStorageId = slide.heroMediaStorageId ?? slide.storageId;
  const heroMediaType =
    slide.heroMediaType ??
    slide.mediaType ??
    detectMediaTypeFromName(slide.videoUrl) ??
    (heroMediaStorageId ? "video" : undefined);
  const imageStorageIds = slide.imageStorageIds ?? [];
  const detailMedia =
    slide.detailMedia ??
    imageStorageIds.map((storageId) => ({
      storageId,
      mediaType: "image" as const,
    }));
  const destinations = await ctx.db
    .query("destinations")
    .withIndex("by_page_order", (q) => q.eq("pageSlug", slug))
    .collect();
  const activeDestinations = destinations.filter((item) => item.isActive);
  const lowestDestination = activeDestinations.reduce<Doc<"destinations"> | null>(
    (lowest, item) =>
      !lowest || item.price < lowest.price ? item : lowest,
    null
  );

  return {
    ...slide,
    slug,
    description: slide.description ?? slide.copy ?? slide.subtitle ?? "",
    price: slide.price ?? 0,
    currency: slide.currency ?? "RSD",
    nights: slide.nights ?? 0,
    days: slide.days ?? 0,
    transport: slide.transport ?? "bus",
    departureDate: slide.departureDate ?? "",
    returnDate: slide.returnDate ?? "",
    departureCity: slide.departureCity ?? "",
    itinerary: slide.itinerary ?? [],
    included: slide.included ?? [],
    notIncluded: slide.notIncluded ?? [],
    imageStorageIds,
    detailMedia: await Promise.all(
      (detailMedia as SlideMediaItem[]).map(async (media) => ({
        ...media,
        url: (await ctx.storage.getUrl(media.storageId)) ?? "",
      }))
    ),
    heroMediaType,
    heroMediaStorageId,
    heroMediaName: slide.heroMediaName ?? slide.videoUrl,
    heroMediaUrl: heroMediaStorageId
      ? await ctx.storage.getUrl(heroMediaStorageId)
      : null,
    imageUrls: await Promise.all(
      imageStorageIds.map(async (id) => {
        const url = await ctx.storage.getUrl(id);
        return url ?? "";
      })
    ),
    destinationCount: activeDestinations.length,
    subagencyDestinationCount: activeDestinations.filter(
      (item) => item.offerType === "subagency"
    ).length,
    lowestDestinationPrice: lowestDestination?.price,
    lowestDestinationCurrency: lowestDestination?.currency,
    status: slide.status ?? (slide.isActive ? "active" : "upcoming"),
    featured: slide.featured ?? false,
    updatedAt: slide.updatedAt ?? 0,
  };
};

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "editor");
    const slides = await ctx.db
      .query("slides")
      .withIndex("by_order", (q) => q)
      .collect();

    return Promise.all(
      slides.map(async (slide) => {
        const mediaUrl = slide.storageId
          ? await ctx.storage.getUrl(slide.storageId)
          : null;

        return {
          ...slide,
          mediaType:
            slide.mediaType ??
            detectMediaTypeFromName(slide.videoUrl) ??
            (slide.storageId ? "video" : undefined),
          mediaName: slide.videoUrl ?? null,
          mediaUrl,
        };
      })
    );
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const slides = await ctx.db
      .query("slides")
      .withIndex("by_order", (q) => q)
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return Promise.all(
      slides.map(async (slide) => {
        const mediaUrl = slide.storageId
          ? await ctx.storage.getUrl(slide.storageId)
          : null;

        return {
          ...slide,
          mediaType:
            slide.mediaType ??
            detectMediaTypeFromName(slide.videoUrl) ??
            (slide.storageId ? "video" : undefined),
          mediaName: slide.videoUrl ?? null,
          mediaUrl,
        };
      })
    );
  },
});

export const listTravelGroups = query({
  args: {
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.includeInactive) await requireRole(ctx, "editor");
    const slides = await ctx.db
      .query("slides")
      .withIndex("by_order", (q) => q)
      .collect();

    const visibleSlides = args.includeInactive
      ? slides
      : slides.filter((slide) => slide.isActive);

    return Promise.all(
      visibleSlides.map((slide) => normalizeTravelGroup(ctx, slide))
    );
  },
});

export const getTravelGroupBySlug = query({
  // Inactive travel groups are visible only to editors (includeInactive).
  args: { slug: v.string(), includeInactive: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    if (args.includeInactive) await requireRole(ctx, "editor");
    const visible = (slide: Doc<"slides">) => args.includeInactive || slide.isActive;
    const byStoredSlug = await ctx.db
      .query("slides")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (byStoredSlug) {
      return visible(byStoredSlug) ? normalizeTravelGroup(ctx, byStoredSlug) : null;
    }

    const slides = await ctx.db.query("slides").collect();
    const byGeneratedSlug = slides.find(
      (slide) => slugify(slide.title) === args.slug
    );

    if (!byGeneratedSlug || !visible(byGeneratedSlug)) {
      return null;
    }

    return normalizeTravelGroup(ctx, byGeneratedSlug);
  },
});

export const upsert = mutation({
  args: {
    id: v.optional(v.id("slides")),
    title: v.string(),
    subtitle: v.string(),
    badge: v.optional(v.string()),
    copy: v.optional(v.string()),
    mediaType: v.optional(v.union(v.literal("video"), v.literal("image"))),
    videoUrl: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    order: v.number(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const viewer = await requireRole(ctx, "editor");
    await audit(ctx, viewer, { action: "slides.upsert", targetTable: "slides", targetId: args.id, summary: args.title });
    if (args.id) {
      await ctx.db.patch(args.id, {
        title: args.title,
        subtitle: args.subtitle,
        badge: args.badge,
        copy: args.copy,
        mediaType: args.mediaType,
        videoUrl: args.videoUrl,
        storageId: args.storageId,
        order: args.order,
        isActive: args.isActive,
      });
      return args.id;
    }

    return ctx.db.insert("slides", {
      title: args.title,
      subtitle: args.subtitle,
      badge: args.badge,
      copy: args.copy,
      mediaType: args.mediaType,
      videoUrl: args.videoUrl,
      storageId: args.storageId,
      order: args.order,
      isActive: args.isActive,
    });
  },
});

/** "1 dan", "21 noć", "3 dana", "5 noći" (Serbian count agreement). */
function serbianCount(count: number, one: string, other: string) {
  return count % 10 === 1 && count % 100 !== 11 ? one : other;
}

export const upsertTravelGroup = mutation({
  args: {
    id: v.optional(v.id("slides")),
    slug: v.string(),
    title: v.string(),
    description: v.string(),
    price: v.number(),
    currency: v.string(),
    nights: v.number(),
    days: v.number(),
    transport: v.union(
      v.literal("bus"),
      v.literal("plane"),
      v.literal("car"),
      v.literal("train"),
      v.literal("self")
    ),
    departureDate: v.string(),
    returnDate: v.string(),
    departureCity: v.string(),
    hotelInfo: v.optional(v.string()),
    depositPercentage: v.optional(v.number()),
    depositDeadline: v.optional(v.string()),
    itinerary: v.array(
      v.object({
        day: v.number(),
        date: v.string(),
        description: v.string(),
      })
    ),
    included: v.array(v.string()),
    notIncluded: v.array(v.string()),
    imageStorageIds: v.array(v.id("_storage")),
    detailMedia: v.optional(
      v.array(
        v.object({
          storageId: v.id("_storage"),
          mediaType: v.union(v.literal("video"), v.literal("image")),
          mediaName: v.optional(v.string()),
        })
      )
    ),
    heroMediaType: v.optional(v.union(v.literal("video"), v.literal("image"))),
    heroMediaStorageId: v.optional(v.id("_storage")),
    heroMediaName: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    isHero: v.optional(v.boolean()),
    heroIcon: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("upcoming"),
      v.literal("completed")
    ),
    featured: v.boolean(),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    const viewer = await requireRole(ctx, "editor");
    await audit(ctx, viewer, { action: "slides.upsertTravelGroup", targetTable: "slides", targetId: args.id, summary: args.title });
    const { id, ...data } = args;
    const durationBadge =
      data.days > 0 || data.nights > 0
        ? `${data.days} ${serbianCount(data.days, "dan", "dana")} / ${data.nights} ${serbianCount(data.nights, "noć", "noći")}`
        : undefined;
    const subtitle =
      [durationBadge, data.departureCity].filter(Boolean).join(" / ") ||
      data.description ||
      data.title;

    const payload = {
      ...data,
      subtitle,
      badge: durationBadge,
      copy: data.description,
      mediaType: data.heroMediaStorageId ? data.heroMediaType : undefined,
      videoUrl:
        data.heroMediaStorageId && data.heroMediaName
          ? data.heroMediaName
          : undefined,
      storageId: data.heroMediaStorageId,
      isActive: data.status !== "completed",
      updatedAt: Date.now(),
    };

    if (id) {
      await ctx.db.patch(id, payload);
      return id;
    }

    return ctx.db.insert("slides", payload);
  },
});

export const remove = mutation({
  args: { id: v.id("slides") },
  handler: async (ctx, args) => {
    const viewer = await requireRole(ctx, "editor");
    await audit(ctx, viewer, { action: "slides.remove", targetTable: "slides", targetId: args.id });
    await ctx.db.delete(args.id);
  },
});
