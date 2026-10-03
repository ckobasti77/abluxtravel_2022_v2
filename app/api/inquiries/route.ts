import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export const runtime = "nodejs";

// Public inquiry form → Convex `inquiries.create` (server secret). The client IP
// is only used as a salted hash for rate limiting and is never stored.
function clientKey(request: Request, secret: string) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  return createHash("sha256").update(`inquiry:${ip}:${secret}`).digest("hex").slice(0, 32);
}

const text = (value: unknown, max: number) => (typeof value === "string" ? value.slice(0, max) : "");
const optionalText = (value: unknown, max: number) => {
  const result = text(value, max).trim();
  return result ? result : undefined;
};

export async function POST(request: Request) {
  const secret = process.env.ABLUX_SERVER_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "UNAVAILABLE" }, { status: 503 });

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object") throw new Error("body");
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });
  }

  const travelers = typeof body.travelers === "number" && Number.isInteger(body.travelers) ? body.travelers : undefined;
  try {
    const result = await fetchMutation(api.inquiries.create, {
      secret,
      cardSlug: optionalText(body.cardSlug, 120),
      subject: optionalText(body.subject, 160),
      fullName: text(body.fullName, 200),
      phone: text(body.phone, 60),
      email: text(body.email, 200),
      travelers,
      preferredDeparture: optionalText(body.preferredDeparture, 160),
      message: optionalText(body.message, 2400),
      consent: body.consent === true,
      website: text(body.website, 200),
      ipHash: clientKey(request, secret),
      locale: body.locale === "en" ? "en" : "sr",
    });
    if (result.ok) return NextResponse.json({ ok: true });
    return NextResponse.json(result, { status: result.error === "RATE_LIMITED" ? 429 : 400 });
  } catch {
    return NextResponse.json({ ok: false, error: "UNAVAILABLE" }, { status: 503 });
  }
}
