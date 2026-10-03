import type { MutationCtx } from "../_generated/server";
import { HOUR } from "./constants";

export type RateLimit = { max: number; windowMs: number };

export const RATE_LIMITS = {
  signupGlobal: { max: 30, windowMs: HOUR },
  legacyLogin: { max: 10, windowMs: HOUR },
  orderGlobal: { max: 60, windowMs: HOUR },
  orderIp: { max: 10, windowMs: HOUR },
  orderContact: { max: 5, windowMs: HOUR },
  // For public inquiries (step 10).
  inquiryGlobal: { max: 100, windowMs: HOUR },
  inquiryIp: { max: 10, windowMs: HOUR },
  inquiryEmail: { max: 5, windowMs: HOUR },
} satisfies Record<string, RateLimit>;

export type RateLimitResult = { ok: true } | { ok: false; retryAfterMs: number };

// Fixed-window counter. Never throws: callers must return the failure instead
// of throwing afterwards, otherwise the increment is rolled back with the
// mutation. Keys derived from emails/phones must be hashed (sha256Hex).
export async function consumeRateLimit(
  ctx: MutationCtx,
  key: string,
  limit: RateLimit
): Promise<RateLimitResult> {
  const now = Date.now();
  const row = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();

  if (!row || row.windowStart + limit.windowMs <= now) {
    if (row) await ctx.db.patch(row._id, { windowStart: now, count: 1 });
    else await ctx.db.insert("rateLimits", { key, windowStart: now, count: 1 });
    return { ok: true };
  }

  if (row.count >= limit.max) {
    return { ok: false, retryAfterMs: row.windowStart + limit.windowMs - now };
  }

  await ctx.db.patch(row._id, { count: row.count + 1 });
  return { ok: true };
}
