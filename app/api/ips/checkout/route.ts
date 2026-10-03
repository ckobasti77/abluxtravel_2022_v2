import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import {
  DEFAULT_IPS_PAYEE,
  buildIpsPayload,
  calculateIpsTotals,
  createIpsReference,
  normalizeSerbianAccount,
  sanitizeIpsText,
  type NbsEurRate,
} from "@/lib/ips-payment";

export const runtime = "nodejs";

const NBS_RATE_SOURCE_URL =
  "https://webappcenter.nbs.rs/ExchangeRateWebApp/ExchangeRate/CurrentMiddleRate";
const NBS_QR_GENERATE_URL = "https://nbs.rs/QRcode/api/qr/v1/generate/360?lang=sr_RS_Latn";

// The client sends only ids and quantities. Prices, titles and the payment
// reference are decided on the server; anything else in the body is ignored.
type CartItemRequest = {
  type: "trip" | "destination" | "offer" | "accommodation";
  id: string;
  quantity: number;
};

type CustomerRequest = {
  name: string;
  email: string;
  phone: string;
  note: string;
};

type RequestBody = {
  items?: unknown;
  customer?: unknown;
  website?: unknown;
};

type NbsQrResponse = {
  s?: {
    code?: number;
    desc?: string;
  };
  i?: string;
  t?: string;
  e?: string[];
};

const ITEM_TYPES = new Set(["trip", "destination", "offer", "accommodation"]);

const ORDER_ERRORS: Record<string, { message: string; status: number }> = {
  ITEM_UNAVAILABLE: {
    message: "Neka stavka više nije dostupna i uklonjena je iz korpe.",
    status: 409,
  },
  AMOUNT_MISMATCH: {
    message: "Cena se u međuvremenu promenila. Pokušajte ponovo.",
    status: 409,
  },
  RATE_LIMITED: {
    message: "Previše pokušaja. Pokušajte ponovo za nekoliko minuta.",
    status: 429,
  },
};

function jsonError(message: string, status = 400, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

function parseNbsDate(value: string) {
  const match = value.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (!match) return value;

  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function extractText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "\n")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16))
    )
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 10))
    )
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchNbsEurRate(): Promise<NbsEurRate> {
  const response = await fetch(NBS_RATE_SOURCE_URL, {
    cache: "no-store",
    headers: {
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(`NBS kursna lista nije dostupna (${response.status}).`);
  }

  const html = await response.text();
  const text = extractText(html);
  const eurMatch = text.match(/\bEUR\s+978\s+.+?\s+1\s+(\d{2,3},\d{4})\b/);
  const dateMatch = text.match(
    /(FORMIRANA NA DAN|ФОРМИРАНА НА ДАН)\s+(\d{1,2}\.\d{1,2}\.\d{4})/i
  );
  const listMatch = text.match(/KURSNA LISTA BR\.\s*(\d+)|КУРСНА ЛИСТА БР\.\s*(\d+)/i);

  if (!eurMatch) {
    throw new Error("Nije moguće pročitati EUR srednji kurs sa NBS kursne liste.");
  }

  const rate = Number(eurMatch[1].replace(",", "."));
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("NBS EUR srednji kurs nije ispravan.");
  }

  return {
    currency: "EUR",
    rate,
    rateDate: dateMatch ? parseNbsDate(dateMatch[2]) : new Date().toISOString().slice(0, 10),
    listNumber: listMatch?.[1] ?? listMatch?.[2],
    sourceUrl: NBS_RATE_SOURCE_URL,
  };
}

async function generateNbsQrImage(payload: string) {
  const response = await fetch(NBS_QR_GENERATE_URL, {
    method: "POST",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "text/plain; charset=utf-8",
    },
    body: payload,
  });

  const raw = await response.text();
  let data: NbsQrResponse;

  try {
    data = JSON.parse(raw) as NbsQrResponse;
  } catch {
    throw new Error("NBS generator nije vratio JSON odgovor.");
  }

  if (!response.ok || data.s?.code !== 0 || !data.i) {
    const details = data.e?.join(" ") || data.s?.desc || "Validacija IPS QR koda nije prošla.";
    throw new Error(details);
  }

  return {
    image: `data:image/png;base64,${data.i}`,
    validationCode: data.s.code,
    validationMessage: data.s.desc ?? "OK",
    normalizedPayload: data.t ?? payload,
  };
}

function validateItems(items: unknown): CartItemRequest[] {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Korpa je prazna.");
  }
  if (items.length > 10) {
    throw new Error("Korpa može imati najviše 10 stavki.");
  }

  return items.map((item) => {
    const value = item as Partial<CartItemRequest>;
    if (
      typeof value.id !== "string" ||
      typeof value.type !== "string" ||
      !ITEM_TYPES.has(value.type) ||
      typeof value.quantity !== "number"
    ) {
      throw new Error("Korpa sadrži stavku u neispravnom formatu.");
    }
    return { type: value.type, id: value.id.slice(0, 64), quantity: value.quantity };
  });
}

