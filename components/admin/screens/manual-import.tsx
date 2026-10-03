"use client";

// Manual import (Holiday Plus KM and any partner later): upload a price list
// (PDF, Excel, CSV, photo) and, without the AI key, enter offers through the
// form. With the key, drafts appear for review before anything is published.
import { useConvex, useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { ExternalLink, FileUp, Plus, Trash, Upload } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { errorCode, formatDate, formatMoney, formatWhen, useAdminT } from "../../../lib/admin/format";
import { BOARD, errorMessage, offerState, pick, PRICE_BASIS, TRANSPORT } from "../../../lib/admin/labels";
import { TRAVEL_TYPES } from "../../../lib/search/travel-types";
import { Badge, Button, Chip, EmptyState, Field, Input, Select, StatusDot, Textarea, useToast } from "../../ui";
import { Notice, PageIntro, Panel, Sheet, SkeletonRows, Thumb, useConfirm } from "../kit";
import { serbianPlural } from "@/lib/catalog/format";

type ManualOffer = Doc<"offerDrafts">["offer"];
type Basis = ManualOffer["departures"][number]["basis"];
type Transport = ManualOffer["transports"][number];
type Board = NonNullable<ManualOffer["board"]>;

type DepartureRow = { date: string; price: string; basis: Basis; note: string };
type FormState = {
  title: string;
  kind: "trip" | "stay";
  place: string;
  countryName: string;
  travelTypes: string[];
  transports: Transport[];
  nights: string;
  days: string;
  board: "" | Board;
  stars: string;
  departureCities: string;
  departures: DepartureRow[];
  listPrice: string;
  listBasis: Basis;
  listNote: string;
  included: string;
  excluded: string;
  descriptionText: string;
  programText: string;
  notesText: string;
  organizerName: string;
  organizerLicense: string;
  images: { storageId: Id<"_storage">; url: string | null }[];
};

type Editing =
  | { mode: "new" }
  | { mode: "edit"; cardId: string; offer: ManualOffer; images: { storageId: Id<"_storage">; url: string | null }[] }
  | { mode: "draft"; draftId: string; offer: ManualOffer };

const BASES: Basis[] = ["per_person", "per_unit", "per_person_night", "per_unit_night", "per_stay", "total_2_adults", "per_day"];
const ACCEPT = ".pdf,.xlsx,.csv,.jpg,.jpeg,.png,.webp";

function emptyForm(organizerName: string, organizerLicense = ""): FormState {
  return {
    title: "",
    kind: "trip",
    place: "",
    countryName: "",
    travelTypes: [],
    transports: [],
    nights: "",
    days: "",
    board: "",
    stars: "",
    departureCities: "",
    departures: [],
    listPrice: "",
    listBasis: "per_person",
    listNote: "",
    included: "",
    excluded: "",
    descriptionText: "",
    programText: "",
    notesText: "",
    organizerName,
    organizerLicense,
    images: [],
  };
}

function formFromOffer(offer: ManualOffer, images: { storageId: Id<"_storage">; url: string | null }[]): FormState {
  return {
    title: offer.title,
    kind: offer.kind,
    place: offer.place ?? "",
    countryName: offer.countryName ?? "",
    travelTypes: offer.travelTypes ?? [],
    transports: offer.transports,
    nights: offer.nights ? String(offer.nights) : "",
    days: offer.days ? String(offer.days) : "",
    board: offer.board ?? "",
    stars: offer.stars ? String(offer.stars) : "",
    departureCities: offer.departureCities.join(", "),
    departures: offer.departures.map((departure) => ({
      date: departure.date,
      price: departure.price ? String(departure.price) : "",
      basis: departure.basis,
      note: departure.note ?? "",
    })),
    listPrice: offer.listPrice ? String(offer.listPrice.price) : "",
    listBasis: offer.listPrice?.basis ?? "per_person",
    listNote: offer.listPrice?.note ?? "",
    included: offer.included.join("\n"),
    excluded: offer.excluded.join("\n"),
    descriptionText: offer.descriptionText ?? "",
    programText: offer.programText ?? "",
    notesText: offer.notesText ?? "",
    organizerName: offer.organizerName,
    organizerLicense: offer.organizerLicense ?? "",
    images: images.length ? images : offer.imageStorageIds.map((storageId) => ({ storageId, url: null })),
  };
}

const num = (value: string) => {
  const parsed = Number(value.replace(/\./g, "").replace(",", "."));
  return value.trim() && Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};
const lines = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

function offerFromForm(form: FormState): ManualOffer {
  return {
    title: form.title.trim(),
    kind: form.kind,
    place: form.place.trim() || undefined,
    countryName: form.countryName.trim() || undefined,
    travelTypes: form.travelTypes.length ? form.travelTypes : undefined,
    transports: form.transports,
    nights: num(form.nights),
    days: num(form.days),
    board: form.board || undefined,
    stars: num(form.stars),
    departureCities: form.departureCities
      .split(",")
      .map((city) => city.trim())
      .filter(Boolean),
    departures: form.departures
      .filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.date))
      .map((row) => ({ date: row.date, price: num(row.price), basis: row.basis, note: row.note.trim() || undefined })),
    listPrice: num(form.listPrice) ? { price: num(form.listPrice)!, basis: form.listBasis, note: form.listNote.trim() || undefined } : undefined,
    included: lines(form.included),
    excluded: lines(form.excluded),
    descriptionText: form.descriptionText.trim() || undefined,
    programText: form.programText.trim() || undefined,
    notesText: form.notesText.trim() || undefined,
    organizerName: form.organizerName.trim(),
    organizerLicense: form.organizerLicense.trim() || undefined,
    coverStorageId: form.images[0]?.storageId,
    imageStorageIds: form.images.map((image) => image.storageId),
  };
}

