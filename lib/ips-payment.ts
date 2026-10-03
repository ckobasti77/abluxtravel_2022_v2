export type IpsCheckoutItem = {
  id: string;
  type: "trip" | "destination" | "offer" | "accommodation";
  title: string;
  price: number;
  currency: string;
  quantity: number;
  meta?: Record<string, string>;
};

export type NbsEurRate = {
  currency: "EUR";
  rate: number;
  rateDate: string;
  listNumber?: string;
  sourceUrl: string;
};

export type IpsCheckoutLine = {
  id: string;
  title: string;
  quantity: number;
  currency: string;
  originalAmount: number;
  rsdAmount: number;
};

export type IpsCheckoutTotals = {
  amountRsd: number;
  amountRsdCents: number;
  originalTotals: Record<string, number>;
  lines: IpsCheckoutLine[];
  requiresEurRate: boolean;
};

export const DEFAULT_IPS_PAYEE = {
  account: "205-0000000524900-86",
  name: "ABLUX-TRAVEL 2022 DOO BEOGRAD",
  paymentCode: "221",
};

const MAX_RSD_CENTS = 99_999_999_999_999;

export function createIpsReference() {
  const timePart = Date.now().toString().slice(-10);
  const random = new Uint32Array(1);
  globalThis.crypto.getRandomValues(random);
  const randomPart = (random[0] % 10_000).toString().padStart(4, "0");

  return `${timePart}${randomPart}`;
}

export function normalizeIpsReference(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 23);
  if (!digits) {
    throw new Error("IPS poziv na broj mora imati bar jednu cifru.");
  }

  return digits;
}

export function normalizeSerbianAccount(value: string) {
  const parts = value
    .trim()
    .split("-")
    .map((part) => part.replace(/\D/g, ""));

  if (parts.length === 3) {
    const [bank, middle, control] = parts;
    if (bank.length !== 3 || !middle || middle.length > 13 || control.length !== 2) {
      throw new Error("Broj računa primaoca nije u ispravnom formatu.");
    }

    return `${bank}${middle.padStart(13, "0")}${control}`;
  }

  const digits = value.replace(/\D/g, "");
  if (digits.length === 18) {
    return digits;
  }

  throw new Error("Broj računa primaoca mora imati 18 cifara.");
}

export function sanitizeIpsText(value: string, maxLength: number) {
  return value
    .normalize("NFC")
    .replace(/[|\r\n\t]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function formatIpsRsdAmount(amountRsdCents: number) {
  if (!Number.isSafeInteger(amountRsdCents) || amountRsdCents < 0) {
    throw new Error("Iznos za IPS plaćanje nije ispravan.");
  }

  if (amountRsdCents > MAX_RSD_CENTS) {
    throw new Error("Iznos za IPS plaćanje prelazi NBS limit.");
  }

  const dinars = Math.floor(amountRsdCents / 100);
  const para = amountRsdCents % 100;

  return `${dinars},${para.toString().padStart(2, "0")}`;
}

export function formatRsdDisplay(amountRsdCents: number, locale = "sr-Latn-RS") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "RSD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountRsdCents / 100);
}

export function normalizeCurrency(value: string) {
  return value.trim().toUpperCase();
}

export function calculateIpsTotals(items: IpsCheckoutItem[], eurRate?: number): IpsCheckoutTotals {
  const originalTotals: Record<string, number> = {};
  const lines: IpsCheckoutLine[] = [];
  let amountRsdCents = 0;
  let requiresEurRate = false;

  for (const item of items) {
    const currency = normalizeCurrency(item.currency);
    const quantity = Math.trunc(item.quantity);
    const unitCents = Math.round(item.price * 100);

    if (!Number.isFinite(item.price) || unitCents < 0 || quantity < 1) {
      throw new Error("Korpa sadrži stavku sa neispravnom cenom ili količinom.");
    }

    const originalCents = unitCents * quantity;
    const originalAmount = originalCents / 100;
    originalTotals[currency] = (originalTotals[currency] ?? 0) + originalAmount;

    let lineRsdCents: number;
    if (currency === "RSD") {
      lineRsdCents = originalCents;
    } else if (currency === "EUR") {
      requiresEurRate = true;
      if (!eurRate || !Number.isFinite(eurRate) || eurRate <= 0) {
        throw new Error("NBS srednji kurs EUR nije dostupan.");
      }
      lineRsdCents = Math.round(originalCents * eurRate);
    } else {
      throw new Error(`Valuta ${currency} nije podržana za IPS plaćanje.`);
    }

    amountRsdCents += lineRsdCents;
    lines.push({
      id: item.id,
      title: item.title,
      quantity,
      currency,
      originalAmount,
      rsdAmount: lineRsdCents / 100,
    });
  }

  return {
    amountRsd: amountRsdCents / 100,
    amountRsdCents,
    originalTotals,
    lines,
    requiresEurRate,
  };
}

export function buildIpsPayload({
  account,
  payeeName,
  amountRsdCents,
  reference,
  paymentCode = DEFAULT_IPS_PAYEE.paymentCode,
  purpose,
}: {
  account: string;
  payeeName: string;
  amountRsdCents: number;
  reference: string;
  paymentCode?: string;
  purpose?: string;
}) {
  const normalizedAccount = normalizeSerbianAccount(account);
  const normalizedReference = normalizeIpsReference(reference);
  const safePayeeName = sanitizeIpsText(payeeName, 70);
  const safePurpose = sanitizeIpsText(
    purpose || `Porudzbina ABLux ${normalizedReference.slice(-8)}`,
    35
  );
  const safePaymentCode = paymentCode.replace(/\D/g, "");

  if (!safePayeeName) {
    throw new Error("Naziv primaoca plaćanja je obavezan.");
  }

  if (!/^[12]\d{2}$/.test(safePaymentCode)) {
    throw new Error("Šifra plaćanja mora imati tri cifre i počinjati sa 1 ili 2.");
  }

  const fields = [
    ["K", "PR"],
    ["V", "01"],
    ["C", "1"],
    ["R", normalizedAccount],
    ["N", safePayeeName],
    ["I", `RSD${formatIpsRsdAmount(amountRsdCents)}`],
    ["SF", safePaymentCode],
    ["S", safePurpose],
    ["RO", `00${normalizedReference}`],
  ];

  return fields.map(([tag, value]) => `${tag}:${value}`).join("|");
}