function validateCustomer(customer: unknown): CustomerRequest {
  const value = (customer ?? {}) as Partial<Record<keyof CustomerRequest, unknown>>;
  const text = (field: unknown, max: number) =>
    typeof field === "string" ? field.trim().slice(0, max) : "";
  const result = {
    name: text(value.name, 120),
    email: text(value.email, 160),
    phone: text(value.phone, 40),
    note: text(value.note, 1000),
  };
  if (result.name.length < 2 || (!result.email && !result.phone)) {
    throw new Error("Unesite ime i prezime i email ili telefon.");
  }
  return result;
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

// Hashed client IP for rate limiting; the raw IP is never stored.
function clientKey(request: Request, secret: string) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  return createHash("sha256").update(`${ip}:${secret}`).digest("hex").slice(0, 32);
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError("Zahtev nije dozvoljen.", 403);
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return jsonError("Zahtev za IPS plaćanje nije ispravan.");
  }

  // Honeypot: real visitors never fill this hidden field.
  if (typeof body.website === "string" && body.website.trim()) {
    return jsonError("Zahtev nije prihvaćen.");
  }

  const secret = process.env.ABLUX_SERVER_SECRET;
  if (!secret) {
    return jsonError("Plaćanje trenutno nije dostupno.", 500);
  }

  let items: CartItemRequest[];
  let customer: CustomerRequest;
  try {
    items = validateItems(body.items);
    customer = validateCustomer(body.customer);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Zahtev nije ispravan.");
  }

  try {
    const quote = await fetchQuery(api.orders.quote, { items });
    if (!quote.ok) {
      const known = ORDER_ERRORS[quote.error];
      return jsonError(known?.message ?? "Korpa nije ispravna.", known?.status ?? 400, {
        code: quote.error,
        invalidIds: quote.invalidIds,
      });
    }

    // Rate limits are consumed before NBS is contacted.
    const quota = await fetchMutation(api.orders.consumeCheckoutQuota, {
      secret,
      clientKey: clientKey(request, secret),
      contact: customer.email || customer.phone,
    });
    if (!quota.ok) {
      return jsonError(ORDER_ERRORS.RATE_LIMITED.message, 429, { code: "RATE_LIMITED" });
    }

    const lines = quote.lines;
    const needsEurRate = lines.some((line) => line.currency === "EUR");
    const eurRate = needsEurRate ? await fetchNbsEurRate() : undefined;
    const totals = calculateIpsTotals(lines, eurRate?.rate);
    if (totals.amountRsdCents <= 0) {
      throw new Error("Iznos za IPS plaćanje mora biti veći od nule.");
    }
    const reference = createIpsReference();
    const payeeAccount =
      process.env.NBS_IPS_PAYEE_ACCOUNT ||
      process.env.NEXT_PUBLIC_NBS_IPS_PAYEE_ACCOUNT ||
      DEFAULT_IPS_PAYEE.account;
    const payeeName =
      process.env.NBS_IPS_PAYEE_NAME ||
      process.env.NEXT_PUBLIC_NBS_IPS_PAYEE_NAME ||
      DEFAULT_IPS_PAYEE.name;
    const paymentCode =
      process.env.NBS_IPS_PAYMENT_CODE ||
      process.env.NEXT_PUBLIC_NBS_IPS_PAYMENT_CODE ||
      DEFAULT_IPS_PAYEE.paymentCode;
    const purpose = sanitizeIpsText(`Porudzbina ABLux ${reference.slice(-8)}`, 35);
    const payload = buildIpsPayload({
      account: payeeAccount,
      payeeName,
      amountRsdCents: totals.amountRsdCents,
      reference,
      paymentCode,
      purpose,
    });
    const qr = await generateNbsQrImage(payload);
    const safePayeeName = sanitizeIpsText(payeeName, 70);

    const order = await fetchMutation(
      api.orders.createIpsOrder,
      {
        secret,
        items,
        customer,
        website: "",
        ips: {
          reference,
          payload: qr.normalizedPayload,
          amountRsdCents: totals.amountRsdCents,
          exchangeRate: eurRate?.rate,
          exchangeRateDate: eurRate?.rateDate,
          payeeAccount: normalizeSerbianAccount(payeeAccount),
          payeeName: safePayeeName,
        },
      },
      { token: await convexAuthNextjsToken() }
    );
    if (!order.ok) {
      const known = ORDER_ERRORS[order.error];
      return jsonError(known?.message ?? "Porudžbina nije sačuvana.", known?.status ?? 400, {
        code: order.error,
        invalidIds: "invalidIds" in order ? order.invalidIds : undefined,
      });
    }

    return NextResponse.json(
      {
        orderId: order.orderId,
        reference,
        qrImage: qr.image,
        payload: qr.normalizedPayload,
        validation: {
          code: qr.validationCode,
          message: qr.validationMessage,
        },
        amountRsd: totals.amountRsd,
        amountRsdCents: totals.amountRsdCents,
        originalTotals: totals.originalTotals,
        lines: totals.lines,
        exchangeRate: eurRate ?? null,
        payee: {
          account: normalizeSerbianAccount(payeeAccount),
          displayAccount: payeeAccount,
          name: safePayeeName,
        },
        paymentCode,
        purpose,
        generatedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "IPS plaćanje nije moguće generisati.";
    const upstream = /NBS|Validacija|generator|kurs/i.test(message);
    return jsonError(
      upstream ? message : "IPS plaćanje trenutno nije moguće pripremiti.",
      upstream ? 502 : 500
    );
  }
}
