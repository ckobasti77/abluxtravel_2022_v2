"use client";

import CmsImage from "@/components/cms-image";
import { formatRsdDisplay } from "@/lib/ips-payment";
import { useCartStore } from "@/lib/store/use-cart-store";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Loader2,
  QrCode,
  ShieldCheck,
  MinusIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
} from "lucide-react";
import { Field, Input, Textarea } from "@/components/ui";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSitePreferences } from "./site-preferences-provider";

type CartDrawerProps = {
  open: boolean;
  onClose: () => void;
};

type CheckoutStep = "cart" | "details" | "payment";

type CustomerForm = {
  name: string;
  email: string;
  phone: string;
  note: string;
};

type IpsCheckoutResponse = {
  orderId: string;
  reference: string;
  qrImage: string;
  payload: string;
  validation: {
    code: number;
    message: string;
  };
  amountRsd: number;
  amountRsdCents: number;
  originalTotals: Record<string, number>;
  exchangeRate: {
    rate: number;
    rateDate: string;
    listNumber?: string;
    sourceUrl: string;
  } | null;
  payee: {
    account: string;
    displayAccount: string;
    name: string;
  };
  paymentCode: string;
  purpose: string;
  generatedAt: string;
};

type PaymentState = IpsCheckoutResponse;

type IpsCheckoutError = {
  error?: string;
  code?: string;
  invalidIds?: string[];
};

const initialCustomer: CustomerForm = {
  name: "",
  email: "",
  phone: "",
  note: "",
};

const optionalText = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

