"use client";

// "Partneri i uvoz": 17 partner cards with status lights, "Pokreni sada" with
// the cycle rule (one manual run until the next 06:00), per-partner settings,
// and the run history with readable log lines.
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ExternalLink, FileUp, Play, Plus, Square, Trash } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { errorCode, formatCount, formatDuration, formatRunDuration, formatTime, formatWhen, useAdminT } from "../../../lib/admin/format";
import { errorMessage, PARTNER_STATUS, partnerLight, pick, RUN_STATUS, TRIGGER_LABEL } from "../../../lib/admin/labels";
import { TRAVEL_TYPES } from "../../../lib/search/travel-types";
import { useSession } from "../../../lib/use-session";
import { Button, ButtonLink, EmptyState, Field, Input, Select, StatusDot, Tabs, Textarea, useToast } from "../../ui";
import { Notice, PageIntro, Panel, Sheet, SkeletonRows, Switch, Thumb, useConfirm, useNow } from "../kit";
import { serbianPlural } from "@/lib/catalog/format";

function useParamsState() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };
  return { params, set };
}

function hostOf(url?: string) {
  if (!url) return "";
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function PartnersScreen() {
  const { t } = useAdminT();
  const { params, set } = useParamsState();
  const partners = useQuery(api.partners.adminList, {});
  const tab = params.get("prikaz") === "istorija" ? "history" : "cards";
  const openSlug = params.get("partner");
  const openRun = params.get("uvoz");

  return (
    <div className="adm-page">
      <PageIntro
        actions={
          <ButtonLink href="/admin/partneri/rucni-unos" size="sm" variant="secondary" iconStart={<FileUp aria-hidden="true" strokeWidth={1.5} />}>
            {t("Ručni unos (Holiday Plus KM)", "Manual entry (Holiday Plus KM)")}
          </ButtonLink>
        }
      >
        {t(
          "Ponude partnera se uvoze automatski svako jutro u 06:00. Ovde vidite stanje svakog partnera, možete jednom pokrenuti uvoz ručno i podesiti organizatora, proviziju i kontakt.",
          "Partner offers are imported automatically every morning at 06:00. Here you see each partner's status, can run the import once by hand and set the organizer, commission and contact."
        )}
      </PageIntro>

      <SyncBar autoConfirm={params.get("pokreni") === "1"} onAutoConfirmDone={() => set({ pokreni: null })} />

      <Tabs
        label={t("Prikaz", "View")}
        value={tab}
        onChange={(id) => set({ prikaz: id === "history" ? "istorija" : null })}
        items={[
          {
            id: "cards",
            label: t("Partneri", "Partners"),
            content:
              partners === undefined ? (
                <Panel flush>
                  <SkeletonRows rows={8} />
                </Panel>
              ) : (
                <div className="adm-partners">
                  {partners.map((partner) => (
                    <PartnerCard key={partner.slug} partner={partner} onOpen={() => set({ partner: partner.slug })} />
                  ))}
                </div>
              ),
          },
          {
            id: "history",
            label: t("Istorija uvoza", "Import history"),
            content: <RunHistory onOpen={(id) => set({ uvoz: id })} partners={partners ?? []} />,
          },
        ]}
      />

      <Sheet open={Boolean(openSlug)} onClose={() => set({ partner: null })} title={partners?.find((partner) => partner.slug === openSlug)?.name ?? t("Partner", "Partner")} wide>
        {openSlug ? <PartnerDetail slug={openSlug} /> : null}
      </Sheet>
      <Sheet open={Boolean(openRun)} onClose={() => set({ uvoz: null })} title={t("Uvoz", "Import")} wide>
        {openRun ? <RunDetail runId={openRun} partners={partners ?? []} /> : null}
      </Sheet>
    </div>
  );
}

// ---------------------------------------------------------------- sync bar

function SyncBar({ autoConfirm, onAutoConfirmDone }: { autoConfirm: boolean; onAutoConfirmDone: () => void }) {
  const { t, language } = useAdminT();
  const toast = useToast();
  const now = useNow(15_000);
  const status = useQuery(api.syncAdmin.getSyncStatus, {});
  const partners = useQuery(api.partners.adminList, {});
  const requestRun = useMutation(api.syncAdmin.requestManualRun);
  const cancelRun = useMutation(api.syncAdmin.cancelRun);
  const [confirm, confirmDialog] = useConfirm();
  const [busy, setBusy] = useState(false);
  const askedRef = useRef(false);

  const start = async () => {
    const ok = await confirm({
      title: t("Pokrenuti uvoz sada?", "Run the import now?"),
      body: t(
        "Uvoz čita ponude svih aktivnih partnera i traje do pola sata. Ručno se može pokrenuti jednom do sledećeg automatskog uvoza u 06:00. Sajt radi normalno i tokom uvoza.",
        "The import reads the offers of all active partners and takes up to half an hour. It can be run by hand once until the next automatic import at 06:00. The site keeps working during the import."
      ),
      confirmLabel: t("Pokreni uvoz", "Run import"),
      tone: "primary",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await requestRun({});
      toast.show({ message: t("Uvoz je pokrenut. Napredak pratite ovde.", "The import has started. Follow the progress here.") });
    } catch (error) {
      toast.show({ tone: "error", message: errorMessage(errorCode(error), language) });
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!autoConfirm || askedRef.current || status === undefined) return;
    askedRef.current = true;
    onAutoConfirmDone();
    // One-shot: ?pokreni=1 opens the confirm dialog once the status has loaded.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (status.manual.available) void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConfirm, status]);

  const stop = async (runId: string) => {
    const ok = await confirm({
      title: t("Prekinuti uvoz?", "Stop the import?"),
      body: t(
        "Partneri koji su već obrađeni ostaju uvezeni. Ostali se preskaču i nijedna ponuda se ne skida. Ručni uvoz u ovom ciklusu ostaje iskorišćen.",
        "Partners already processed stay imported. The rest are skipped and no offer is removed. The manual run for this cycle stays used."
      ),
      confirmLabel: t("Prekini uvoz", "Stop import"),
    });
    if (!ok) return;
    try {
      await cancelRun({ runId });
      toast.show({ message: t("Uvoz se zaustavlja posle trenutnog paketa.", "The import stops after the current batch.") });
    } catch (error) {
      toast.show({ tone: "error", message: errorMessage(errorCode(error), language) });
    }
  };

  if (status === undefined) {
    return (
      <div className="adm-sync" aria-busy="true">
        <SkeletonRows rows={2} />
      </div>
    );
  }

  const active = status.activeRun;
  const lockedUntil = status.manual.lockedUntil;
  const nextAuto = status.nextAutoRunAt;
  const reason = status.manual.reason;

  return (
    <>
      <section className="adm-sync" aria-live="polite" aria-labelledby="sync-title">
        <div className="adm-sync__text">
          <h2 className="adm-sync__title" id="sync-title">
            {active ? (
              <StatusDot status="progress" label={t("Uvoz je u toku", "Import running")} />
            ) : status.lastRun ? (
              <>
                {t("Poslednji uvoz", "Last import")}: {formatWhen(status.lastRun.startedAt, language, now)} ·{" "}
                {pick(RUN_STATUS[status.lastRun.status] ?? RUN_STATUS.ok, language)}
              </>
            ) : (
              t("Uvoz još nije pokretan", "No import has run yet")
            )}
          </h2>
          <p className="adm-sync__meta">
            {status.cronEnabled
              ? `${t("Sledeći automatski uvoz", "Next automatic import")}: ${formatWhen(nextAuto, language, now)} · ${t("za", "in")} ${formatDuration(nextAuto - now, language)}`
              : t("Automatski uvoz u 06:00 je isključen; uvoz se pokreće samo ručno.", "The automatic 06:00 import is off; imports run only by hand.")}
          </p>
          {!active && status.lastRun?.finishedAt ? (
            <p className="adm-sync__meta">
              {pick(TRIGGER_LABEL[status.lastRun.trigger] ?? TRIGGER_LABEL.cli, language)} · {t("trajanje", "duration")} {formatRunDuration(status.lastRun.finishedAt - status.lastRun.startedAt)}
              {status.lastRun.totals
                ? ` · ${t(`${status.lastRun.totals.created} ${serbianPlural(status.lastRun.totals.created, "nova", "nove", "novih")}, ${status.lastRun.totals.updated} ${serbianPlural(status.lastRun.totals.updated, "izmenjena", "izmenjene", "izmenjenih")}, ${status.lastRun.totals.removed} ${serbianPlural(status.lastRun.totals.removed, "skinuta", "skinute", "skinutih")}`, `${status.lastRun.totals.created} new, ${status.lastRun.totals.updated} changed, ${status.lastRun.totals.removed} removed`)}`
                : ""}
            </p>
          ) : null}
          {!active && status.manual.lastManualRunAt ? (
            <p className="adm-sync__meta">
              {t("Poslednji ručni uvoz", "Last manual import")}: {formatWhen(status.manual.lastManualRunAt, language, now)}
              {status.manual.lastManualByName ? ` · ${status.manual.lastManualByName}` : ""}
            </p>
          ) : null}
        </div>
        <div className="adm-stack" style={{ gap: "0.35rem", justifyItems: "start" }}>
          {active ? (
            <Button variant="secondary" size="sm" onClick={() => void stop(active.id)} iconStart={<Square aria-hidden="true" strokeWidth={1.5} />}>
              {t("Prekini uvoz", "Stop import")}
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void start()}
              disabled={!status.manual.available}
              loading={busy}
              loadingLabel={t("Pokrećemo…", "Starting…")}
              iconStart={<Play aria-hidden="true" strokeWidth={1.5} />}
              aria-describedby="sync-lock"
            >
              {t("Pokreni sada", "Run now")}
            </Button>
          )}
          {!active && !status.manual.available ? (
            <span className="adm-hint" id="sync-lock" style={{ margin: 0 }}>
              {reason === "running"
                ? t("Uvoz je u toku.", "An import is running.")
                : lockedUntil
                  ? t(
                      `Ručni uvoz je iskorišćen. Sledeće automatsko pokretanje u ${formatTime(lockedUntil)} · za ${formatDuration(lockedUntil - now, "sr")}`,
                      `Manual run used. Next automatic run at ${formatTime(lockedUntil)} · in ${formatDuration(lockedUntil - now, "en")}`
                    )
                  : t("Ručni uvoz trenutno nije dostupan.", "Manual run is not available right now.")}
            </span>
          ) : null}
        </div>
        {active ? (
          <ul className="adm-progress">
            {active.items.map((item) => {
              const run = RUN_STATUS[item.status] ?? RUN_STATUS.running;
              return (
                <li key={item.partnerSlug}>
                  <span className="adm-strong">{partners?.find((partner) => partner.slug === item.partnerSlug)?.name ?? item.partnerSlug}</span>
                  <span className="adm-row">
                    <span className="adm-muted tabular">
                      {t(`${item.processed} obrađeno · ${item.requestsUsed} ${serbianPlural(item.requestsUsed, "zahtev", "zahteva", "zahteva")}`, `${item.processed} processed · ${item.requestsUsed} requests`)}
                    </span>
                    <StatusDot status={run.status} label={pick(run, language)} />
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>
      {confirmDialog}
    </>
  );
}

// ---------------------------------------------------------------- cards

type PartnerRow = FunctionReturnType<typeof api.partners.adminList>[number];

function PartnerCard({ partner, onOpen }: { partner: PartnerRow; onOpen: () => void }) {
  const { t, language } = useAdminT();
  const toast = useToast();
  const updateSettings = useMutation(api.partners.updateSettings);
  const light = partnerLight(partner);
  const run = partner.lastRun;

  const setEnabled = async (next: boolean) => {
    try {
      await updateSettings({ slug: partner.slug, patch: { isEnabled: next } });
      toast.show({
        message: next ? t(`${partner.name}: ponude su ponovo na sajtu.`, `${partner.name}: offers are back on the site.`) : t(`${partner.name}: ponude su sklonjene sa sajta.`, `${partner.name}: offers removed from the site.`),
        action: { label: t("Poništi", "Undo"), onAction: () => void updateSettings({ slug: partner.slug, patch: { isEnabled: !next } }) },
      });
    } catch (error) {
      toast.show({ tone: "error", message: errorMessage(errorCode(error), language) });
    }
  };

  return (
    <article className="adm-partner" aria-labelledby={`partner-${partner.slug}`}>
      <div className="adm-partner__head">
        {partner.logoPath ? <Thumb className="adm-partner__logo" src={partner.logoPath} width={44} height={44} /> : null}
        <div style={{ minWidth: 0 }}>
          <h3 className="adm-partner__name" id={`partner-${partner.slug}`}>
            {partner.name}
          </h3>
          <span className="adm-partner__site">{hostOf(partner.website) || (partner.status === "manual" ? t("bez sajta, ručni unos", "no website, manual entry") : "")}</span>
        </div>
      </div>
      <StatusDot status={light.status} label={pick(light, language)} chip />
      <p className="adm-partner__numbers">
        <span>
          <strong>{formatCount(partner.counts.active)}</strong> {t(serbianPlural(partner.counts.active, "aktivna", "aktivne", "aktivnih"), "active")}
        </span>
        <span>
          <strong>{formatCount(partner.counts.public)}</strong> {t("na sajtu", "on site")}
        </span>
        <span>
          <strong>{formatCount(partner.counts.total)}</strong> {t("ukupno", "total")}
        </span>
      </p>
      {partner.status === "blocked" ? (
        <p className="adm-partner__run">
          {partner.blockedReason ||
            t(
              "Sajt partnera blokira automatsko preuzimanje. Potrebna je dozvola (whitelist IP adrese) ili feed.",
              "The partner's site blocks automatic fetching. A whitelist or a feed is needed."
            )}
        </p>
      ) : partner.status === "manual" ? (
        <p className="adm-partner__run">{t("Ponude se unose ručno iz cenovnika (PDF, Excel ili fotografija).", "Offers are entered by hand from the price list (PDF, Excel or photo).")}</p>
      ) : run ? (
        <p className="adm-partner__run">
          {formatWhen(run.at, language)}
          {run.durationMs ? ` · ${formatRunDuration(run.durationMs)}` : ""}
          {typeof run.requests === "number" ? ` · ${t(`${run.requests} ${serbianPlural(run.requests, "zahtev", "zahteva", "zahteva")}`, `${run.requests} requests`)}` : ""}
          {run.message ? (
            <>
              <br />
              {run.message}
            </>
          ) : null}
        </p>
      ) : (
        <p className="adm-partner__run">{t("Još nije bilo uvoza.", "No import yet.")}</p>
      )}
      <div className="adm-partner__actions">
        <Switch label={t("Na sajtu", "On the site")} checked={partner.isEnabled} onChange={(next) => void setEnabled(next)} />
        {partner.status === "manual" ? (
          <ButtonLink size="sm" variant="secondary" href={`/admin/partneri/rucni-unos?partner=${partner.slug}`}>
            {t("Ručni unos", "Manual entry")}
          </ButtonLink>
        ) : null}
        <Button size="sm" variant="secondary" onClick={onOpen}>
          {t("Detalji i podešavanja", "Details and settings")}
        </Button>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------- partner detail

type MapRow = { match: string; travelType: string };

function PartnerDetail({ slug }: { slug: string }) {
  const data = useQuery(api.partners.adminGet, { slug });
  if (data === undefined) return <SkeletonRows rows={10} />;
  return <PartnerDetailBody key={`${slug}-${data.partner.updatedAt}`} data={data} />;
}

type PartnerData = FunctionReturnType<typeof api.partners.adminGet>;

function PartnerDetailBody({ data }: { data: PartnerData }) {
  const { t, language } = useAdminT();
  const toast = useToast();
  const session = useSession();
  const updateSettings = useMutation(api.partners.updateSettings);
  const setStatus = useMutation(api.partners.setStatus);
  const [confirm, confirmDialog] = useConfirm();
  const partner = data.partner;
  const light = partnerLight({ isEnabled: partner.isEnabled, status: partner.status, lastRun: partner.lastRun });

  const initial = {
    organizerName: partner.organizerName ?? "",
    organizerLicense: partner.organizerLicense ?? "",
    termsUrl: partner.termsUrl ?? "",
    commissionPercent: partner.commissionPercent === undefined ? "" : String(partner.commissionPercent),
    contactName: partner.contactName ?? "",
    contactEmail: partner.contactEmail ?? "",
    contactPhone: partner.contactPhone ?? "",
    notes: partner.notes ?? "",
  };
  const [form, setForm] = useState(initial);
  const [autoPublish, setAutoPublish] = useState(partner.autoPublish ?? true);
  const [map, setMap] = useState<MapRow[]>(partner.categoryMap ?? []);
  const [busy, setBusy] = useState(false);

  const field = (key: keyof typeof initial) => ({
    value: form[key],
    onChange: (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value })),
  });

  const dirty =
    JSON.stringify(form) !== JSON.stringify(initial) || autoPublish !== (partner.autoPublish ?? true) || JSON.stringify(map) !== JSON.stringify(partner.categoryMap ?? []);

  const save = async () => {
    const commission = form.commissionPercent.trim() ? Number(form.commissionPercent.replace(",", ".")) : null;
    if (commission !== null && !(commission >= 0 && commission <= 100)) {
      toast.show({ tone: "error", message: errorMessage("INVALID_COMMISSION", language) });
      return;
    }
    setBusy(true);
    const text = (value: string) => (value.trim() ? value.trim() : null);
    try {
      await updateSettings({
        slug: partner.slug,
        patch: {
          autoPublish,
          categoryMap: map.filter((row) => row.match.trim()),
          commissionPercent: commission,
          organizerName: text(form.organizerName),
          organizerLicense: text(form.organizerLicense),
          termsUrl: text(form.termsUrl),
          contactName: text(form.contactName),
          contactEmail: text(form.contactEmail),
          contactPhone: text(form.contactPhone),
          notes: text(form.notes),
        },
      });
      toast.show({ message: t("Podešavanja partnera su sačuvana.", "Partner settings saved.") });
    } catch (error) {
      toast.show({ tone: "error", message: errorMessage(errorCode(error), language) });
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (next: "active" | "paused" | "blocked") => {
    const label = pick(PARTNER_STATUS[next], language);
    const ok = await confirm({
      title: t(`Promeniti status u „${label}”?`, `Change status to "${label}"?`),
      body:
        next === "paused"
          ? t("Pauziran partner se preskače pri uvozu; njegove ponude ostaju na sajtu dok ne isteknu.", "A paused partner is skipped by imports; its offers stay on the site until they expire.")
          : next === "blocked"
            ? t("Partner se preskače dok ne dobijemo dozvolu ili feed.", "The partner is skipped until we get permission or a feed.")
            : t("Partner ulazi u sledeći uvoz.", "The partner joins the next import."),
      confirmLabel: t("Promeni status", "Change status"),
      tone: "primary",
    });
    if (!ok) return;
    try {
      await setStatus({ slug: partner.slug, status: next });
      toast.show({ message: t("Status je promenjen.", "Status changed.") });
    } catch (error) {
      toast.show({ tone: "error", message: errorMessage(errorCode(error), language) });
    }
  };

  return (
    <>
      <section className="adm-stack" style={{ gap: "0.5rem" }}>
        <div className="adm-row">
          <StatusDot status={light.status} label={pick(light, language)} chip />
          {partner.website ? (
            <a className="adm-link" href={partner.website} target="_blank" rel="noopener noreferrer">
              {hostOf(partner.website)} <ExternalLink aria-hidden="true" width={14} height={14} style={{ display: "inline", verticalAlign: "-2px" }} />
            </a>
          ) : null}
          <ButtonLink size="sm" variant="secondary" href={`/admin/ponude?partner=${partner.slug}`}>
            {t("Ponude ovog partnera", "This partner's offers")}
          </ButtonLink>
        </div>
        {partner.status === "blocked" ? (
          <Notice>
            <p>{partner.blockedReason || t("Čeka dozvolu (whitelist/feed).", "Waiting for permission (whitelist/feed).")}</p>
          </Notice>
        ) : partner.lastRun?.message ? (
          <p className="adm-hint" style={{ margin: 0 }}>
            {t("Poslednji uvoz", "Last import")}: {formatWhen(partner.lastRun.at, language)} · {partner.lastRun.message}
          </p>
        ) : null}
        {session?.isOwner && partner.status !== "manual" ? (
          <Field
            label={t("Status partnera (vlasnik)", "Partner status (owner)")}
            hint={partner.liveFetchAllowed ? undefined : t("Automatsko preuzimanje nije dozvoljeno dok partner ne odobri pristup.", "Automatic fetching is not allowed until the partner approves access.")}
          >
            <Select value={partner.status} onChange={(event) => void changeStatus(event.target.value as "active" | "paused" | "blocked")}>
              <option value="active" disabled={!partner.liveFetchAllowed}>
                {pick(PARTNER_STATUS.active, language)}
              </option>
              <option value="paused">{pick(PARTNER_STATUS.paused, language)}</option>
              <option value="blocked">{pick(PARTNER_STATUS.blocked, language)}</option>
            </Select>
          </Field>
        ) : null}
      </section>

      <section className="adm-stack">
        <p className="adm-section-title" style={{ margin: 0 }}>
          {t("Podešavanja", "Settings")}
        </p>
        <Switch
          label={t("Automatski objavi nove ponude", "Publish new offers automatically")}
          checked={autoPublish}
          onChange={setAutoPublish}
        />
        <p className="adm-hint" style={{ marginTop: "-0.5rem" }}>
          {t("Isključeno: nove ponude čekaju da ih objavite u Ponudama.", "Off: new offers wait until you publish them under Offers.")}
        </p>
        <div className="adm-form adm-form--2">
          <Field label={t("Organizator (naziv na sajtu)", "Organizer (name on the site)")} hint={t(`Prazno: ${partner.name}`, `Empty: ${partner.name}`)}>
            <Input {...field("organizerName")} maxLength={120} />
          </Field>
          <Field label={t("Licenca organizatora", "Organizer license")} hint={t("Npr. OTP 123/2022, kategorija A", "E.g. OTP 123/2022, category A")}>
            <Input {...field("organizerLicense")} maxLength={120} />
          </Field>
          <Field label={t("Opšti uslovi (adresa)", "General terms (address)")} className="adm-span">
            <Input {...field("termsUrl")} type="url" placeholder="https://" maxLength={300} />
          </Field>
          <Field label={t("Provizija (%)", "Commission (%)")} hint={t("Vidi samo osoblje.", "Staff only.")}>
            <Input {...field("commissionPercent")} inputMode="decimal" />
          </Field>
          <Field label={t("Kontakt osoba", "Contact person")}>
            <Input {...field("contactName")} maxLength={120} />
          </Field>
          <Field label={t("E-adresa", "E-mail")}>
            <Input {...field("contactEmail")} type="email" maxLength={160} />
          </Field>
          <Field label={t("Telefon", "Phone")}>
            <Input {...field("contactPhone")} type="tel" maxLength={40} />
          </Field>
          <Field label={t("Beleške", "Notes")} className="adm-span">
            <Textarea {...field("notes")} rows={3} maxLength={2000} />
          </Field>
        </div>

        <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
          <legend className="ui-field__label">{t("Mapiranje kategorija", "Category mapping")}</legend>
          <p className="adm-hint">
            {t(
              "Kada naziv kategorije kod partnera sadrži dati tekst, ponuda dobija izabranu vrstu putovanja. Npr. „Zimovanje” → Zimovanje.",
              "When the partner's category name contains the text, the offer gets the chosen travel type."
            )}
          </p>
          <div className="adm-stack" style={{ gap: "0.5rem", marginTop: "0.5rem" }}>
            {map.map((row, index) => (
              <div key={index} className="adm-row" style={{ flexWrap: "nowrap", alignItems: "flex-end" }}>
                <Field label={t("Tekst kod partnera", "Partner text")} className="adm-grow">
                  <Input value={row.match} maxLength={80} onChange={(event) => setMap((current) => current.map((item, i) => (i === index ? { ...item, match: event.target.value } : item)))} />
                </Field>
                <Field label={t("Vrsta putovanja", "Travel type")} className="adm-grow">
                  <Select value={row.travelType} onChange={(event) => setMap((current) => current.map((item, i) => (i === index ? { ...item, travelType: event.target.value } : item)))}>
                    {TRAVEL_TYPES.map((type) => (
                      <option key={type.slug} value={type.slug}>
                        {pick(type.label, language)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Button size="sm" variant="secondary" aria-label={t("Ukloni red", "Remove row")} onClick={() => setMap((current) => current.filter((_, i) => i !== index))}>
                  <Trash aria-hidden="true" strokeWidth={1.5} />
                </Button>
              </div>
            ))}
            <div>
              <Button size="sm" variant="text" onClick={() => setMap((current) => [...current, { match: "", travelType: TRAVEL_TYPES[0].slug }])} iconStart={<Plus aria-hidden="true" strokeWidth={1.5} />}>
                {t("Dodaj pravilo", "Add rule")}
              </Button>
            </div>
          </div>
        </fieldset>

        <div className="adm-row">
          <Button size="sm" onClick={save} loading={busy} loadingLabel={t("Čuvamo…", "Saving…")} disabled={!dirty}>
            {t("Sačuvaj podešavanja", "Save settings")}
          </Button>
        </div>
      </section>

      <section>
        <p className="adm-section-title">{t("Poslednji uvozi", "Recent imports")}</p>
        {data.runs.length === 0 ? (
          <p className="adm-hint">{t("Za ovog partnera još nije bilo uvoza.", "No imports for this partner yet.")}</p>
        ) : (
          <div className="adm-stack">
            {data.runs.map((run) => (
              <RunItem key={run._id} item={{ ...run, partnerSlug: partner.slug }} />
            ))}
          </div>
        )}
      </section>
      {confirmDialog}
    </>
  );
}

// ---------------------------------------------------------------- run history

type RunItemData = {
  _id: string;
  partnerSlug: string;
  status: string;
  startedAt: number;
  finishedAt?: number;
  requestsUsed: number;
  discovered: number;
  created: number;
  updated: number;
  removed: number;
  expired: number;
  parseErrors: number;
  message?: string;
  log: { at: number; level: string; text: string }[];
};

function RunItem({ item, title }: { item: RunItemData; title?: string }) {
  const { t, language } = useAdminT();
  const run = RUN_STATUS[item.status] ?? RUN_STATUS.failed;
  return (
    <details className="adm-panel" style={{ padding: "0.75rem 1rem" }}>
      <summary style={{ cursor: "pointer", listStyle: "revert" }}>
        <span className="adm-row adm-row--between" style={{ display: "inline-flex", width: "calc(100% - 1.5rem)" }}>
          <span>
            <span className="adm-strong">{title ?? formatWhen(item.startedAt, language)}</span>
            <span className="adm-row-meta">
              {item.finishedAt ? formatRunDuration(item.finishedAt - item.startedAt) : t("u toku", "running")} ·{" "}
              {t(`${item.discovered} pronađeno, ${item.created} ${serbianPlural(item.created, "nova", "nove", "novih")}, ${item.updated} ${serbianPlural(item.updated, "izmenjena", "izmenjene", "izmenjenih")}, ${item.removed} ${serbianPlural(item.removed, "skinuta", "skinute", "skinutih")}`, `${item.discovered} found, ${item.created} new, ${item.updated} changed, ${item.removed} removed`)} ·{" "}
              {t(`${item.requestsUsed} ${serbianPlural(item.requestsUsed, "zahtev", "zahteva", "zahteva")}`, `${item.requestsUsed} requests`)}
            </span>
          </span>
          <StatusDot status={run.status} label={pick(run, language)} />
        </span>
      </summary>
      {item.message ? <p style={{ margin: "0.6rem 0" }}>{item.message}</p> : null}
      {item.log.length ? (
        <ol className="adm-log" aria-label={t("Dnevnik uvoza", "Import log")}>
          {item.log.map((line, index) => (
            <li key={index}>
              <time dateTime={new Date(line.at).toISOString()}>{formatTime(line.at)}</time>
              <span className={line.level === "error" ? "adm-up" : undefined}>{line.text}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </details>
  );
}

function RunHistory({ onOpen, partners }: { onOpen: (id: string) => void; partners: PartnerRow[] }) {
  const { t, language } = useAdminT();
  const { results, status, loadMore } = usePaginatedQuery(api.syncAdmin.listRuns, {}, { initialNumItems: 20 });
  const names = useMemo(() => new Map(partners.map((partner) => [partner.slug, partner.name])), [partners]);

  if (status === "LoadingFirstPage") {
    return (
      <Panel flush>
        <SkeletonRows rows={8} />
      </Panel>
    );
  }
  if (results.length === 0) {
    return (
      <Panel flush>
        <EmptyState title={t("Još nema uvoza", "No imports yet")} body={t("Prvi automatski uvoz je sledećeg jutra u 06:00, ili ga pokrenite ručno iznad.", "The first automatic import runs the next morning at 06:00, or run it by hand above.")} glyph="compass" />
      </Panel>
    );
  }

  return (
    <Panel flush>
      <div className="adm-table-wrap">
        <table className="adm-table">
          <caption className="ui-sr-only">{t("Istorija uvoza", "Import history")}</caption>
          <thead>
            <tr>
              <th scope="col">{t("Početak", "Started")}</th>
              <th scope="col">{t("Pokrenuo", "Trigger")}</th>
              <th scope="col">{t("Partneri", "Partners")}</th>
              <th scope="col" data-align="end">
                {t("Novih / izmena / skinutih", "New / changed / removed")}
              </th>
              <th scope="col" data-align="end">
                {t("Trajanje", "Duration")}
              </th>
              <th scope="col">{t("Ishod", "Result")}</th>
            </tr>
          </thead>
          <tbody>
            {results.map((run) => {
              const state = RUN_STATUS[run.status] ?? RUN_STATUS.ok;
              return (
                <tr key={run._id}>
                  <td className="adm-nowrap">
                    <button type="button" className="adm-row-button" onClick={() => onOpen(run._id)}>
                      <span className="adm-row-title">{formatWhen(run.startedAt, language)}</span>
                    </button>
                  </td>
                  <td>{pick(TRIGGER_LABEL[run.trigger] ?? TRIGGER_LABEL.cli, language)}</td>
                  <td>
                    {run.partnerSlugs.length > 3
                      ? t(`${run.partnerSlugs.length} partnera`, `${run.partnerSlugs.length} partners`)
                      : run.partnerSlugs.map((slug) => names.get(slug) ?? slug).join(", ")}
                  </td>
                  <td data-align="end">{run.totals ? `${run.totals.created} / ${run.totals.updated} / ${run.totals.removed}` : "–"}</td>
                  <td data-align="end">{run.finishedAt ? formatRunDuration(run.finishedAt - run.startedAt) : t("u toku", "running")}</td>
                  <td>
                    <StatusDot status={state.status} label={pick(state, language)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {status === "CanLoadMore" || status === "LoadingMore" ? (
        <div className="adm-panel__foot">
          <span />
          <Button size="sm" variant="secondary" onClick={() => loadMore(20)} loading={status === "LoadingMore"} loadingLabel={t("Učitavanje…", "Loading…")}>
            {t("Starije", "Older")}
          </Button>
        </div>
      ) : null}
    </Panel>
  );
}

function RunDetail({ runId, partners }: { runId: string; partners: PartnerRow[] }) {
  const { t, language } = useAdminT();
  const data = useQuery(api.syncAdmin.getRun, { runId });
  const names = new Map(partners.map((partner) => [partner.slug, partner.name]));
  if (data === undefined) return <SkeletonRows rows={10} />;
  const state = RUN_STATUS[data.run.status] ?? RUN_STATUS.ok;
  return (
    <>
      <div className="adm-stack" style={{ gap: "0.35rem" }}>
        <div className="adm-row">
          <StatusDot status={state.status} label={pick(state, language)} chip />
          <span className="adm-muted">
            {formatWhen(data.run.startedAt, language)} · {pick(TRIGGER_LABEL[data.run.trigger] ?? TRIGGER_LABEL.cli, language)}
            {data.run.finishedAt ? ` · ${formatRunDuration(data.run.finishedAt - data.run.startedAt)}` : ""}
          </span>
        </div>
        {data.run.totals ? (
          <p className="adm-hint" style={{ margin: 0 }}>
            {t(
              `Ukupno: ${data.run.totals.created} ${serbianPlural(data.run.totals.created, "nova", "nove", "novih")}, ${data.run.totals.updated} ${serbianPlural(data.run.totals.updated, "izmenjena", "izmenjene", "izmenjenih")}, ${data.run.totals.removed} ${serbianPlural(data.run.totals.removed, "skinuta", "skinute", "skinutih")}, ${data.run.totals.expired} ${serbianPlural(data.run.totals.expired, "istekla", "istekle", "isteklih")} · ${data.run.totals.requests} ${serbianPlural(data.run.totals.requests, "zahtev", "zahteva", "zahteva")}`,
              `Total: ${data.run.totals.created} new, ${data.run.totals.updated} changed, ${data.run.totals.removed} removed, ${data.run.totals.expired} expired · ${data.run.totals.requests} requests`
            )}
          </p>
        ) : null}
      </div>
      <div className="adm-stack">
        {data.items
          .slice()
          .sort((a, b) => (names.get(a.partnerSlug) ?? a.partnerSlug).localeCompare(names.get(b.partnerSlug) ?? b.partnerSlug, "sr"))
          .map((item) => (
            <RunItem key={item._id} item={item} title={names.get(item.partnerSlug) ?? item.partnerSlug} />
          ))}
      </div>
    </>
  );
}
