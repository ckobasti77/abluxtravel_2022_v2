"use client";

// Contact and agency details shown in the footer, on /kontakt and in the
// quick actions. Empty fields are hidden on the site (no placeholder data).
import { useMutation, useQuery } from "convex/react";
import { KeyRound } from "lucide-react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { PageIntro, Panel, SkeletonRows } from "../../../components/admin/kit";
import { Button, ButtonLink, Field, Input, Textarea, useToast } from "../../../components/ui";
import { errorCode, formatWhen, useAdminT } from "../../../lib/admin/format";
import { errorMessage } from "../../../lib/admin/labels";

type Draft = {
  phone: string;
  email: string;
  address: string;
  workingHours: string;
  licenseNumber: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
};

const KEYS: (keyof Draft)[] = ["phone", "email", "address", "workingHours", "licenseNumber", "instagramUrl", "facebookUrl", "tiktokUrl", "youtubeUrl"];

export default function AdminPodesavanjaPage() {
  const { t } = useAdminT();
  const settings = useQuery(api.settings.get, {});
  if (settings === undefined) {
    return (
      <div className="adm-page">
        <Panel>
          <SkeletonRows rows={8} />
        </Panel>
      </div>
    );
  }
  const stored: Draft = {
    phone: settings?.phone ?? "",
    email: settings?.email ?? "",
    address: settings?.address ?? "",
    workingHours: settings?.workingHours ?? "",
    licenseNumber: settings?.licenseNumber ?? "",
    instagramUrl: settings?.instagramUrl ?? "",
    facebookUrl: settings?.facebookUrl ?? "",
    tiktokUrl: settings?.tiktokUrl ?? "",
    youtubeUrl: settings?.youtubeUrl ?? "",
  };
  return (
    <div className="adm-page">
      <PageIntro
        actions={
          <ButtonLink href="/admin/podesavanja/korisnici" size="sm" variant="secondary" iconStart={<KeyRound aria-hidden="true" strokeWidth={1.5} />}>
            {t("Korisnici i lozinka", "Users and password")}
          </ButtonLink>
        }
      >
        {t(
          "Ovi podaci se prikazuju u futeru, na stranici Kontakt i u brzim dugmićima na telefonu. Prazno polje se na sajtu ne prikazuje.",
          "These details appear in the footer, on the Contact page and in the quick buttons on phones. Empty fields are not shown on the site."
        )}
      </PageIntro>
      <SettingsForm key={settings?.updatedAt ?? 0} stored={stored} updatedAt={settings?.updatedAt ?? null} />
    </div>
  );
}

function SettingsForm({ stored, updatedAt }: { stored: Draft; updatedAt: number | null }) {
  const { t, language } = useAdminT();
  const toast = useToast();
  const upsert = useMutation(api.settings.upsert);
  const [draft, setDraft] = useState<Draft>(stored);
  const [busy, setBusy] = useState(false);
  const [urlError, setUrlError] = useState<keyof Draft | null>(null);

  const field = (key: keyof Draft) => ({
    value: draft[key],
    onChange: (event: { target: { value: string } }) => setDraft((current) => ({ ...current, [key]: event.target.value })),
  });
  const dirty = KEYS.some((key) => draft[key] !== stored[key]);

  const save = async () => {
    const badUrl = (["instagramUrl", "facebookUrl", "tiktokUrl", "youtubeUrl"] as const).find((key) => draft[key].trim() && !/^https:\/\/\S+\.\S+$/i.test(draft[key].trim()));
    if (badUrl) {
      setUrlError(badUrl);
      return;
    }
    setUrlError(null);
    setBusy(true);
    try {
      await upsert(draft);
      toast.show({
        message: t("Podaci su sačuvani i već se vide na sajtu.", "Details saved; they already show on the site."),
        action: { label: t("Poništi", "Undo"), onAction: () => void upsert(stored) },
      });
    } catch (error) {
      toast.show({ tone: "error", message: errorMessage(errorCode(error), language) });
    } finally {
      setBusy(false);
    }
  };

  const urlHint = t("Puna adresa profila, počinje sa https://", "Full profile address, starting with https://");
  const urlErrorText = t("Adresa mora početi sa https://.", "The address must start with https://.");

  return (
    <form
      className="adm-stack"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <Panel id="contact" title={t("Kontakt agencije", "Agency contact")} sub={updatedAt ? `${t("Poslednja izmena", "Last change")}: ${formatWhen(updatedAt, language)}` : t("Još nije uneto ništa; na sajtu piše „Kontakt podaci uskoro”.", "Nothing entered yet; the site shows \"Contact details coming soon\".")}>
        <div className="adm-form adm-form--2">
          <Field label={t("Telefon", "Phone")} hint={t("Npr. +381 11 …; koristi se i za dugme „Pozovite”.", "E.g. +381 11 …; also used for the call button.")}>
            <Input {...field("phone")} type="tel" autoComplete="off" maxLength={60} />
          </Field>
          <Field label={t("E-adresa", "E-mail")}>
            <Input {...field("email")} type="email" autoComplete="off" maxLength={160} />
          </Field>
          <Field label={t("Adresa poslovnice", "Office address")} className="adm-span">
            <Input {...field("address")} maxLength={200} />
          </Field>
          <Field label={t("Radno vreme", "Working hours")} hint={t("Npr. Pon–pet 09:00–17:00, sub 10:00–14:00", "E.g. Mon–Fri 09:00–17:00, Sat 10:00–14:00")} className="adm-span">
            <Textarea {...field("workingHours")} rows={2} maxLength={200} />
          </Field>
          <Field label={t("Broj licence (OTP)", "License number (OTP)")} hint={t("Prikazuje se u futeru kada je upisan.", "Shown in the footer when set.")}>
            <Input {...field("licenseNumber")} maxLength={80} />
          </Field>
        </div>
      </Panel>

      <Panel id="social" title={t("Društvene mreže", "Social links")}>
        <div className="adm-form adm-form--2">
          <Field label="Instagram" hint={urlHint} error={urlError === "instagramUrl" ? urlErrorText : undefined}>
            <Input {...field("instagramUrl")} type="url" placeholder="https://instagram.com/…" />
          </Field>
          <Field label="Facebook" hint={urlHint} error={urlError === "facebookUrl" ? urlErrorText : undefined}>
            <Input {...field("facebookUrl")} type="url" placeholder="https://facebook.com/…" />
          </Field>
          <Field label="TikTok" hint={urlHint} error={urlError === "tiktokUrl" ? urlErrorText : undefined}>
            <Input {...field("tiktokUrl")} type="url" placeholder="https://tiktok.com/@…" />
          </Field>
          <Field label="YouTube" hint={urlHint} error={urlError === "youtubeUrl" ? urlErrorText : undefined}>
            <Input {...field("youtubeUrl")} type="url" placeholder="https://youtube.com/@…" />
          </Field>
        </div>
      </Panel>

      <div className="adm-row">
        <Button type="submit" size="sm" loading={busy} loadingLabel={t("Čuvamo…", "Saving…")} disabled={!dirty}>
          {t("Sačuvaj podatke", "Save details")}
        </Button>
        {dirty ? (
          <Button type="button" size="sm" variant="secondary" onClick={() => setDraft(stored)}>
            {t("Vrati kako je bilo", "Revert")}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