export default function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { dictionary, language } = useSitePreferences();
  const { items, removeItem, updateQuantity, clearCart } = useCartStore();
  const panelRef = useRef<HTMLDivElement>(null);
  // Honeypot value (hidden field); real visitors leave it empty.
  const [website, setWebsite] = useState("");
  const [step, setStep] = useState<CheckoutStep>("cart");
  const [customer, setCustomer] = useState<CustomerForm>(initialCustomer);
  const [payment, setPayment] = useState<PaymentState | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const locale = language === "sr" ? "sr-Latn-RS" : "en-US";
  const copy = useMemo(
    () =>
      language === "sr"
        ? {
            ipsTitle: "NBS IPS QR plaćanje",
            checkoutTitle: "Podaci za uplatu",
            paymentReady: "QR kod je spreman",
            continue: "Nastavi na IPS plaćanje",
            generate: "Generiši IPS QR kod",
            generating: "Pravimo QR kod…",
            back: "Nazad",
            buyerDetails: "Podaci za porudžbinu",
            buyerHint: "E-pošta i telefon služe da povežemo uplatu sa porudžbinom.",
            name: "Ime i prezime",
            email: "E-pošta",
            phone: "Telefon",
            note: "Napomena",
            notePlaceholder: "Broj putnika, željeni termin ili posebna napomena",
            cartTotal: "Ukupno u korpi",
            convertedByNbs:
              "EUR stavke se pri generisanju QR koda obračunavaju po zvaničnom srednjem kursu NBS.",
            scanTitle: "Skenirajte u m-banking aplikaciji",
            scanHint:
              "Aplikacija banke će otvoriti nalog za prenos. Uplatu potvrđujete svojim PIN-om, otiskom ili Face ID-jem.",
            rsdAmount: "Iznos za uplatu",
            reference: "Poziv na broj",
            account: "Račun primaoca",
            payee: "Primalac",
            rate: "Kurs EUR",
            rateDate: "Kursna lista",
            validation: "NBS validacija",
            copyPayload: "Kopiraj IPS zapis",
            copied: "Kopirano",
            finish: "Sačuvaj i zatvori",
            pending:
              "Porudžbina je zabeležena i čeka uplatu. Status uplate proveravamo po prilivu na račun.",
            mixedTotal: "Više valuta u korpi",
            contactRequired: "Unesite ime i prezime i e-poštu ili telefon.",
            decrease: "Smanji broj",
            increase: "Povećaj broj",
            qrAlt: "NBS IPS QR kod za plaćanje",
            itemsRemoved: "Neka stavka više nije dostupna i uklonjena je iz korpe.",
          }
        : {
            ipsTitle: "NBS IPS QR payment",
            checkoutTitle: "Checkout",
            paymentReady: "QR code is ready",
            continue: "Continue to IPS payment",
            generate: "Generate IPS QR code",
            generating: "Generating QR code…",
            back: "Back",
            buyerDetails: "Order details",
            buyerHint: "Email and phone help us match the transfer with your order.",
            name: "Full name",
            email: "Email",
            phone: "Phone",
            note: "Note",
            notePlaceholder: "Number of travelers, preferred date, or special note",
            cartTotal: "Cart total",
            convertedByNbs:
              "EUR items are converted when the QR code is generated using the official NBS middle rate.",
            scanTitle: "Scan in your mobile banking app",
            scanHint:
              "Your bank app will open a transfer order. Confirm the payment with your PIN, fingerprint, or Face ID.",
            rsdAmount: "Payment amount",
            reference: "Reference number",
            account: "Payee account",
            payee: "Payee",
            rate: "EUR rate",
            rateDate: "Rate list",
            validation: "NBS validation",
            copyPayload: "Copy IPS payload",
            copied: "Copied",
            finish: "Save and close",
            pending:
              "The order is recorded as pending. Payment status is checked after the transfer reaches the account.",
            mixedTotal: "Multiple currencies in cart",
            contactRequired: "Enter your full name and an email or phone number.",
            decrease: "Decrease quantity",
            increase: "Increase quantity",
            qrAlt: "NBS IPS QR code for payment",
            itemsRemoved: "An item is no longer available and was removed from the cart.",
          },
    [language]
  );

  const totalsByCurrency = useMemo(() => {
    return items.reduce<Record<string, number>>((totals, item) => {
      const currency = item.currency.trim().toUpperCase();
      totals[currency] = (totals[currency] ?? 0) + item.price * item.quantity;
      return totals;
    }, {});
  }, [items]);

  const formatPrice = useCallback((price: number, currency: string) => {
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(price);
    } catch {
      return `${price} ${currency}`;
    }
  }, [locale]);

  const totalLabel = useMemo(() => {
    const entries = Object.entries(totalsByCurrency);
    if (entries.length === 0) return formatPrice(0, "RSD");
    if (entries.length === 1) {
      const [currency, amount] = entries[0];
      return formatPrice(amount, currency);
    }
    return entries.map(([currency, amount]) => formatPrice(amount, currency)).join(" + ");
  }, [formatPrice, totalsByCurrency]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.setProperty("overflow", "hidden");
    } else {
      document.body.style.removeProperty("overflow");
    }
    return () => {
      document.body.style.removeProperty("overflow");
    };
  }, [open]);

  // An emptied cart returns to the first step (adjusted during render, not in an effect).
  if (items.length === 0 && (step !== "cart" || payment !== null || checkoutError !== null)) {
    setStep("cart");
    setPayment(null);
    setCheckoutError(null);
  }

  // Only ids and quantities are sent; the server prices everything.
  const cartItemsForCheckout = () =>
    items.map((item) => ({
      type: item.type,
      id: item.id,
      quantity: item.quantity,
    }));

  const handleGeneratePayment = async () => {
    if (items.length === 0 || isSubmitting) return;

    if (customer.name.trim().length < 2 || (!customer.email.trim() && !customer.phone.trim())) {
      setCheckoutError(copy.contactRequired);
      return;
    }

    setIsSubmitting(true);
    setCheckoutError(null);
    setCopied(false);

    try {
      const response = await fetch("/api/ips/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: cartItemsForCheckout(),
          customer: {
            name: customer.name.trim(),
            email: optionalText(customer.email) ?? "",
            phone: optionalText(customer.phone) ?? "",
            note: optionalText(customer.note) ?? "",
          },
          website,
        }),
      });
      const data = (await response.json()) as IpsCheckoutResponse & IpsCheckoutError;

      if (!response.ok || data.error) {
        if (data.code === "ITEM_UNAVAILABLE" && data.invalidIds?.length) {
          data.invalidIds.forEach((id) => removeItem(id));
          throw new Error(copy.itemsRemoved);
        }
        throw new Error(data.error || "IPS QR kod nije generisan.");
      }

      setPayment(data);
      setStep("payment");
    } catch (error) {
      setCheckoutError(
        error instanceof Error
          ? error.message
          : language === "sr"
            ? "Plaćanje trenutno nije moguće pripremiti."
            : "Payment cannot be prepared right now."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyPayload = async () => {
    if (!payment?.payload) return;

    try {
      await navigator.clipboard.writeText(payment.payload);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  const handleFinish = () => {
    clearCart();
    setCustomer(initialCustomer);
    setPayment(null);
    setStep("cart");
    onClose();
  };

  const handleClearCart = () => {
    clearCart();
    setCustomer(initialCustomer);
    setPayment(null);
    setStep("cart");
  };

  const updateCustomer = (field: keyof CustomerForm, value: string) => {
    setCustomer((current) => ({ ...current, [field]: value }));
  };

  if (typeof document === "undefined" || !open) return null;

  const title =
    step === "payment"
      ? copy.paymentReady
      : step === "details"
        ? copy.checkoutTitle
        : dictionary.cart.title;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div
        ref={panelRef}
        className="surface relative z-10 flex h-full w-full max-w-md flex-col shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            {step !== "cart" ? (
              <button
                type="button"
                onClick={() => {
                  setStep("cart");
                  setCheckoutError(null);
                }}
                aria-label={copy.back}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--line)] transition hover:bg-[var(--primary-soft)]"
              >
                <ArrowLeft size={16} />
              </button>
            ) : null}
            <div className="min-w-0">
              <h2 className="truncate font-heading text-lg font-bold">{title}</h2>
              {step !== "cart" ? (
                <p className="mt-0.5 truncate text-xs text-muted">{copy.ipsTitle}</p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={dictionary.cart.close}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-[var(--primary-soft)]"
          >
            <XIcon strokeWidth={1.5} size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted">{dictionary.cart.empty}</p>
          ) : step === "cart" ? (
            <ul className="space-y-4">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="surface-strong flex items-start gap-3 rounded-xl p-3"
                >
                  {item.imageUrl ? (
                    <CmsImage
                      src={item.imageUrl}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-14 w-14 shrink-0 rounded-lg bg-[var(--primary-soft)]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-tight">{item.title}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatPrice(item.price, item.currency)}
                    </p>

                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] text-xs transition hover:bg-[var(--primary-soft)]"
                        aria-label={copy.decrease}
                      >
                        <MinusIcon strokeWidth={1.5} size={14} />
                      </button>
                      <span className="min-w-[1.5rem] text-center text-sm font-semibold">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] text-xs transition hover:bg-[var(--primary-soft)]"
                        aria-label={copy.increase}
                      >
                        <PlusIcon strokeWidth={1.5} size={14} />
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition hover:text-[var(--ablux-brick)]"
                    aria-label={dictionary.cart.removeItem}
                    title={dictionary.cart.removeItem}
                  >
                    <TrashIcon strokeWidth={1.5} size={16} />
                  </button>
                </li>
              ))}
            </ul>
          ) : step === "details" ? (
            <div className="space-y-4">
              <section className="rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                    <QrCode size={20} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{copy.ipsTitle}</p>
                    <p className="mt-1 text-xs leading-5 text-muted">{copy.convertedByNbs}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-[var(--line)] px-3 py-2 text-sm">
                  <span className="text-muted">{copy.cartTotal}</span>
                  <span className="font-semibold">{totalLabel || copy.mixedTotal}</span>
                </div>
              </section>

              <section className="grid gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                <div>
                  <p className="text-sm font-semibold">{copy.buyerDetails}</p>
                  <p className="mt-1 text-xs leading-5 text-muted">{copy.buyerHint}</p>
                </div>
                <Field label={copy.name}>
                  <Input
                    value={customer.name}
                    onChange={(event) => updateCustomer("name", event.target.value)}
                    autoComplete="name"
                  />
                </Field>
                <Field label={copy.email}>
                  <Input
                    value={customer.email}
                    onChange={(event) => updateCustomer("email", event.target.value)}
                    type="email"
                    autoComplete="email"
                  />
                </Field>
                <Field label={copy.phone}>
                  <Input
                    value={customer.phone}
                    onChange={(event) => updateCustomer("phone", event.target.value)}
                    type="tel"
                    autoComplete="tel"
                  />
                </Field>
                <Field label={copy.note}>
                  <Textarea
                    value={customer.note}
                    onChange={(event) => updateCustomer("note", event.target.value)}
                    className="min-h-24 resize-none"
                    placeholder={copy.notePlaceholder}
                  />
                </Field>
                <div aria-hidden="true" className="form-honeypot">
                  <label>
                    Website
                    <input
                      type="text"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={website}
                      onChange={(event) => setWebsite(event.target.value)}
                    />
                  </label>
                </div>
              </section>

              {checkoutError ? (
                <p role="alert" className="rounded-xl border border-[var(--ablux-brick)] bg-[color-mix(in_srgb,var(--ablux-brick)_8%,transparent)] px-3 py-2 text-sm text-[var(--ablux-brick)]">
                  {checkoutError}
                </p>
              ) : null}
            </div>
          ) : payment ? (
            <div className="space-y-4">
              <section className="rounded-xl border border-[var(--line)] bg-white p-3 text-[var(--ablux-c-ink)] shadow-sm">
                <Image
                  src={payment.qrImage}
                  alt={copy.qrAlt}
                  width={288}
                  height={288}
                  unoptimized
                  className="mx-auto aspect-square w-full max-w-[288px] object-contain"
                />
                <p className="mt-2 text-center text-xs font-bold tracking-[0.16em]">
                  NBS IPS QR
                </p>
              </section>

              <section className="rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-muted">
                      {copy.rsdAmount}
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-[var(--primary)]">
                      {formatRsdDisplay(payment.amountRsdCents, locale)}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--ablux-teal)] bg-[var(--success-soft)] px-2 py-1 text-xs font-semibold text-[var(--ablux-teal-text)]">
                    <ShieldCheck size={14} />
                    {copy.validation}
                  </span>
                </div>

                <dl className="mt-4 grid gap-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted">{copy.reference}</dt>
                    <dd className="font-mono text-xs">{payment.reference}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted">{copy.account}</dt>
                    <dd className="text-right font-mono text-xs">{payment.payee.displayAccount}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted">{copy.payee}</dt>
                    <dd className="text-right text-xs font-semibold">{payment.payee.name}</dd>
                  </div>
                  {payment.exchangeRate ? (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-muted">{copy.rate}</dt>
                        <dd className="font-mono text-xs">
                          {payment.exchangeRate.rate.toFixed(4)} RSD
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-muted">{copy.rateDate}</dt>
                        <dd className="text-xs">
                          {payment.exchangeRate.rateDate}
                          {payment.exchangeRate.listNumber
                            ? ` / ${payment.exchangeRate.listNumber}`
                            : ""}
                        </dd>
                      </div>
                    </>
                  ) : null}
                </dl>
              </section>

              <section className="rounded-xl border border-[var(--ablux-teal)] bg-[var(--success-soft)] p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 shrink-0 text-[var(--ablux-teal-text)]" size={18} />
                  <div>
                    <p className="text-sm font-semibold">{copy.scanTitle}</p>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      {copy.scanHint}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-muted">
                      {copy.pending}
                    </p>
                  </div>
                </div>
              </section>

              <button
                type="button"
                onClick={handleCopyPayload}
                className="btn-secondary w-full !justify-center !gap-2 !py-2 !text-xs"
              >
                <Copy size={14} />
                {copied ? copy.copied : copy.copyPayload}
              </button>
            </div>
          ) : null}
        </div>

        {items.length > 0 && (
          <div className="space-y-3 border-t border-[var(--border)] px-5 py-4">
            {step === "cart" ? (
              <>
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>{dictionary.cart.total}</span>
                  <span>{totalLabel}</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setStep("details");
                    setCheckoutError(null);
                  }}
                  className="btn-primary w-full !justify-center !gap-2 !py-3 !text-sm"
                >
                  <QrCode size={16} />
                  {copy.continue}
                </button>

                <button
                  type="button"
                  onClick={handleClearCart}
                  className="btn-secondary w-full !justify-center !py-2 !text-xs"
                >
                  {dictionary.cart.clearCart}
                </button>
              </>
            ) : step === "details" ? (
              <div className="grid grid-cols-[0.42fr_0.58fr] gap-2">
                <button
                  type="button"
                  onClick={() => setStep("cart")}
                  className="btn-secondary !justify-center !py-3 !text-xs"
                >
                  {copy.back}
                </button>
                <button
                  type="button"
                  onClick={handleGeneratePayment}
                  disabled={isSubmitting}
                  className="btn-primary !justify-center !gap-2 !py-3 !text-xs disabled:cursor-not-allowed disabled:opacity-65"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={15} /> : <QrCode size={15} />}
                  {isSubmitting ? copy.generating : copy.generate}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="btn-primary w-full !justify-center !py-3 !text-sm"
              >
                {copy.finish}
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
