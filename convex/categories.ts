import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/access";
import { audit } from "./lib/audit";

const categoryType = v.union(
  v.literal("arrangement"),
  v.literal("religious")
);

export const list = query({
  args: { type: v.optional(categoryType) },
  handler: async (ctx, args) => {
    let categories;
    if (args.type) {
      categories = await ctx.db
        .query("categories")
        .withIndex("by_type_active", (q) =>
          q.eq("type", args.type!).eq("isActive", true)
        )
        .collect();
    } else {
      categories = await ctx.db
        .query("categories")
        .collect();
      categories = categories.filter((c) => c.isActive);
    }

    const withCounts = await Promise.all(
      categories.map(async (cat) => {
        let itemCount = 0;
        if (cat.type === "arrangement") {
          const trips = await ctx.db
            .query("trips")
            .withIndex("by_category", (q) => q.eq("categoryId", cat._id))
            .collect();
          itemCount = trips.filter((t) => t.status === "active").length;
        } else {
          const offers = await ctx.db
            .query("offers")
            .withIndex("by_category", (q) => q.eq("categoryId", cat._id))
            .collect();
          itemCount = offers.filter((o) => o.isActive).length;
        }
        return { ...cat, itemCount };
      })
    );

    withCounts.sort((a, b) => b.itemCount - a.itemCount || a.order - b.order);
    return withCounts;
  },
});

export const listAll = query({
  args: { type: v.optional(categoryType) },
  handler: async (ctx, args) => {
    await requireRole(ctx, "editor");
    let categories = await ctx.db.query("categories").collect();
    if (args.type) {
      categories = categories.filter((c) => c.type === args.type);
    }

    const withCounts = await Promise.all(
      categories.map(async (cat) => {
        let itemCount = 0;
        if (cat.type === "arrangement") {
          const trips = await ctx.db
            .query("trips")
            .withIndex("by_category", (q) => q.eq("categoryId", cat._id))
            .collect();
          itemCount = trips.filter((t) => t.status === "active").length;
        } else {
          const offers = await ctx.db
            .query("offers")
            .withIndex("by_category", (q) => q.eq("categoryId", cat._id))
            .collect();
          itemCount = offers.filter((o) => o.isActive).length;
        }
        return { ...cat, itemCount };
      })
    );

    withCounts.sort((a, b) => b.itemCount - a.itemCount || a.order - b.order);
    return withCounts;
  },
});

export const heroData = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db.query("categories").collect();
    const active = categories.filter((c) => c.isActive);

    const mainArrangement = active.find(
      (c) => c.type === "arrangement" && c.isMain && c.mainIcon
    ) ?? null;

    const mainReligious = active.find(
      (c) => c.type === "religious" && c.isMain && c.mainIcon
    ) ?? null;

    const trips = await ctx.db.query("trips").collect();
    const heroTrip = trips.find((t) => t.isHero && t.heroIcon && t.status === "active") ?? null;

    return {
      heroTrip: heroTrip
        ? { slug: heroTrip.slug, title: heroTrip.title, icon: heroTrip.heroIcon! }
        : null,
      arrangement: mainArrangement
        ? { ...mainArrangement, mainIcon: mainArrangement.mainIcon! }
        : null,
      religious: mainReligious
        ? { ...mainReligious, mainIcon: mainReligious.mainIcon! }
        : null,
    };
  },
});

export const upsert = mutation({
  args: {
    id: v.optional(v.id("categories")),
    name: v.object({ sr: v.string(), en: v.string() }),
    slug: v.string(),
    type: categoryType,
    isMain: v.optional(v.boolean()),
    mainIcon: v.optional(v.string()),
    isActive: v.boolean(),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    const viewer = await requireRole(ctx, "editor");
    await audit(ctx, viewer, { action: "categories.upsert", targetTable: "categories", targetId: args.id, summary: args.slug });
    const { id, ...data } = args;

    // If marking as main, unset isMain on other categories of same type
    if (data.isMain) {
      const others = await ctx.db
        .query("categories")
        .withIndex("by_type", (q) => q.eq("type", data.type))
        .collect();
      for (const cat of others) {
        if (cat.isMain && cat._id !== id) {
          await ctx.db.patch(cat._id, { isMain: false, mainIcon: undefined });
        }
      }
    }

    const payload = { ...data, updatedAt: Date.now() };

    if (id) {
      await ctx.db.patch(id, payload);
      return id;
    }
    return ctx.db.insert("categories", payload);
  },
});

export const remove = mutation({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    const viewer = await requireRole(ctx, "editor");
    await audit(ctx, viewer, { action: "categories.remove", targetTable: "categories", targetId: args.id });
    // Unset categoryId on trips that reference this category
    const trips = await ctx.db
      .query("trips")
      .withIndex("by_category", (q) => q.eq("categoryId", args.id))
      .collect();
    for (const trip of trips) {
      await ctx.db.patch(trip._id, { categoryId: undefined });
    }

    const offers = await ctx.db
      .query("offers")
      .withIndex("by_category", (q) => q.eq("categoryId", args.id))
      .collect();
    for (const offer of offers) {
      await ctx.db.patch(offer._id, { categoryId: undefined });
    }

    await ctx.db.delete(args.id);
  },
});
