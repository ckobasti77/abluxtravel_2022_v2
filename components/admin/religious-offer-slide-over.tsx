"use client";

import {
  ChevronDownIcon,
  CloudUploadIcon,
  TrashIcon,
  XIcon,
} from "lucide-react";
import CmsImage from "@/components/cms-image";
import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { AggregatedOffer } from "../../lib/use-offers";
import {
  MANUAL_RELIGIOUS_SOURCE_SLUG,
  normalizeReligiousTags,
} from "../../lib/religious";
import { useCategories } from "../../lib/use-categories";
import { useSitePreferences } from "../site-preferences-provider";

type ReligiousOfferForm = {
  externalId: string;
  title: string;
  navTitle: string;
  destination: string;
  departureCity: string;
  departureDate: string;
  returnDate: string;
  price: string;
  currency: string;
  seatsLeft: string;
  tags: string;
};

const emptyForm: ReligiousOfferForm = {
  externalId: "",
  title: "",
  navTitle: "",
  destination: "",
  departureCity: "",
  departureDate: "",
  returnDate: "",
  price: "",
  currency: "EUR",
  seatsLeft: "",
  tags: "verski, hodočašće",
};

const parseNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formFromOffer = (offer: AggregatedOffer): ReligiousOfferForm => ({
  externalId: offer.externalId,
  title: offer.title,
  navTitle: offer.navTitle ?? "",
  destination: offer.destination,
  departureCity: offer.departureCity ?? "",
  departureDate: offer.departureDate ?? "",
  returnDate: offer.returnDate ?? "",
  price: String(offer.price),
  currency: offer.currency,
  seatsLeft: offer.seatsLeft ? String(offer.seatsLeft) : "",
  tags: offer.tags.join(", "),
});

