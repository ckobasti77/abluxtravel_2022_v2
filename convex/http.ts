/**
 * Convex HTTP actions — Convex Auth routes, Stripe webhook (standby) and the
 * Partner Sync relay endpoints (/sync/relay/start|batch|finish).
 *
 * When Stripe is live (Phase 2), this receives checkout.session.completed
 * events, verifies the signature, and marks the order as "paid".
 *
 * Required environment variables:
 *   STRIPE_WEBHOOK_SECRET — Webhook signing secret from Stripe dashboard
 */

import { httpRouter } from "convex/server";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { isRelayAuthorized } from "./lib/relaySecret";

const http = httpRouter();

// Convex Auth: /.well-known/openid-configuration and /.well-known/jwks.json
auth.addHttpRoutes(http);

http.route({
  path: "/stripe-webhook",
  method: "POST",
  handler: httpAction(async (_ctx, request) => {
    // ------------------------------------------------------------------
    // TODO (Phase 2): Uncomment when Stripe is live.
    //
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    //   apiVersion: "2024-04-10",
    // });
    //
    // const signature = request.headers.get("stripe-signature");
    // if (!signature) {
    //   return new Response("Missing stripe-signature header", { status: 400 });
    // }
    //
    // const body = await request.text();
    //
    // let event: Stripe.Event;
    // try {
    //   event = stripe.webhooks.constructEvent(
    //     body,
    //     signature,
    //     process.env.STRIPE_WEBHOOK_SECRET!
    //   );
    // } catch (err) {
    //   console.error("Webhook signature verification failed:", err);
    //   return new Response("Webhook signature verification failed", {
    //     status: 400,
    //   });
    // }
    //
    // if (event.type === "checkout.session.completed") {
    //   const session = event.data.object as Stripe.Checkout.Session;
    //   const orderId = session.metadata?.orderId;
    //
    //   if (orderId) {
    //     await ctx.runMutation(internal.orders.updateStatus, {
    //       id: orderId as Id<"orders">,
    //       status: "paid",
    //       stripeSessionId: session.id,
    //     });
    //   }
    // }
    //
    // return new Response("OK", { status: 200 });
    // ------------------------------------------------------------------

    // Standby: acknowledge webhook but do nothing
    void request;
    return new Response("Webhook received (standby mode)", { status: 200 });
  }),
});

// ---- Partner Sync relay (CLI on a whitelisted machine) ----------------------
// Authorization: Bearer <SYNC_RELAY_SECRET>; anything else → 401. Bodies ≤ 6 MB.
const RELAY_MAX_BODY = 6 * 1024 * 1024;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function relayRoute(handler: (ctx: Parameters<Parameters<typeof httpAction>[0]>[0], body: Record<string, unknown>) => Promise<unknown>) {
  return httpAction(async (ctx, request) => {
    if (!isRelayAuthorized(request.headers.get("authorization"))) return json(401, { error: "UNAUTHORIZED" });
    const declared = Number(request.headers.get("content-length") ?? 0);
    if (declared > RELAY_MAX_BODY) return json(413, { error: "TOO_LARGE" });
    const text = await request.text();
    if (text.length > RELAY_MAX_BODY) return json(413, { error: "TOO_LARGE" });
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(text) as Record<string, unknown>;
    } catch {
      return json(400, { error: "INVALID_JSON" });
    }
    try {
      return json(200, await handler(ctx, body));
    } catch (error) {
      const code = error instanceof ConvexError ? String(error.data) : "INVALID_REQUEST";
      return json(code === "INVALID_REQUEST" ? 400 : 409, { error: code });
    }
  });
}

http.route({
  path: "/sync/relay/start",
  method: "POST",
  handler: relayRoute((ctx, body) =>
    ctx.runMutation(internal.sync.relay.relayStart, {
      partnerSlug: String(body.partnerSlug ?? ""),
      allowBlocked: body.allowBlocked === true,
      maxRequests: typeof body.maxRequests === "number" ? body.maxRequests : undefined,
    })
  ),
});

http.route({
  path: "/sync/relay/batch",
  method: "POST",
  handler: relayRoute((ctx, body) => ctx.runMutation(internal.sync.relay.relayBatch, body as never)),
});

http.route({
  path: "/sync/relay/finish",
  method: "POST",
  handler: relayRoute((ctx, body) => ctx.runMutation(internal.sync.relay.relayFinish, body as never)),
});

export default http;
