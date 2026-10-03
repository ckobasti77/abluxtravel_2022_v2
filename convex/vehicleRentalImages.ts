import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/access";
import { audit } from "./lib/audit";

const vehicleRentalKey = v.union(v.literal("bus"), v.literal("luxuryVan"));
const VEHICLE_RENTAL_KEYS = ["bus", "luxuryVan"] as const;

const getVehicleRentalRecord = async (
  ctx: QueryCtx | MutationCtx,
  key: (typeof VEHICLE_RENTAL_KEYS)[number]
) => {
  return await ctx.db
    .query("vehicleRentalImages")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
};

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await Promise.all(
      VEHICLE_RENTAL_KEYS.map(async (key) => {
        const record = await getVehicleRentalRecord(ctx, key);
        const additionalStorageIds = record?.additionalStorageIds ?? [];
        const imageUrl = record ? await ctx.storage.getUrl(record.storageId) : null;
        const additionalImageUrls = await Promise.all(
          additionalStorageIds.map(async (storageId) => {
            return await ctx.storage.getUrl(storageId);
          })
        );

        return {
          key,
          storageId: record?.storageId ?? null,
          imageUrl,
          additionalStorageIds,
          additionalImageUrls,
          imageUrls: [imageUrl, ...additionalImageUrls].filter(Boolean),
          updatedAt: record?.updatedAt ?? null,
        };
      })
    );
  },
});

export const upsert = mutation({
  args: {
    key: vehicleRentalKey,
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const viewer = await requireRole(ctx, "editor");
    await audit(ctx, viewer, { action: "vehicleRentalImages.upsert", targetTable: "vehicleRentalImages", targetId: args.key });
    const existing = await getVehicleRentalRecord(ctx, args.key);
    const updatedAt = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        storageId: args.storageId,
        updatedAt,
      });

      if (existing.storageId !== args.storageId) {
        await ctx.storage.delete(existing.storageId);
      }

      return existing._id;
    }

    return await ctx.db.insert("vehicleRentalImages", {
      key: args.key,
      storageId: args.storageId,
      updatedAt,
    });
  },
});

export const addAdditional = mutation({
  args: {
    key: vehicleRentalKey,
    storageIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const viewer = await requireRole(ctx, "editor");
    await audit(ctx, viewer, { action: "vehicleRentalImages.addAdditional", targetTable: "vehicleRentalImages", targetId: args.key });
    const existing = await getVehicleRentalRecord(ctx, args.key);

    if (!existing) {
      throw new Error("Save the main image before adding gallery images.");
    }

    const current = existing.additionalStorageIds ?? [];
    const next = [...current, ...args.storageIds];

    await ctx.db.patch(existing._id, {
      additionalStorageIds: next,
      updatedAt: Date.now(),
    });

    return next;
  },
});

export const removeAdditional = mutation({
  args: {
    key: vehicleRentalKey,
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const viewer = await requireRole(ctx, "editor");
    await audit(ctx, viewer, { action: "vehicleRentalImages.removeAdditional", targetTable: "vehicleRentalImages", targetId: args.key });
    const existing = await getVehicleRentalRecord(ctx, args.key);

    if (!existing) {
      return null;
    }

    const next = (existing.additionalStorageIds ?? []).filter(
      (storageId) => storageId !== args.storageId
    );

    await ctx.db.patch(existing._id, {
      additionalStorageIds: next,
      updatedAt: Date.now(),
    });
    await ctx.storage.delete(args.storageId);

    return args.storageId;
  },
});

export const remove = mutation({
  args: { key: vehicleRentalKey },
  handler: async (ctx, args) => {
    const viewer = await requireRole(ctx, "editor");
    await audit(ctx, viewer, { action: "vehicleRentalImages.remove", targetTable: "vehicleRentalImages", targetId: args.key });
    const existing = await getVehicleRentalRecord(ctx, args.key);

    if (!existing) {
      return null;
    }

    await ctx.db.delete(existing._id);
    await ctx.storage.delete(existing.storageId);
    await Promise.all(
      (existing.additionalStorageIds ?? []).map(async (storageId) => {
        await ctx.storage.delete(storageId);
      })
    );

    return existing._id;
  },
});

// Step 18 (CLI only, DEV): upload URL and a non-destructive swap of a vehicle's
// photos. The previous storage files are kept and returned so the swap can be undone.
export const generateUploadUrlInternal = internalMutation({
  args: {},
  handler: async (ctx) => await ctx.storage.generateUploadUrl(),
});

export const replaceInternal = internalMutation({
  args: {
    key: vehicleRentalKey,
    storageId: v.id("_storage"),
    additionalStorageIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const existing = await getVehicleRentalRecord(ctx, args.key);
    const previous = existing ? { storageId: existing.storageId, additionalStorageIds: existing.additionalStorageIds ?? [] } : null;
    const fields = { storageId: args.storageId, additionalStorageIds: args.additionalStorageIds, updatedAt: Date.now() };
    if (existing) await ctx.db.patch(existing._id, fields);
    else await ctx.db.insert("vehicleRentalImages", { key: args.key, ...fields });
    return { key: args.key, previous };
  },
});