function Section({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        className="flex w-full items-center gap-3 py-2"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          {title}
        </span>
        <div className="flex-1 border-t border-[var(--line)]" />
        <ChevronDownIcon strokeWidth={1.5} size="1em"
          className={`text-[10px] text-[var(--muted)] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open ? <div className="grid gap-4 pb-2">{children}</div> : null}
    </div>
  );
}

type ReligiousOfferSlideOverProps = {
  open: boolean;
  offer: AggregatedOffer | null;
  onClose: () => void;
  onSaved?: (message: string) => void;
};

export default function ReligiousOfferSlideOver({
  open,
  offer,
  onClose,
  onSaved,
}: ReligiousOfferSlideOverProps) {
  const { language, dictionary } = useSitePreferences();
  const upsertOffer = useMutation(api.offers.upsertOffer);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const religiousCategories = useCategories("religious");

  const [form, setForm] = useState<ReligiousOfferForm>(() =>
    offer ? formFromOffer(offer) : emptyForm
  );
  const [categoryId, setCategoryId] = useState(
    () => offer?.categoryId ?? ""
  );
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pdfStorageId, setPdfStorageId] = useState<Id<"_storage"> | null>(
    () => (offer?.pdfStorageId as Id<"_storage"> | undefined) ?? null
  );
  const [pdfUrl, setPdfUrl] = useState<string | null>(() => offer?.pdfUrl ?? null);
  const [pdfFileName, setPdfFileName] = useState(() => offer?.pdfFileName ?? "");
  const [pdfUploading, setPdfUploading] = useState(false);
  const [removePdfOnSave, setRemovePdfOnSave] = useState(false);
  const [imageStorageIds, setImageStorageIds] = useState<Id<"_storage">[]>(
    () => (offer?.imageStorageIds as Id<"_storage">[] | undefined) ?? []
  );
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>(
    () => (offer?.imageUrls ?? []).filter(Boolean)
  );
  const [imageUploading, setImageUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const updateField = <Key extends keyof ReligiousOfferForm>(
    key: Key,
    value: ReligiousOfferForm[Key]
  ) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const handlePdfUpload = async (file: File | null) => {
    if (!file) return;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setStatus(language === "sr" ? "Dozvoljen je samo PDF fajl." : "Only PDF files are allowed.");
      return;
    }

    setPdfUploading(true);
    setStatus(language === "sr" ? "Otpremanje PDF fajla..." : "Uploading PDF...");

    try {
      const uploadUrl = await generateUploadUrl({});
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/pdf" },
        body: file,
      });
      const json = await result.json();
      const storageId = json.storageId as Id<"_storage"> | undefined;

      if (!storageId) {
        throw new Error("Missing storage id");
      }

      setPdfStorageId(storageId);
      setPdfUrl(URL.createObjectURL(file));
      setPdfFileName(file.name);
      setRemovePdfOnSave(false);
      setStatus(language === "sr" ? "PDF je uspešno dodat." : "PDF uploaded successfully.");
    } catch {
      setStatus(language === "sr" ? "Otpremanje PDF fajla nije uspelo." : "PDF upload failed.");
    } finally {
      setPdfUploading(false);
    }
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setImageUploading(true);
    setStatus(language === "sr" ? "Otpremanje slika..." : "Uploading images...");

    try {
      const nextStorageIds: Id<"_storage">[] = [];
      const nextPreviewUrls: string[] = [];

      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          continue;
        }

        const uploadUrl = await generateUploadUrl({});
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        const json = await result.json();
        const storageId = json.storageId as Id<"_storage"> | undefined;

        if (!storageId) {
          throw new Error("Missing storage id");
        }

        nextStorageIds.push(storageId);
        nextPreviewUrls.push(URL.createObjectURL(file));
      }

      if (nextStorageIds.length === 0) {
        setStatus(
          language === "sr"
            ? "Nijedna validna slika nije odabrana."
            : "No valid image files were selected."
        );
        return;
      }

      setImageStorageIds((previous) => [...previous, ...nextStorageIds]);
      setImagePreviewUrls((previous) => [...previous, ...nextPreviewUrls]);
      setStatus(language === "sr" ? "Slike su uspešno dodate." : "Images uploaded successfully.");
    } catch {
      setStatus(language === "sr" ? "Otpremanje slika nije uspelo." : "Image upload failed.");
    } finally {
      setImageUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setImageStorageIds((previous) => previous.filter((_, i) => i !== index));
    setImagePreviewUrls((previous) => previous.filter((_, i) => i !== index));
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || pdfUploading || imageUploading) return;

    const title = form.title.trim();
    const destination = form.destination.trim();
    const price = parseNumber(form.price);
    const seatsLeft = form.seatsLeft.trim() ? parseNumber(form.seatsLeft) : null;

    if (!title || !destination || !price || price <= 0) {
      setStatus(
        language === "sr"
          ? "Unesite naziv, destinaciju i validnu cenu."
          : "Please enter title, destination, and a valid price."
      );
      return;
    }

    if (seatsLeft !== null && seatsLeft < 0) {
      setStatus(language === "sr" ? "Broj mesta ne može biti negativan." : "Seats cannot be negative.");
      return;
    }

    setBusy(true);
    setStatus(language === "sr" ? "Čuvanje ponude..." : "Saving offer...");

    try {
      const externalId = form.externalId.trim() || `REL-${Date.now()}`;
      const tags = normalizeReligiousTags(
        form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      );

      await upsertOffer({
        sourceSlug: MANUAL_RELIGIOUS_SOURCE_SLUG,
        externalId,
        title,
        destination,
        departureCity: form.departureCity.trim() || undefined,
        departureDate: form.departureDate || undefined,
        returnDate: form.returnDate || undefined,
        price,
        currency: form.currency.trim().toUpperCase() || "EUR",
        seatsLeft: seatsLeft ?? undefined,
        tags,
        navTitle: form.navTitle.trim() || undefined,
        pdfStorageId: pdfStorageId ?? undefined,
        pdfFileName: pdfStorageId ? pdfFileName || "brochure.pdf" : undefined,
        imageStorageIds,
        categoryId: categoryId
          ? (categoryId as unknown as Id<"categories">)
          : undefined,
        clearPdf: removePdfOnSave,
        normalizedHash: `${MANUAL_RELIGIOUS_SOURCE_SLUG}:${externalId}:${title}:${destination}:${price}`
          .toLowerCase()
          .replace(/\s+/g, "-"),
        score: 100,
        rawSnapshot: JSON.stringify({
          source: "manual-admin",
          editedAt: new Date().toISOString(),
        }),
        isActive: true,
      });

      const message =
        language === "sr"
          ? offer
            ? "Ponuda je ažurirana."
            : "Nova verska ponuda je sačuvana."
          : offer
            ? "Offer has been updated."
            : "Religious offer has been created.";

      onSaved?.(message);
      setBusy(false);
      onClose();
    } catch {
      setStatus(
        language === "sr"
          ? "Došlo je do greške pri čuvanju."
          : "Failed to save the offer."
      );
      setBusy(false);
    }
  };

  if (!open) return null;

  const disabled = busy || pdfUploading || imageUploading;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-[var(--ablux-overlay)] transition-opacity"
        onClick={onClose}
      />

      <aside
        className="fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-[var(--line)] bg-[var(--surface-strong)] shadow-2xl sm:max-w-2xl"
        style={{ animation: "admin-slide-in-right 0.25s ease-out" }}
        aria-label={language === "sr" ? "Editor verske ponude" : "Religious offer editor"}
      >
        <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              {language === "sr" ? "Verski turizam" : "Religious tourism"}
            </p>
            <h3 className="mt-1 min-w-0 truncate text-base font-bold">
              {offer
                ? `${language === "sr" ? "Uredi" : "Edit"}: ${offer.title}`
                : language === "sr"
                  ? "Novo versko putovanje"
                  : "New religious trip"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-[var(--muted)] transition hover:bg-[var(--bg-soft)] hover:text-[var(--text)]"
            aria-label={language === "sr" ? "Zatvori" : "Close"}
          >
            <XIcon strokeWidth={1.5} size="1em" className="text-lg" />
          </button>
        </div>

        <form
          id="religious-offer-form"
          onSubmit={(event) => void handleSave(event)}
          className="flex-1 overflow-y-auto px-4 py-5 sm:px-6"
        >
          <div className="grid gap-5">
            <Section title={language === "sr" ? "Osnovne informacije" : "Basic info"}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold">External ID</span>
                  <input
                    className="control"
                    value={form.externalId}
                    onChange={(event) => updateField("externalId", event.target.value)}
                    placeholder="REL-2026-001"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold">
                    {language === "sr" ? "Kategorija" : "Category"}
                  </span>
                  <select
                    className="control"
                    value={categoryId}
                    onChange={(event) => setCategoryId(event.target.value)}
                  >
                    <option value="">{dictionary.admin.categorySelectPlaceholder}</option>
                    {religiousCategories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {language === "sr" ? cat.name.sr : cat.name.en}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="grid gap-1.5">
                <span className="text-sm font-semibold">
                  {language === "sr" ? "Naziv ponude" : "Offer title"}
                </span>
                <input
                  className="control"
                  value={form.title}
                  onChange={(event) => updateField("title", event.target.value)}
                  required
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-sm font-semibold">
                  {language === "sr" ? "Kratak naslov za navigaciju" : "Short nav title"}
                </span>
                <input
                  className="control"
                  value={form.navTitle}
                  onChange={(event) => updateField("navTitle", event.target.value)}
                  placeholder={
                    language === "sr"
                      ? "npr. Ostrog i CG manastiri"
                      : "e.g. Ostrog & Montenegro"
                  }
                />
                <span className="text-xs text-[var(--muted)]">
                  {language === "sr"
                    ? "Prikazuje se kao podlink u navigaciji. Ostavite prazno ako ne želite prikaz."
                    : "Shown as a sub-link in navigation. Leave empty to hide from nav."}
                </span>
              </label>

              <label className="grid gap-1.5">
                <span className="text-sm font-semibold">
                  {language === "sr" ? "Destinacija" : "Destination"}
                </span>
                <input
                  className="control"
                  value={form.destination}
                  onChange={(event) => updateField("destination", event.target.value)}
                  required
                />
              </label>
            </Section>

            <Section title={language === "sr" ? "Cena i raspoloživost" : "Pricing and availability"}>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold">
                    {language === "sr" ? "Cena" : "Price"}
                  </span>
                  <input
                    type="number"
                    min={1}
                    className="control"
                    value={form.price}
                    onChange={(event) => updateField("price", event.target.value)}
                    required
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold">
                    {language === "sr" ? "Valuta" : "Currency"}
                  </span>
                  <input
                    className="control"
                    value={form.currency}
                    onChange={(event) => updateField("currency", event.target.value)}
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold">
                    {language === "sr" ? "Slobodna mesta" : "Seats left"}
                  </span>
                  <input
                    type="number"
                    min={0}
                    className="control"
                    value={form.seatsLeft}
                    onChange={(event) => updateField("seatsLeft", event.target.value)}
                  />
                </label>
              </div>
            </Section>

            <Section title={language === "sr" ? "Polazak i datumi" : "Departure and dates"}>
              <label className="grid gap-1.5">
                <span className="text-sm font-semibold">
                  {language === "sr" ? "Grad polaska" : "Departure city"}
                </span>
                <input
                  className="control"
                  value={form.departureCity}
                  onChange={(event) => updateField("departureCity", event.target.value)}
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold">
                    {language === "sr" ? "Datum polaska" : "Departure date"}
                  </span>
                  <input
                    type="date"
                    className="control"
                    value={form.departureDate}
                    onChange={(event) => updateField("departureDate", event.target.value)}
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold">
                    {language === "sr" ? "Datum povratka" : "Return date"}
                  </span>
                  <input
                    type="date"
                    className="control"
                    value={form.returnDate}
                    onChange={(event) => updateField("returnDate", event.target.value)}
                  />
                </label>
              </div>
            </Section>

            <Section title={language === "sr" ? "Tagovi" : "Tags"} defaultOpen={false}>
              <label className="grid gap-1.5">
                <span className="text-sm font-semibold">Tags</span>
                <input
                  className="control"
                  value={form.tags}
                  onChange={(event) => updateField("tags", event.target.value)}
                  placeholder="verski, hodočašće, manastiri"
                />
                <span className="text-xs text-[var(--muted)]">
                  {language === "sr"
                    ? "Razdvojite tagove zarezom. Tag 'verski' se automatski zadržava."
                    : "Separate tags with commas. The 'verski' tag is always preserved."}
                </span>
              </label>
            </Section>

            <Section title={language === "sr" ? "Slike ponude" : "Offer images"}>
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragOver(false);
                  void handleImageUpload(event.dataTransfer.files);
                }}
                className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 text-center transition ${
                  dragOver
                    ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                    : "border-[var(--line)] bg-[var(--bg-soft)]"
                }`}
              >
                <CloudUploadIcon strokeWidth={1.5} size="1em" className="text-2xl text-[var(--muted)]" />
                <p className="mt-2 text-sm font-semibold">
                  {imageUploading
                    ? language === "sr"
                      ? "Otpremanje slika..."
                      : "Uploading images..."
                    : language === "sr"
                      ? "Prevucite slike ili ih odaberite"
                      : "Drag images here or choose files"}
                </p>
                <label className="mt-3 cursor-pointer rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-xs font-medium text-[var(--muted)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]">
                  {language === "sr" ? "Dodaj slike" : "Upload images"}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    disabled={disabled}
                    onChange={(event) => void handleImageUpload(event.target.files)}
                  />
                </label>
              </div>

              {imagePreviewUrls.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {imagePreviewUrls.map((imageUrl, index) => (
                    <div
                      key={`${imageUrl}-${index}`}
                      className="group relative h-20 w-24 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--bg-soft)]"
                    >
                      <CmsImage
                        src={imageUrl}
                        alt={language === "sr" ? "Slika ponude" : "Offer image"}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100"
                        onClick={() => removeImage(index)}
                        disabled={disabled}
                        aria-label={language === "sr" ? "Ukloni sliku" : "Remove image"}
                      >
                        <TrashIcon strokeWidth={1.5} size="1em" className="text-xs text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </Section>

            <Section title={language === "sr" ? "PDF brošura" : "PDF brochure"} defaultOpen={Boolean(pdfUrl)}>
              <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-soft)] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-xs font-medium text-[var(--muted)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]">
                    {pdfUploading
                      ? language === "sr"
                        ? "Otpremanje..."
                        : "Uploading..."
                      : language === "sr"
                        ? "Dodaj PDF"
                        : "Upload PDF"}
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      className="hidden"
                      disabled={disabled}
                      onChange={(event) => void handlePdfUpload(event.target.files?.[0] ?? null)}
                    />
                  </label>

                  {pdfStorageId ? (
                    <button
                      type="button"
                      className="rounded-lg border border-[var(--line)] px-4 py-2 text-xs font-medium text-[var(--muted)] transition hover:border-[var(--ablux-brick)] hover:text-[var(--ablux-brick)]"
                      onClick={() => {
                        setPdfStorageId(null);
                        setPdfUrl(null);
                        setPdfFileName("");
                        setRemovePdfOnSave(true);
                      }}
                      disabled={disabled}
                    >
                      {language === "sr" ? "Ukloni PDF" : "Remove PDF"}
                    </button>
                  ) : null}

                  {pdfUrl ? (
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-[var(--line)] px-4 py-2 text-xs font-medium text-[var(--muted)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                    >
                      {language === "sr" ? "Otvori PDF" : "Open PDF"}
                    </a>
                  ) : null}
                </div>

                {pdfFileName ? (
                  <p className="mt-2 text-xs text-[var(--muted)]">{pdfFileName}</p>
                ) : null}
              </div>

              {pdfUrl ? (
                <iframe
                  src={`${pdfUrl}#toolbar=1&navpanes=0`}
                  className="h-80 w-full rounded-xl border border-[var(--line)] bg-white"
                  title={language === "sr" ? "Pregled PDF brošure" : "PDF brochure preview"}
                />
              ) : null}
            </Section>

            {status ? (
              <p className="rounded-lg border border-[var(--line)] bg-[var(--primary-soft)] px-3 py-2 text-sm text-[var(--text)]">
                {status}
              </p>
            ) : null}
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 border-t border-[var(--line)] px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-sm"
          >
            {language === "sr" ? "Otkaži" : "Cancel"}
          </button>
          <button
            type="submit"
            form="religious-offer-form"
            disabled={disabled}
            className="btn-primary text-sm"
          >
            {busy
              ? language === "sr"
                ? "Čuvanje..."
                : "Saving..."
              : offer
                ? language === "sr"
                  ? "Sačuvaj izmene"
                  : "Save changes"
                : language === "sr"
                  ? "Dodaj ponudu"
                  : "Add offer"}
          </button>
        </div>
      </aside>
    </>
  );
}