async function uploadFile(generateUploadUrl: () => Promise<string>, file: File) {
  const url = await generateUploadUrl();
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
  if (!response.ok) throw new Error("UPLOAD_FAILED");
  const { storageId } = (await response.json()) as { storageId: Id<"_storage"> };
  return storageId;
}

export default function ManualImportScreen() {
  const { t, language } = useAdminT();
  const toast = useToast();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const partners = useQuery(api.partners.adminList, {});
  const capabilities = useQuery(api.manualImport.capabilities, {});
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const createImport = useMutation(api.manualImport.createImport);
  const [partnerSlug, setPartnerSlug] = useState(params.get("partner") ?? "holidayplus");
  const [editing, setEditing] = useState<Editing | null>(() => (params.get("novo") === "1" ? { mode: "new" } : null));
  const [openImport, setOpenImport] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const partner = partners?.find((row) => row.slug === partnerSlug);

  useEffect(() => {
    if (params.get("novo") === "1") {
      const next = new URLSearchParams(params.toString());
      next.delete("novo");
      router.replace(next.toString() ? `${pathname}?${next}` : pathname, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    if (/\.(xls|doc|docx|ppt)$/i.test(file.name)) {
      toast.show({ tone: "error", message: errorMessage("UNSUPPORTED_FILE_SAVE_AS_PDF_OR_XLSX", language) });
      return;
    }
    setUploading(true);
    try {
      const storageId = await uploadFile(() => generateUploadUrl({}), file);
      const result = await createImport({ partnerSlug, storageId, fileName: file.name, mimeType: file.type || undefined });
      setOpenImport(result.importId);
      toast.show({
        message:
          result.method === "ai"
            ? t("Fajl je otpremljen. Automatsko čitanje je u toku; nacrti stižu za minut-dva.", "File uploaded. Automatic reading is running; drafts arrive in a minute or two.")
            : t("Fajl je otpremljen. Sada unesite ponude iz njega kroz formular.", "File uploaded. Now enter its offers through the form."),
      });
    } catch (error) {
      toast.show({ tone: "error", message: errorMessage(errorCode(error), language) });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="adm-page">
      <PageIntro
        actions={
          <Button size="sm" onClick={() => setEditing({ mode: "new" })} iconStart={<Plus aria-hidden="true" strokeWidth={1.75} />}>
            {t("Nova ponuda", "New offer")}
          </Button>
        }
      >
        {t(
          "Za partnere bez sajta (Holiday Plus KM): otpremite cenovnik koji ste dobili i unesite ponude. Sačuvana ponuda odmah ide na sajt sa organizatorom i licencom partnera.",
          "For partners without a website (Holiday Plus KM): upload the price list you received and enter its offers. A saved offer goes on the site right away with the partner's organizer and license."
        )}
      </PageIntro>

      <div className="adm-toolbar">
        <Field label={t("Partner", "Partner")}>
          <Select value={partnerSlug} onChange={(event) => setPartnerSlug(event.target.value)} loading={partners === undefined}>
            {(partners ?? [])
              .slice()
              .sort((a, b) => Number(b.status === "manual") - Number(a.status === "manual"))
              .map((row) => (
                <option key={row.slug} value={row.slug}>
                  {row.name}
                  {row.status === "manual" ? t(" (ručni unos)", " (manual)") : ""}
                </option>
              ))}
          </Select>
        </Field>
      </div>

      <div className="adm-grid adm-grid--main-side">
        <div className="adm-stack">
          <Panel
            id="mi-upload"
            title={t("1. Otpremite cenovnik", "1. Upload the price list")}
            sub={capabilities ? capabilities.accepted.join(" · ") : undefined}
          >
            <div className="adm-stack">
              {capabilities && !capabilities.aiExtraction ? (
                <Notice tone="info">
                  <p>
                    {t(
                      "Automatsko čitanje cenovnika nije uključeno. Fajl se čuva uz ponude, a ponude unosite kroz formular („Nova ponuda”).",
                      "Automatic reading is not switched on. The file is kept with the offers and you enter them through the form (\"New offer\")."
                    )}
                  </p>
                </Notice>
              ) : capabilities?.aiExtraction ? (
                <Notice tone="info">
                  <p>
                    {t(
                      "Automatsko čitanje je uključeno: posle otpremanja dobijate nacrte ponuda. Ništa se ne objavljuje dok ne proverite i odobrite.",
                      "Automatic reading is on: after the upload you get draft offers. Nothing is published until you check and approve."
                    )}
                  </p>
                </Notice>
              ) : null}
              <label className="ui-btn ui-btn--secondary" style={{ width: "fit-content" }} aria-busy={uploading || undefined}>
                <Upload aria-hidden="true" strokeWidth={1.5} />
                <span>{uploading ? t("Otpremanje…", "Uploading…") : t("Izaberite fajl", "Choose a file")}</span>
                <input ref={fileRef} type="file" accept={ACCEPT} className="ui-sr-only" disabled={uploading} onChange={(event) => void onUpload(event.target.files?.[0])} />
              </label>
              <p className="adm-hint" style={{ margin: 0 }}>
                {t("Stari Word i Excel fajlovi (.doc, .xls) nisu podržani: sačuvajte ih kao PDF ili .xlsx.", "Old Word and Excel files (.doc, .xls) are not supported: save them as PDF or .xlsx.")}
              </p>
            </div>
          </Panel>

          <PartnerManualOffers partnerSlug={partnerSlug} onEdit={(editing) => setEditing(editing)} />
        </div>

        <ImportsList partnerSlug={partnerSlug} onOpen={setOpenImport} />
      </div>

      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.mode === "edit" ? t("Izmena ponude", "Edit offer") : editing?.mode === "draft" ? t("Provera nacrta", "Review draft") : t("Nova ponuda", "New offer")}
        sub={partner?.name}
        wide
      >
        {editing ? (
          <OfferForm
            key={editing.mode === "new" ? `new-${partnerSlug}` : editing.mode === "edit" ? editing.cardId : editing.draftId}
            editing={editing}
            partnerSlug={partnerSlug}
            defaultOrganizer={partner?.name ?? ""}
            onDone={() => setEditing(null)}
          />
        ) : null}
      </Sheet>

      <Sheet open={openImport !== null} onClose={() => setOpenImport(null)} title={t("Otpremljeni cenovnik", "Uploaded price list")} wide>
        {openImport ? (
          <ImportDetail
            importId={openImport}
            onEditDraft={(draft) => {
              setOpenImport(null);
              setEditing({ mode: "draft", draftId: draft._id, offer: draft.offer });
            }}
            onNewOffer={() => {
              setOpenImport(null);
              setEditing({ mode: "new" });
            }}
          />
        ) : null}
      </Sheet>
    </div>
  );
}

// ---------------------------------------------------------------- lists

function PartnerManualOffers({ partnerSlug, onEdit }: { partnerSlug: string; onEdit: (editing: Editing) => void }) {
  const { t, language } = useAdminT();
  const toast = useToast();
  const { results, status, loadMore } = usePaginatedQuery(api.offerAdmin.list, { partnerSlug }, { initialNumItems: 50 });
  const removeOffer = useMutation(api.manualImport.removeManualOffer);
  const [confirm, confirmDialog] = useConfirm();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const manual = results.filter((row) => row.externalId.startsWith("manual-"));
  const convex = useConvex();

  const openEditor = async (cardId: string) => {
    setLoadingId(cardId);
    try {
      const data = await convex.query(api.manualImport.getManualOffer, { cardId });
      onEdit({ mode: "edit", cardId: data.cardId, offer: data.offer, images: data.images });
    } catch (error) {
      toast.show({ tone: "error", message: errorMessage(errorCode(error), language) });
    } finally {
      setLoadingId(null);
    }
  };

  const remove = async (row: (typeof manual)[number]) => {
    const ok = await confirm({
      title: t("Skinuti ponudu sa sajta?", "Take the offer off the site?"),
      body: t(`„${row.title}” više neće biti vidljiva posetiocima. Podaci ostaju sačuvani.`, `"${row.title}" will no longer be visible to visitors. The data stays saved.`),
      confirmLabel: t("Skini sa sajta", "Take off the site"),
    });
    if (!ok) return;
    try {
      await removeOffer({ cardId: row._id });
      toast.show({ message: t("Ponuda je skinuta sa sajta.", "The offer was taken off the site.") });
    } catch (error) {
      toast.show({ tone: "error", message: errorMessage(errorCode(error), language) });
    }
  };

  return (
    <Panel id="mi-offers" title={t("2. Ponude ovog partnera", "2. This partner's offers")} sub={t("Ručno unete ponude; izmene se odmah vide na sajtu.", "Manually entered offers; changes show on the site right away.")} flush>
      {status === "LoadingFirstPage" ? (
        <SkeletonRows rows={4} />
      ) : manual.length === 0 ? (
        <EmptyState
          title={t("Još nema ručno unetih ponuda", "No manually entered offers yet")}
          body={t("Kliknite „Nova ponuda” i prepišite prvu ponudu iz cenovnika. Ponuda bez termina se prikazuje kao „Cena na upit”.", "Click \"New offer\" and copy the first offer from the price list. An offer without dates shows as \"Price on request\".")}
          glyph="compass"
        />
      ) : (
        <ul className="adm-list">
          {manual.map((row) => {
            const light = offerState(row);
            return (
              <li key={row._id} className="adm-list__item adm-list__item--split">
                <span>
                  <span className="adm-row-title">{row.title}</span>
                  <span className="adm-row-meta">
                    {[row.place, row.priceFrom ? `${t("od", "from")} ${formatMoney(row.priceFrom)}` : t("na upit", "on request"), row.nextDepartureDate ? formatDate(row.nextDepartureDate, language) : null].filter(Boolean).join(" · ")}
                  </span>
                  <span style={{ display: "block", marginTop: "0.3rem" }}>
                    <StatusDot status={light.status} label={pick(light, language)} />
                  </span>
                </span>
                <span className="adm-row">
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={loadingId === row._id}
                    loadingLabel={t("Otvaram…", "Opening…")}
                    onClick={() => void openEditor(row._id)}
                  >
                    {t("Uredi", "Edit")}
                  </Button>
                  {row.listed ? (
                    <Button size="sm" variant="secondary" aria-label={t(`Skini sa sajta: ${row.title}`, `Take off the site: ${row.title}`)} onClick={() => void remove(row)}>
                      <Trash aria-hidden="true" strokeWidth={1.5} />
                    </Button>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {status === "CanLoadMore" ? (
        <div className="adm-panel__foot">
          <span />
          <Button size="sm" variant="secondary" onClick={() => loadMore(100)}>
            {t("Učitaj još", "Load more")}
          </Button>
        </div>
      ) : null}
      {confirmDialog}
    </Panel>
  );
}

const IMPORT_STATUS: Record<string, { sr: string; en: string; status: "active" | "warning" | "error" | "off" | "progress" }> = {
  uploaded: { sr: "Otpremljeno", en: "Uploaded", status: "off" },
  extracting: { sr: "Čitanje u toku", en: "Reading", status: "progress" },
  needs_review: { sr: "Čeka unos ili proveru", en: "Needs entry or review", status: "warning" },
  done: { sr: "Završeno", en: "Done", status: "active" },
  failed: { sr: "Čitanje nije uspelo", en: "Reading failed", status: "error" },
};

function ImportsList({ partnerSlug, onOpen }: { partnerSlug: string; onOpen: (id: string) => void }) {
  const { t, language } = useAdminT();
  const { results, status } = usePaginatedQuery(api.manualImport.listImports, { partnerSlug }, { initialNumItems: 20 });
  return (
    <Panel id="mi-imports" title={t("Otpremljeni fajlovi", "Uploaded files")} flush>
      {status === "LoadingFirstPage" ? (
        <SkeletonRows rows={4} />
      ) : results.length === 0 ? (
        <EmptyState title={t("Još nema fajlova", "No files yet")} body={t("Ovde se čuvaju cenovnici koje otpremite, da biste uvek znali iz čega je ponuda uneta.", "Price lists you upload are kept here, so you always know where an offer came from.")} glyph="pin" />
      ) : (
        <ul className="adm-list">
          {results.map((row) => {
            const state = IMPORT_STATUS[row.status] ?? IMPORT_STATUS.uploaded;
            return (
              <li key={row._id}>
                <button type="button" className="adm-row-button adm-list__item adm-list__item--plain adm-list__link" onClick={() => onOpen(row._id)}>
                  <span className="adm-row-title">
                    <FileUp aria-hidden="true" width={14} height={14} strokeWidth={1.75} style={{ display: "inline", verticalAlign: "-2px", marginRight: 6 }} />
                    {row.fileName}
                  </span>
                  <span className="adm-row-meta">
                    {formatWhen(row.createdAt, language)} · {row.method === "ai" ? t(`${row.draftCount} nacrta`, `${row.draftCount} drafts`) : t("ručni unos", "manual entry")}
                  </span>
                  <span style={{ display: "block", marginTop: "0.3rem" }}>
                    <StatusDot status={state.status} label={pick(state, language)} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function ImportDetail({ importId, onEditDraft, onNewOffer }: { importId: string; onEditDraft: (draft: Doc<"offerDrafts">) => void; onNewOffer: () => void }) {
  const { t, language } = useAdminT();
  const toast = useToast();
  const data = useQuery(api.manualImport.getImport, { importId });
  const approve = useMutation(api.manualImport.approveDrafts);
  const discard = useMutation(api.manualImport.discardDrafts);
  const [confirm, confirmDialog] = useConfirm();
  if (data === undefined) return <SkeletonRows rows={6} />;
  const state = IMPORT_STATUS[data.import.status] ?? IMPORT_STATUS.uploaded;
  const open = data.drafts.filter((draft) => draft.status === "draft");

  const publish = async (ids: string[]) => {
    try {
      const result = await approve({ draftIds: ids });
      toast.show({ message: t(`Objavljeno ponuda: ${result.published.length}.`, `Offers published: ${result.published.length}.`) });
    } catch (error) {
      toast.show({ tone: "error", message: errorMessage(errorCode(error), language) });
    }
  };

  const drop = async (ids: string[]) => {
    const ok = await confirm({
      title: t("Odbaciti nacrt?", "Discard the draft?"),
      body: t("Odbačen nacrt se ne objavljuje. Fajl ostaje sačuvan.", "A discarded draft is not published. The file stays saved."),
      confirmLabel: t("Odbaci", "Discard"),
    });
    if (!ok) return;
    try {
      await discard({ draftIds: ids });
      toast.show({ message: t("Nacrt je odbačen.", "Draft discarded.") });
    } catch (error) {
      toast.show({ tone: "error", message: errorMessage(errorCode(error), language) });
    }
  };

  return (
    <>
      <div className="adm-stack" style={{ gap: "0.5rem" }}>
        <p className="adm-panel__title">{data.import.fileName}</p>
        <div className="adm-row">
          <StatusDot status={state.status} label={pick(state, language)} chip />
          <span className="adm-muted">{formatWhen(data.import.createdAt, language)}</span>
          {data.fileUrl ? (
            <a className="ui-btn ui-btn--secondary ui-btn--sm" href={data.fileUrl} target="_blank" rel="noopener">
              <span>{t("Otvori fajl", "Open file")}</span>
              <ExternalLink aria-hidden="true" strokeWidth={1.5} />
            </a>
          ) : null}
        </div>
        {data.import.message ? <p className="adm-hint" style={{ margin: 0 }}>{data.import.message}</p> : null}
      </div>

      {data.import.method === "manual" ? (
        <Notice tone="info">
          <p>{t("Otvorite fajl pored formulara i prepišite ponude jednu po jednu.", "Open the file next to the form and copy the offers one by one.")}</p>
          <div style={{ marginTop: "0.6rem" }}>
            <Button size="sm" onClick={onNewOffer} iconStart={<Plus aria-hidden="true" strokeWidth={1.75} />}>
              {t("Unesi ponudu iz ovog fajla", "Enter an offer from this file")}
            </Button>
          </div>
        </Notice>
      ) : (
        <section className="adm-stack">
          <div className="adm-row adm-row--between">
            <p className="adm-section-title" style={{ margin: 0 }}>
              {t(`Nacrti (${data.drafts.length})`, `Drafts (${data.drafts.length})`)}
            </p>
            {open.length > 1 ? (
              <Button size="sm" onClick={() => void publish(open.map((draft) => draft._id))}>
                {t(`Objavi sve (${open.length})`, `Publish all (${open.length})`)}
              </Button>
            ) : null}
          </div>
          {data.drafts.length === 0 ? (
            <p className="adm-hint">{data.import.status === "extracting" ? t("Čitanje je u toku…", "Reading…") : t("Nema nacrta.", "No drafts.")}</p>
          ) : (
            <ul className="adm-list" style={{ border: "1px solid var(--ablux-line-soft)", borderRadius: 8 }}>
              {data.drafts.map((draft) => (
                <li key={draft._id} className="adm-list__item adm-list__item--split">
                  <span>
                    <span className="adm-row-title">{draft.offer.title}</span>
                    <span className="adm-row-meta">
                      {[draft.offer.place, t(`${draft.offer.departures.length} ${serbianPlural(draft.offer.departures.length, "termin", "termina", "termina")}`, `${draft.offer.departures.length} dates`)].filter(Boolean).join(" · ")}
                      {draft.confidence && draft.confidence !== "high" ? ` · ${t("proverite pažljivo", "check carefully")}` : ""}
                    </span>
                    {draft.warnings.length ? <span className="adm-row-meta">{draft.warnings.join(" ")}</span> : null}
                  </span>
                  {draft.status === "draft" ? (
                    <span className="adm-row">
                      <Button size="sm" variant="secondary" onClick={() => onEditDraft(draft)}>
                        {t("Proveri", "Review")}
                      </Button>
                      <Button size="sm" onClick={() => void publish([draft._id])}>
                        {t("Objavi", "Publish")}
                      </Button>
                      <Button size="sm" variant="secondary" aria-label={t("Odbaci nacrt", "Discard draft")} onClick={() => void drop([draft._id])}>
                        <Trash aria-hidden="true" strokeWidth={1.5} />
                      </Button>
                    </span>
                  ) : (
                    <Badge tone={draft.status === "approved" ? "route" : "outline"}>{draft.status === "approved" ? t("Objavljeno", "Published") : t("Odbačeno", "Discarded")}</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {confirmDialog}
    </>
  );
}

// ---------------------------------------------------------------- form

function OfferForm({ editing, partnerSlug, defaultOrganizer, onDone }: { editing: Editing; partnerSlug: string; defaultOrganizer: string; onDone: () => void }) {
  const { t, language } = useAdminT();
  const toast = useToast();
  const saveOffer = useMutation(api.manualImport.saveManualOffer);
  const updateDraft = useMutation(api.manualImport.updateDraft);
  const approveDrafts = useMutation(api.manualImport.approveDrafts);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const [form, setForm] = useState<FormState>(() =>
    editing.mode === "new" ? emptyForm(defaultOrganizer) : formFromOffer(editing.offer, editing.mode === "edit" ? editing.images : [])
  );
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));
  const text = (key: "title" | "place" | "countryName" | "nights" | "days" | "stars" | "departureCities" | "listPrice" | "listNote" | "included" | "excluded" | "descriptionText" | "programText" | "notesText" | "organizerName" | "organizerLicense") => ({
    value: form[key],
    onChange: (event: { target: { value: string } }) => set(key, event.target.value),
  });

  const toggleList = <T extends string>(list: T[], value: T, max = 99) => (list.includes(value) ? list.filter((item) => item !== value) : list.length >= max ? list : [...list, value]);

  const addImages = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const added: FormState["images"] = [];
      for (const file of Array.from(files).slice(0, 12)) {
        if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type) || file.size > 5 * 1024 * 1024) continue;
        const storageId = await uploadFile(() => generateUploadUrl({}), file);
        added.push({ storageId, url: URL.createObjectURL(file) });
      }
      setForm((current) => ({ ...current, images: [...current.images, ...added].slice(0, 40) }));
      if (added.length < files.length) toast.show({ tone: "error", message: t("Neke slike su preskočene: dozvoljeni su JPG, PNG, WebP i AVIF do 5 MB.", "Some images were skipped: JPG, PNG, WebP and AVIF up to 5 MB are allowed.") });
    } catch {
      toast.show({ tone: "error", message: t("Slike nisu otpremljene. Pokušajte ponovo.", "Images were not uploaded. Please try again.") });
    } finally {
      setUploading(false);
    }
  };

  const submit = async (publishDraft = false) => {
    if (!form.title.trim()) {
      setTitleError(t("Upišite naziv ponude.", "Enter the offer name."));
      return;
    }
    setTitleError(null);
    const offer = offerFromForm({ ...form, organizerName: form.organizerName.trim() || defaultOrganizer });
    setBusy(true);
    try {
      if (editing.mode === "draft") {
        await updateDraft({ draftId: editing.draftId, offer });
        if (publishDraft) await approveDrafts({ draftIds: [editing.draftId] });
        toast.show({ message: publishDraft ? t("Nacrt je objavljen.", "Draft published.") : t("Nacrt je sačuvan.", "Draft saved.") });
      } else {
        const result = await saveOffer({ partnerSlug, offer, cardId: editing.mode === "edit" ? editing.cardId : undefined });
        toast.show({
          message: editing.mode === "edit" ? t("Izmene su objavljene.", "Changes published.") : t("Ponuda je objavljena na sajtu.", "The offer is published on the site."),
          action: { label: t("Otvori", "Open"), onAction: () => window.open(`/ponude/${result.slug}`, "_blank", "noopener") },
        });
      }
      onDone();
    } catch (error) {
      toast.show({ tone: "error", message: errorMessage(errorCode(error), language) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="adm-stack"
      style={{ gap: "1.25rem" }}
      onSubmit={(event) => {
        event.preventDefault();
        void submit(false);
      }}
    >
      <section className="adm-form adm-form--2">
        <Field label={t("Naziv ponude", "Offer name")} required requiredLabel={t("obavezno", "required")} error={titleError ?? undefined} className="adm-span">
          <Input {...text("title")} maxLength={160} placeholder={t("Npr. Hotel Plaža, Budva", "E.g. Hotel Plaža, Budva")} />
        </Field>
        <Field label={t("Vrsta", "Kind")}>
          <Select value={form.kind} onChange={(event) => set("kind", event.target.value as "trip" | "stay")}>
            <option value="trip">{t("Putovanje (program)", "Trip (program)")}</option>
            <option value="stay">{t("Smeštaj (hotel, apartman)", "Stay (hotel, apartment)")}</option>
          </Select>
        </Field>
        <Field label={t("Usluga", "Board")}>
          <Select value={form.board} onChange={(event) => set("board", event.target.value as "" | Board)}>
            <option value="">{t("Nije navedeno", "Not given")}</option>
            {Object.entries(BOARD).map(([value, label]) => (
              <option key={value} value={value}>
                {pick(label, language)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("Mesto", "Place")}>
          <Input {...text("place")} maxLength={80} />
        </Field>
        <Field label={t("Država", "Country")}>
          <Input {...text("countryName")} maxLength={60} />
        </Field>
        <Field label={t("Broj noćenja", "Nights")}>
          <Input {...text("nights")} inputMode="numeric" />
        </Field>
        <Field label={t("Broj dana", "Days")}>
          <Input {...text("days")} inputMode="numeric" />
        </Field>
        <Field label={t("Kategorija smeštaja (zvezdice)", "Stars")}>
          <Input {...text("stars")} inputMode="numeric" />
        </Field>
        <Field label={t("Gradovi polaska", "Departure cities")} hint={t("Odvojite zarezom: Beograd, Novi Sad", "Separate with commas")}>
          <Input {...text("departureCities")} />
        </Field>
      </section>

      <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
        <legend className="ui-field__label" style={{ marginBottom: "0.4rem" }}>
          {t("Vrsta putovanja (najviše tri)", "Travel type (up to three)")}
        </legend>
        <div className="adm-row">
          {TRAVEL_TYPES.map((type) => (
            <Chip key={type.slug} selected={form.travelTypes.includes(type.slug)} onClick={() => set("travelTypes", toggleList(form.travelTypes, type.slug, 3))}>
              {pick(type.label, language)}
            </Chip>
          ))}
        </div>
      </fieldset>

      <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
        <legend className="ui-field__label" style={{ marginBottom: "0.4rem" }}>
          {t("Prevoz", "Transport")}
        </legend>
        <div className="adm-row">
          {(Object.keys(TRANSPORT) as Transport[]).map((value) => (
            <Chip key={value} selected={form.transports.includes(value)} onClick={() => set("transports", toggleList(form.transports, value))}>
              {pick(TRANSPORT[value], language)}
            </Chip>
          ))}
        </div>
      </fieldset>

      <section className="adm-stack">
        <div>
          <p className="adm-section-title" style={{ margin: 0 }}>
            {t("Termini i cene", "Dates and prices")}
          </p>
          <p className="adm-hint">
            {t("Svaki polazak u svom redu. Ponuda bez termina se prikazuje kao „Cena na upit”, ili upišite cenu iz cenovnika ispod.", "One departure per row. An offer without dates shows as \"Price on request\", or enter the price-list price below.")}
          </p>
        </div>
        {form.departures.map((row, index) => (
          <div key={index} className="adm-departure">
            <Field label={t("Datum polaska", "Departure date")}>
              <Input type="date" value={row.date} onChange={(event) => set("departures", form.departures.map((item, i) => (i === index ? { ...item, date: event.target.value } : item)))} />
            </Field>
            <Field label={t("Cena (€)", "Price (€)")}>
              <Input inputMode="decimal" value={row.price} onChange={(event) => set("departures", form.departures.map((item, i) => (i === index ? { ...item, price: event.target.value } : item)))} />
            </Field>
            <Field label={t("Osnova cene", "Price basis")}>
              <Select value={row.basis} onChange={(event) => set("departures", form.departures.map((item, i) => (i === index ? { ...item, basis: event.target.value as Basis } : item)))}>
                {BASES.map((basis) => (
                  <option key={basis} value={basis}>
                    {pick(PRICE_BASIS[basis], language)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("Napomena", "Note")}>
              <Input value={row.note} onChange={(event) => set("departures", form.departures.map((item, i) => (i === index ? { ...item, note: event.target.value } : item)))} />
            </Field>
            <Button size="sm" variant="secondary" aria-label={t("Ukloni termin", "Remove date")} onClick={() => set("departures", form.departures.filter((_, i) => i !== index))}>
              <Trash aria-hidden="true" strokeWidth={1.5} />
            </Button>
          </div>
        ))}
        <div>
          <Button
            size="sm"
            variant="text"
            iconStart={<Plus aria-hidden="true" strokeWidth={1.5} />}
            onClick={() => set("departures", [...form.departures, { date: "", price: "", basis: form.departures.at(-1)?.basis ?? "per_person", note: "" }])}
          >
            {t("Dodaj termin", "Add date")}
          </Button>
        </div>
        <div className="adm-form adm-form--2">
          <Field label={t("Cena iz cenovnika bez datuma (€, „od”)", "Price-list price without dates (€, \"from\")")}>
            <Input {...text("listPrice")} inputMode="decimal" />
          </Field>
          <Field label={t("Osnova cene", "Price basis")}>
            <Select value={form.listBasis} onChange={(event) => set("listBasis", event.target.value as Basis)}>
              {BASES.map((basis) => (
                <option key={basis} value={basis}>
                  {pick(PRICE_BASIS[basis], language)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </section>

      <section className="adm-form adm-form--2">
        <Field label={t("Cena obuhvata", "Price includes")} hint={t("Jedna stavka po redu", "One item per line")}>
          <Textarea {...text("included")} rows={4} />
        </Field>
        <Field label={t("Cena ne obuhvata", "Price excludes")} hint={t("Jedna stavka po redu", "One item per line")}>
          <Textarea {...text("excluded")} rows={4} />
        </Field>
        <Field label={t("Opis", "Description")} className="adm-span">
          <Textarea {...text("descriptionText")} rows={4} />
        </Field>
        <Field label={t("Program po danima", "Day-by-day program")} hint={t("Npr. „1. dan: …” u svakom redu", "E.g. \"Day 1: …\" on each line")} className="adm-span">
          <Textarea {...text("programText")} rows={5} />
        </Field>
        <Field label={t("Napomene", "Notes")} className="adm-span">
          <Textarea {...text("notesText")} rows={3} />
        </Field>
        <Field label={t("Organizator", "Organizer")} hint={t("Prikazuje se uz ponudu na sajtu.", "Shown with the offer on the site.")}>
          <Input {...text("organizerName")} maxLength={120} placeholder={defaultOrganizer} />
        </Field>
        <Field label={t("Licenca organizatora", "Organizer license")}>
          <Input {...text("organizerLicense")} maxLength={120} />
        </Field>
      </section>

      <section className="adm-stack">
        <p className="adm-section-title" style={{ margin: 0 }}>
          {t("Fotografije (prva je naslovna)", "Photos (the first is the cover)")}
        </p>
        {form.images.length ? (
          <ul className="adm-row" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {form.images.map((image, index) => (
              <li key={image.storageId} className="adm-row" style={{ gap: "0.25rem", flexWrap: "nowrap" }}>
                {image.url ? <Thumb src={image.url} width={88} height={66} /> : <span className="adm-thumb adm-muted" style={{ width: 88, height: 66, display: "grid", placeItems: "center", fontSize: "0.75rem" }}>{t("slika", "image")}</span>}
                <Button size="sm" variant="secondary" aria-label={t(`Ukloni sliku ${index + 1}`, `Remove image ${index + 1}`)} onClick={() => set("images", form.images.filter((_, i) => i !== index))}>
                  <Trash aria-hidden="true" strokeWidth={1.5} />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
        <label className="ui-btn ui-btn--secondary ui-btn--sm" style={{ width: "fit-content" }} aria-busy={uploading || undefined}>
          <Upload aria-hidden="true" strokeWidth={1.5} />
          <span>{uploading ? t("Otpremanje…", "Uploading…") : t("Dodaj fotografije", "Add photos")}</span>
          <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" className="ui-sr-only" disabled={uploading} onChange={(event) => void addImages(event.target.files)} />
        </label>
      </section>

      <div className="adm-sheet__foot" style={{ position: "sticky", bottom: "-1.25rem", margin: "0 -1.25rem -1.25rem", justifyContent: "flex-start" }}>
        {editing.mode === "draft" ? (
          <>
            <Button size="sm" type="button" onClick={() => void submit(true)} loading={busy} loadingLabel={t("Čuvamo…", "Saving…")}>
              {t("Sačuvaj i objavi", "Save and publish")}
            </Button>
            <Button size="sm" variant="secondary" type="submit" disabled={busy}>
              {t("Sačuvaj nacrt", "Save draft")}
            </Button>
          </>
        ) : (
          <Button size="sm" type="submit" loading={busy} loadingLabel={t("Objavljujemo…", "Publishing…")}>
            {editing.mode === "edit" ? t("Sačuvaj i objavi izmene", "Save and publish changes") : t("Sačuvaj i objavi", "Save and publish")}
          </Button>
        )}
        <Button size="sm" variant="secondary" type="button" onClick={onDone} disabled={busy}>
          {t("Odustani", "Cancel")}
        </Button>
      </div>
    </form>
  );
}
