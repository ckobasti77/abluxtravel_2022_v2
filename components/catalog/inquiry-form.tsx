"use client";

import { CircleCheck, Send } from "lucide-react";
import { useId, useRef, useState, type FormEvent } from "react";
import type { CatalogCopy } from "../../lib/i18n-catalog";
import { Button, Field, Input, Select, Textarea } from "../ui";

export type InquiryDeparture = { value: string; label: string };

type InquiryFormProps = {
  cardSlug?: string;
  /** Topic of a general inquiry without an offer (e.g. "Rent a bus: autobus"); stored with the inquiry. */
  subject?: string;
  offerTitle?: string;
  departures: InquiryDeparture[];
  initialDeparture?: string;
  initialTravelers?: number;
  copy: CatalogCopy;
  language: "sr" | "en";
};

type Errors = Partial<Record<"fullName" | "phone" | "email" | "consent" | "form", string>>;

const PHONE_PATTERN = /^[0-9+()\-\s/]{6,40}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TRAVELERS = Array.from({ length: 20 }, (_, index) => index + 1);

/** "Pošalji upit": stored as an inquiry for the admin (no e-mail yet). */
export function InquiryForm({ cardSlug, subject, offerTitle, departures, initialDeparture, initialTravelers, copy, language }: InquiryFormProps) {
  const formId = useId().replace(/:/g, "");
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const validate = (data: FormData): Errors => {
    const next: Errors = {};
    const fullName = String(data.get("fullName") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    if (fullName.length < 2) next.fullName = copy.errorName;
    if (!PHONE_PATTERN.test(phone)) next.phone = copy.errorPhone;
    if (!EMAIL_PATTERN.test(email)) next.email = copy.errorEmail;
    if (data.get("consent") !== "on") next.consent = copy.errorConsent;
    return next;
  };

  const focusFirstError = (found: Errors) => {
    const order = ["fullName", "phone", "email", "consent"] as const;
    const first = order.find((key) => found[key]);
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const found = validate(data);
    setErrors(found);
    if (Object.keys(found).length) {
      focusFirstError(found);
      return;
    }
    setSending(true);
    try {
      const travelers = Number(data.get("travelers"));
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardSlug,
          subject,
          fullName: data.get("fullName"),
          phone: data.get("phone"),
          email: data.get("email"),
          travelers: Number.isInteger(travelers) && travelers > 0 ? travelers : undefined,
          preferredDeparture: data.get("preferredDeparture") || undefined,
          message: data.get("message") || undefined,
          consent: data.get("consent") === "on",
          website: data.get("website") || "",
          locale: language,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (response.ok && body.ok) {
        setSent(true);
        requestAnimationFrame(() => successRef.current?.focus());
        return;
      }
      setErrors({ form: body.error === "RATE_LIMITED" ? copy.errorRateLimited : copy.errorInvalid });
    } catch {
      setErrors({ form: copy.errorNetwork });
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="inq-success" ref={successRef} tabIndex={-1} role="status">
        <CircleCheck aria-hidden="true" strokeWidth={1.5} />
        <h3 className="inq-success__title">{copy.successTitle}</h3>
        <p>{copy.successBody}</p>
        <Button variant="secondary" onClick={() => setSent(false)}>
          {copy.successAgain}
        </Button>
      </div>
    );
  }

  return (
    <form ref={formRef} className="inq-form" onSubmit={onSubmit} noValidate aria-describedby={errors.form ? `${formId}-error` : undefined}>
      {offerTitle ? (
        <p className="inq-form__offer">
          <span>{copy.formOffer}:</span> <strong>{offerTitle}</strong>
        </p>
      ) : null}

      <Field label={copy.fieldName} required requiredLabel={copy.required} error={errors.fullName} id={`${formId}-name`}>
        <Input name="fullName" autoComplete="name" maxLength={120} required />
      </Field>
      <div className="inq-form__row">
        <Field label={copy.fieldPhone} required requiredLabel={copy.required} error={errors.phone} id={`${formId}-phone`}>
          <Input name="phone" type="tel" autoComplete="tel" inputMode="tel" maxLength={40} required />
        </Field>
        <Field label={copy.fieldEmail} required requiredLabel={copy.required} error={errors.email} id={`${formId}-email`}>
          <Input name="email" type="email" autoComplete="email" maxLength={160} required />
        </Field>
      </div>
      <div className="inq-form__row">
        <Field label={copy.fieldTravelers} id={`${formId}-travelers`}>
          <Select name="travelers" defaultValue={initialTravelers ? String(initialTravelers) : "2"}>
            {TRAVELERS.map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={copy.fieldDeparture} id={`${formId}-departure`}>
          {departures.length ? (
            <Select name="preferredDeparture" defaultValue={initialDeparture ?? departures[0]?.value ?? ""}>
              {departures.map((departure) => (
                <option key={departure.value} value={departure.value}>
                  {departure.label}
                </option>
              ))}
              <option value="">{copy.fieldDepartureOther}</option>
            </Select>
          ) : (
            // No fixed departures (general inquiry): free text such as "15–20. 6." or "jun".
            <Input name="preferredDeparture" maxLength={120} defaultValue={initialDeparture} />
          )}
        </Field>
      </div>
      <Field label={copy.fieldMessage} hint={copy.fieldMessageHint} id={`${formId}-message`}>
        <Textarea name="message" rows={4} maxLength={2000} />
      </Field>

      <div aria-hidden="true" className="form-honeypot">
        <label htmlFor={`${formId}-website`}>Website</label>
        <input id={`${formId}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="inq-form__consent">
        <label className="inq-check">
          <input
            name="consent"
            type="checkbox"
            required
            aria-invalid={errors.consent ? true : undefined}
            aria-describedby={errors.consent ? `${formId}-consent-error` : undefined}
          />
          <span>{copy.fieldConsent}</span>
        </label>
        {errors.consent ? (
          <p className="ui-field__error" id={`${formId}-consent-error`}>
            <span>{errors.consent}</span>
          </p>
        ) : null}
      </div>

      {errors.form ? (
        <p className="inq-form__error" id={`${formId}-error`} role="alert">
          {errors.form}
        </p>
      ) : null}

      <Button type="submit" block loading={sending} loadingLabel={copy.sending} icon={<Send aria-hidden="true" strokeWidth={1.75} />}>
        {copy.submit}
      </Button>
    </form>
  );
}
