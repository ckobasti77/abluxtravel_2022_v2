// Partner registry seed and legacy status migration (internal, idempotent).
import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { PARTNERS } from "../../scraper/registry";

export const seedPartners = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let inserted = 0;
    let updated = 0;
    for (const partner of PARTNERS) {
      const existing = await ctx.db
        .query("sources")
        .withIndex("by_slug", (q) => q.eq("slug", partner.slug))
        .unique();
      const technical = {
        name: partner.name,
        number: partner.number,
        website: partner.website || undefined,
        logoPath: partner.logoPath,
        adapter: partner.family,
        kind: "partner" as const,
        syncEverySeconds: 86_400,
      };
      if (!existing) {
        await ctx.db.insert("sources", {
          slug: partner.slug,
          ...technical,
          status: partner.status,
          blockedReason: partner.blockedReason,
          isEnabled: true,
          autoPublish: true,
          organizerName: partner.organizer.name,
          organizerLicense: partner.organizer.license,
          defaultDepartureCity: partner.defaultDepartureCity,
          dailyRequestCap: partner.dailyRequestCap || undefined,
          notes: partner.notes,
          updatedAt: now,
        });
        inserted += 1;
        continue;
      }
      // Technical fields always follow the code; owner-edited fields only fill gaps.
      await ctx.db.patch(existing._id, {
        ...technical,
        status: ["planned", "connected", "syncing"].includes(existing.status) ? partner.status : existing.status,
        blockedReason: existing.blockedReason ?? partner.blockedReason,
        autoPublish: existing.autoPublish ?? true,
        organizerName: existing.organizerName ?? partner.organizer.name,
        organizerLicense: existing.organizerLicense ?? partner.organizer.license,
        defaultDepartureCity: existing.defaultDepartureCity ?? partner.defaultDepartureCity,
        dailyRequestCap: existing.dailyRequestCap ?? (partner.dailyRequestCap || undefined),
        notes: existing.notes ?? partner.notes,
        updatedAt: now,
      });
      updated += 1;
    }
    return { inserted, updated };
  },
});

export const migrateLegacySources = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("sources").collect();
    let changed = 0;
    for (const row of rows) {
      const map: Record<string, "active" | "paused" | undefined> = {
        planned: "paused",
        connected: "active",
        syncing: "active",
      };
      const next = map[row.status];
      if (next) {
        await ctx.db.patch(row._id, { status: next, updatedAt: Date.now() });
        changed += 1;
      }
    }
    return { checked: rows.length, changed };
  },
});

export const getPartnerBySlug = internalQuery({
  args: { slug: v.string() },
  handler: async (ctx, args) =>
    ctx.db
      .query("sources")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique(),
});
