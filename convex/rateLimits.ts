import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { consumeRateLimit, type RateLimitResult } from "./lib/rateLimit";

// Lets actions (e.g. auth.signIn) consume a rate-limit counter.
export const consume = internalMutation({
  args: { key: v.string(), max: v.number(), windowMs: v.number() },
  handler: async (ctx, args): Promise<RateLimitResult> =>
    await consumeRateLimit(ctx, args.key, { max: args.max, windowMs: args.windowMs }),
});
