/**
 * Stripe integration — Convex Node.js actions.
 *
 * Required environment variables (set in Convex dashboard):
 *   STRIPE_SECRET_KEY     — Stripe secret key (sk_live_... or sk_test_...)
 *   STRIPE_WEBHOOK_SECRET — Webhook signing secret (whsec_...)
 *   SITE_URL              — Public URL of the site (e.g. https://abluxtravel2022.rs)
 *
 * Client-side env variable (in .env.local):
 *   NEXT_PUBLIC_STRIPE_LIVE=false  — Set to "true" to enable real Stripe checkout
 *
 * Phase 1 (Standby Mode):
 *   When NEXT_PUBLIC_STRIPE_LIVE !== "true", the client-side checkout handler
 *   does NOT call this action. Instead, it calls convex/orders.create directly
 *   and shows a toast message.
 *
 * Phase 2 (Live):
 *   The client calls this action to create a Stripe Checkout Session, then
 *   redirects to Stripe. The webhook (convex/http.ts) confirms the payment
 *   and updates the order status.
 */

import { internalAction } from "./_generated/server";
import { v } from "convex/values";

// Internal while Stripe is in standby. When it goes live it must take only an
// orderId and read the amounts from the database, never from the client.
export const createCheckoutSession = internalAction({
  args: {
    orderId: v.id("orders"),
    items: v.array(
      v.object({
        title: v.string(),
        price: v.number(),
        currency: v.string(),
        quantity: v.number(),
      })
    ),
    customerEmail: v.optional(v.string()),
  },
  handler: async () => {
    // ------------------------------------------------------------------
    // TODO (Phase 2): Uncomment when Stripe is live.
    //
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    //   apiVersion: "2024-04-10",
    // });
    //
    // const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
    //
    // const session = await stripe.checkout.sessions.create({
    //   mode: "payment",
    //   customer_email: args.customerEmail,
    //   line_items: args.items.map((item) => ({
    //     price_data: {
    //       currency: item.currency.toLowerCase(),
    //       product_data: { name: item.title },
    //       unit_amount: Math.round(item.price * 100),
    //     },
    //     quantity: item.quantity,
    //   })),
    //   metadata: { orderId: args.orderId },
    //   success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    //   cancel_url: `${siteUrl}/checkout/cancel`,
    // });
    //
    // // Persist the Stripe session ID on the order
    // await ctx.runMutation(internal.orders.updateStatus, {
    //   id: args.orderId,
    //   status: "confirmed",
    //   stripeSessionId: session.id,
    // });
    //
    // return { url: session.url };
    // ------------------------------------------------------------------

    // Standby: return null so the client knows not to redirect
    return { url: null };
  },
});
