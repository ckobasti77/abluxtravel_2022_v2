import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/access";
import { audit } from "./lib/audit";
import { syncTripCard } from "./lib/catalogProjection";

export const list = query({
  args: {
    status: v.optional(
      v.union(v.literal("active"), v.literal("upcoming"), v.literal("completed"))
    ),
    featuredOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let trips;

    if (args.status) {
      trips = await ctx.db
        .query("trips")
        .withIndex("by_status_order", (q) => q.eq("status", args.status!))
        .collect();
    } else if (args.featuredOnly) {
      trips = await ctx.db
        .query("trips")
        .withIndex("by_featured", (q) => q.eq("featured", true))
        .collect();
    } else {
      trips = await ctx.db.query("trips").collect();
    }

    trips.sort((a, b) => a.order - b.order);

    return Promise.all(
      trips.map(async (trip) => {
        const destinations = await ctx.db
          .query("destinations")
          .withIndex("by_trip_order", (q) => q.eq("tripId", trip._id))
          .collect();
        const activeDestinations = destinations.filter((item) => item.isActive);
        const lowestDestination = activeDestinations.reduce<
          (typeof activeDestinations)[number] | null
        >(
          (lowest, item) =>
            !lowest || item.price < lowest.price ? item : lowest,
          null,
        );

        return {
          ...trip,
          destinationCount: activeDestinations.length,
          subagencyDestinationCount: activeDestinations.filter(
            (item) => item.offerType === "subagency",
          ).length,
          lowestDestinationPrice: lowestDestination?.price,
          lowestDestinationCurrency: lowestDestination?.currency,
          heroMediaUrl: trip.heroMediaStorageId
            ? await ctx.storage.getUrl(trip.heroMediaStorageId)
            : null,
          detailMedia: await Promise.all(
            (trip.detailMedia ??
              trip.imageStorageIds.map((storageId) => ({
                storageId,
                mediaType: "image" as const,
              }))).map(async (media) => ({
              ...media,
              url: (await ctx.storage.getUrl(media.storageId)) ?? "",
            }))
          ),
          imageUrls: await Promise.all(
            trip.imageStorageIds.map(async (id) => {
              const url = await ctx.storage.getUrl(id);
              return url ?? "";
            })
          ),
        };
      })
    );
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const trip = await ctx.db
      .query("trips")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!trip) return null;

    const imageUrls = await Promise.all(
      trip.imageStorageIds.map(async (id) => {
        const url = await ctx.storage.getUrl(id);
        return url ?? "";
      })
    );
    const heroMediaUrl = trip.heroMediaStorageId
      ? await ctx.storage.getUrl(trip.heroMediaStorageId)
      : null;
    const detailMedia = await Promise.all(
      (trip.detailMedia ??
        trip.imageStorageIds.map((storageId) => ({
          storageId,
          mediaType: "image" as const,
        }))).map(async (media) => ({
        ...media,
        url: (await ctx.storage.getUrl(media.storageId)) ?? "",
      }))
    );

    return { ...trip, heroMediaUrl, detailMedia, imageUrls };
  },
});

export const upsert = mutation({
  args: {
    id: v.optional(v.id("trips")),
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
    status: v.union(
      v.literal("active"),
      v.literal("upcoming"),
      v.literal("completed")
    ),
    categoryId: v.optional(v.id("categories")),
    isHero: v.optional(v.boolean()),
    heroIcon: v.optional(v.string()),
    featured: v.boolean(),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    const viewer = await requireRole(ctx, "editor");
    await audit(ctx, viewer, { action: "trips.upsert", targetTable: "trips", targetId: args.id, summary: args.title });
    const { id, ...data } = args;

    // If marking as hero, unset isHero on other trips
    if (data.isHero) {
      const others = await ctx.db.query("trips").collect();
      for (const trip of others) {
        if (trip.isHero && trip._id !== id) {
          await ctx.db.patch(trip._id, { isHero: false, heroIcon: undefined });
        }
      }
    }

    const payload = { ...data, updatedAt: Date.now() };

    const tripId = id ?? (await ctx.db.insert("trips", payload));
    if (id) await ctx.db.patch(id, payload);
    await syncTripCard(ctx, tripId);
    return tripId;
  },
});

export const remove = mutation({
  args: { id: v.id("trips") },
  handler: async (ctx, args) => {
    const viewer = await requireRole(ctx, "editor");
    await audit(ctx, viewer, { action: "trips.remove", targetTable: "trips", targetId: args.id });
    await ctx.db.delete(args.id);
    await syncTripCard(ctx, args.id);
  },
});
