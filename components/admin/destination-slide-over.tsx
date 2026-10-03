"use client";

import {
  XIcon,
  CloudUploadIcon,
  TrashIcon,
} from "lucide-react";
import CmsImage from "@/components/cms-image";
import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useSitePreferences } from "../site-preferences-provider";
import { Destination } from "../../lib/use-destinations";

type DestinationSlideOverProps = {
  open: boolean;
  destination: Destination | null;
  tripId?: string;
  pageSlug?: string;
  offerMode?: boolean;
  onClose: () => void;
};

type DestinationForm = {
  offerType: "own" | "subagency";
  title: string;
  description: string;
  price: number;
  currency: string;
  departureDate: string;
  returnDate: string;
  departureCity: string;
  durationLabel: string;
  partnerName: string;
  partnerOfferCode: string;
  iframeUrl: string;
  externalUrl: string;
  contactNote: string;
  order: number;
  isActive: boolean;
};

const emptyForm: DestinationForm = {
  offerType: "own",
  title: "",
  description: "",
  price: 0,
  currency: "EUR",
  departureDate: "",
  returnDate: "",
  departureCity: "",
  durationLabel: "",
  partnerName: "",
  partnerOfferCode: "",
  iframeUrl: "",
  externalUrl: "",
  contactNote: "",
  order: 1,
  isActive: true,
};

const formFromDestination = (destination: Destination): DestinationForm => ({
  offerType: destination.offerType ?? "own",
  title: destination.title,
  description: destination.description,
  price: destination.price,
  currency: destination.currency,
  departureDate: destination.departureDate ?? "",
  returnDate: destination.returnDate ?? "",
  departureCity: destination.departureCity ?? "",
  durationLabel: destination.durationLabel ?? "",
  partnerName: destination.partnerName ?? "",
  partnerOfferCode: destination.partnerOfferCode ?? "",
  iframeUrl: destination.iframeUrl ?? "",
  externalUrl: destination.externalUrl ?? "",
  contactNote: destination.contactNote ?? "",
  order: destination.order,
  isActive: destination.isActive,
});

export default function DestinationSlideOver({
  open,
  destination,
  tripId,
  pageSlug,
  offerMode = false,
  onClose,
}: DestinationSlideOverProps) {
  const { language } = useSitePreferences();
  const upsertDestination = useMutation(api.destinations.upsert);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const panelRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<DestinationForm>(() =>
    destination
      ? formFromDestination(destination)
      : { ...emptyForm, currency: offerMode ? "EUR" : "USD" }
  );
  const [imageStorageIds, setImageStorageIds] = useState<Id<"_storage">[]>(
    () =>
      destination ? (destination.imageStorageIds as Id<"_storage">[]) : []
  );
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>(
    () => (destination ? destination.imageUrls.filter(Boolean) : [])
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const isSubagency = offerMode && form.offerType === "subagency";
  const showOwnOfferFields = offerMode && !isSubagency;
  const showImageFields = !offerMode || !isSubagency;
  const preserveHiddenAgencyFields = !offerMode;

  const updateField = <K extends keyof DestinationForm>(
    key: K,
    value: DestinationForm[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const uploadUrl = await generateUploadUrl({});
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const json = await result.json();
        const storageId = json.storageId as Id<"_storage">;
        if (storageId) {
          setImageStorageIds((prev) => [...prev, storageId]);
          setImagePreviewUrls((prev) => [
            ...prev,
            URL.createObjectURL(file),
          ]);
        }
      }
    } catch {
      setStatus(
        language === "sr"
          ? "Otpremanje slika nije uspelo."
          : "Image upload failed."
      );
    }
    setUploading(false);
  };

  const removeImage = (index: number) => {
    setImageStorageIds((prev) => prev.filter((_, i) => i !== index));
    setImagePreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    void handleImageUpload(e.dataTransfer.files);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setStatus(
        language === "sr"
          ? "Naslov destinacije je obavezan."
          : "Destination title is required."
      );
      return;
    }

    if (!tripId && !pageSlug) {
      setStatus(
        language === "sr"
          ? "Nije pronađeno putovanje."
          : "No trip/page context found."
      );
      return;
    }

    if (isSubagency && !form.iframeUrl.trim()) {
      setStatus(
        language === "sr"
          ? "Iframe link je obavezan za subagenturu."
          : "Iframe URL is required for subagency offers."
      );
      return;
    }

    setSaving(true);
    setStatus(null);

    try {
      await upsertDestination({
        id: destination
          ? (destination._id as Id<"destinations">)
          : undefined,
        tripId: tripId ? (tripId as Id<"trips">) : undefined,
        pageSlug: pageSlug || undefined,
        offerType: offerMode ? form.offerType : destination?.offerType,
        title: form.title,
        description: form.description,
        price: Number(form.price),
        currency: form.currency,
        departureDate: showOwnOfferFields
          ? form.departureDate || undefined
          : destination?.departureDate,
        returnDate: showOwnOfferFields
          ? form.returnDate || undefined
          : destination?.returnDate,
        departureCity: showOwnOfferFields
          ? form.departureCity || undefined
          : destination?.departureCity,
        durationLabel: showOwnOfferFields
          ? form.durationLabel || undefined
          : destination?.durationLabel,
        partnerName: isSubagency
          ? form.partnerName || undefined
          : preserveHiddenAgencyFields
            ? destination?.partnerName
            : undefined,
        partnerOfferCode: isSubagency
          ? form.partnerOfferCode || undefined
          : preserveHiddenAgencyFields
            ? destination?.partnerOfferCode
            : undefined,
        iframeUrl: isSubagency
          ? form.iframeUrl || undefined
          : preserveHiddenAgencyFields
            ? destination?.iframeUrl
            : undefined,
        externalUrl: isSubagency
          ? form.externalUrl || undefined
          : preserveHiddenAgencyFields
            ? destination?.externalUrl
            : undefined,
        contactNote: isSubagency
          ? form.contactNote || undefined
          : preserveHiddenAgencyFields
            ? destination?.contactNote
            : undefined,
        imageStorageIds: isSubagency ? [] : imageStorageIds,
        order: Number(form.order),
        isActive: form.isActive,
      });

      onClose();
    } catch {
      setStatus(
        language === "sr" ? "Greška pri čuvanju." : "Save failed."
      );
    }
    setSaving(false);
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-[var(--ablux-overlay)] transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over panel, full-screen on mobile and max-w-md on desktop */}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-[var(--line)] bg-[var(--surface-strong)] shadow-2xl transition-transform sm:max-w-md"
        style={{ animation: "admin-slide-in-right 0.25s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-4 sm:px-6">
          <h3 className="min-w-0 truncate text-base font-bold">
            {destination
              ? `${language === "sr" ? "Uredi" : "Edit"}: ${destination.title}`
              : language === "sr"
                ? "Nova destinacija"
                : "New Destination"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-[var(--muted)] transition hover:bg-[var(--bg-soft)] hover:text-[var(--text)]"
          >
            <XIcon strokeWidth={1.5} size="1em" className="text-lg" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <div className="grid gap-5">
            {offerMode ? (
              <div className="grid gap-2">
                <span className="text-sm font-semibold">
                  {language === "sr" ? "Tip destinacije" : "Destination type"}
                </span>
                <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--bg-soft)] p-1">
                  {[
                    {
                      value: "own" as const,
                      label: language === "sr" ? "Naša ponuda" : "Our offer",
                    },
                    {
                      value: "subagency" as const,
                      label: "Subagentura",
                    },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateField("offerType", option.value)}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                        form.offerType === option.value
                          ? "bg-[var(--primary)] text-[var(--bg)] shadow-sm"
                          : "text-[var(--muted)] hover:text-[var(--text)]"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Title */}
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold">
                {language === "sr" ? "Naziv" : "Name"}
              </span>
              <input
                className="control"
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder={
                  language === "sr"
                    ? "Kapadokija - Nebo od balona"
                    : "Cappadocia - Sky of Balloons"
                }
              />
            </label>

            {/* Image upload zone */}
            {showImageFields ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition ${
                  dragOver
                    ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                    : "border-[var(--line)] bg-[var(--bg-soft)]"
                }`}
              >
                <CloudUploadIcon strokeWidth={1.5} size="1em" className="mb-2 text-2xl text-[var(--muted)]" />
                <p className="text-sm font-semibold">
                  {offerMode
                    ? language === "sr"
                      ? "Slike naše ponude"
                      : "Our offer images"
                    : language === "sr"
                      ? "Učitajte sliku"
                      : "Upload image"}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {offerMode
                    ? language === "sr"
                      ? "Prevucite slike ovde ili kliknite da odaberete"
                      : "Drag & drop images or click to browse"
                    : language === "sr"
                      ? "Prevucite sliku ovde ili kliknite da odaberete"
                      : "Drag & drop or click to browse"}
                </p>
                <label className="mt-3 cursor-pointer rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-xs font-medium text-[var(--muted)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]">
                  {language === "sr" ? "Odaberi fajl" : "Choose file"}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => void handleImageUpload(e.target.files)}
                  />
                </label>
                {uploading ? (
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    {language === "sr" ? "Otpremanje..." : "Uploading..."}
                  </p>
                ) : null}
              </div>
            ) : null}

            {/* Image previews */}
            {showImageFields && imagePreviewUrls.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {imagePreviewUrls.map((url, i) => (
                  <div
                    key={i}
                    className="group relative h-16 w-16 overflow-hidden rounded-lg border border-[var(--line)]"
                  >
                    <CmsImage
                      src={url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100"
                    >
                      <TrashIcon strokeWidth={1.5} size="1em" className="text-xs text-white" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Price + Currency */}
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold">
                {isSubagency
                  ? language === "sr"
                    ? "Cena od (opciono)"
                    : "Price from (optional)"
                  : language === "sr"
                    ? "Cena"
                    : "Price"}
              </span>
              <div className="grid gap-2 sm:grid-cols-[1fr_6rem]">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="control"
                  value={form.price}
                  onChange={(e) =>
                    updateField("price", Number(e.target.value))
                  }
                />
                <input
                  className="control !w-28"
                  value={form.currency}
                  onChange={(e) =>
                    updateField("currency", e.target.value)
                  }
                  placeholder="EUR, RSD, ДИН..."
                />
              </div>
            </label>

            {offerMode && !isSubagency ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold">
                    {language === "sr" ? "Grad polaska" : "Departure city"}
                  </span>
                  <input
                    className="control"
                    value={form.departureCity}
                    onChange={(e) =>
                      updateField("departureCity", e.target.value)
                    }
                    placeholder={language === "sr" ? "Beograd" : "Belgrade"}
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold">
                    {language === "sr" ? "Trajanje" : "Duration"}
                  </span>
                  <input
                    className="control"
                    value={form.durationLabel}
                    onChange={(e) =>
                      updateField("durationLabel", e.target.value)
                    }
                    placeholder={
                      language === "sr" ? "7 dana / 6 noći" : "7 days / 6 nights"
                    }
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold">
                    {language === "sr" ? "Datum polaska" : "Departure date"}
                  </span>
                  <input
                    type="date"
                    className="control"
                    value={form.departureDate}
                    onChange={(e) =>
                      updateField("departureDate", e.target.value)
                    }
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
                    onChange={(e) => updateField("returnDate", e.target.value)}
                  />
                </label>
              </div>
            ) : offerMode && isSubagency ? (
              <div className="grid gap-4">
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold">
                    {language === "sr" ? "Iframe link ili kod" : "Iframe URL or code"}
                  </span>
                  <input
                    className="control"
                    value={form.iframeUrl}
                    onChange={(e) => updateField("iframeUrl", e.target.value)}
                    placeholder="https://partnerska-agencija.rs/ponuda/embed"
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1.5">
                    <span className="text-sm font-semibold">
                      {language === "sr"
                        ? "Naziv subagenture"
                        : "Subagency name"}
                    </span>
                    <input
                      className="control"
                      value={form.partnerName}
                      onChange={(e) =>
                        updateField("partnerName", e.target.value)
                      }
                      placeholder={
                        language === "sr"
                          ? "Prijateljska agencija"
                          : "Partner agency"
                      }
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-sm font-semibold">
                      {language === "sr" ? "Šifra ponude" : "Offer code"}
                    </span>
                    <input
                      className="control"
                      value={form.partnerOfferCode}
                      onChange={(e) =>
                        updateField("partnerOfferCode", e.target.value)
                      }
                    />
                  </label>
                </div>
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold">
                    {language === "sr"
                      ? "Direktan link ponude"
                      : "Direct offer URL"}
                  </span>
                  <input
                    className="control"
                    value={form.externalUrl}
                    onChange={(e) => updateField("externalUrl", e.target.value)}
                    placeholder="https://partnerska-agencija.rs/ponuda"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold">
                    {language === "sr" ? "Napomena za upit" : "Inquiry note"}
                  </span>
                  <textarea
                    className="control !min-h-[90px]"
                    value={form.contactNote}
                    onChange={(e) => updateField("contactNote", e.target.value)}
                    placeholder={
                      language === "sr"
                        ? "Npr. proveriti cenu i dostupnost kod partnera pre potvrde."
                        : "Example: verify price and availability with partner before confirmation."
                    }
                  />
                </label>
              </div>
            ) : null}

            <label className="grid gap-1.5">
              <span className="text-sm font-semibold">
                {language === "sr" ? "Redosled prikaza" : "Display order"}
              </span>
              <input
                type="number"
                min={1}
                className="control"
                value={form.order}
                onChange={(e) =>
                  updateField("order", Number(e.target.value || "1"))
                }
              />
            </label>

            {/* Description, plain textarea */}
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold">
                {language === "sr" ? "Kratak opis" : "Short description"}
              </span>
              <textarea
                className="control !min-h-[120px]"
                value={form.description}
                onChange={(e) =>
                  updateField("description", e.target.value)
                }
                placeholder={
                  language === "sr"
                    ? "Opišite destinaciju…"
                    : "Describe the destination..."
                }
              />
            </label>

            {/* Status toggle */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold">Status</span>
              <button
                type="button"
                onClick={() =>
                  updateField("isActive", !form.isActive)
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
                  form.isActive
                    ? "bg-[var(--ablux-c-teal)]"
                    : "bg-[var(--ablux-stone)]"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    form.isActive
                      ? "translate-x-5"
                      : "translate-x-0.5"
                  }`}
                />
              </button>
              <span
                className={`text-xs font-medium ${
                  form.isActive
                    ? "text-[var(--ablux-teal-text)]"
                    : "text-[var(--muted)]"
                }`}
              >
                {form.isActive
                  ? language === "sr"
                    ? "Aktivan"
                    : "Active"
                  : language === "sr"
                    ? "Neaktivno"
                    : "Inactive"}
              </span>
            </div>

            {/* Status message */}
            {status ? (
              <p className="rounded-lg border border-[var(--ablux-brick)] bg-[color-mix(in_srgb,var(--ablux-brick)_8%,transparent)] px-3 py-2 text-sm text-[var(--ablux-brick)]">
                {status}
              </p>
            ) : null}
          </div>
        </div>

        {/* Sticky footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[var(--line)] px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-sm"
          >
            {language === "sr" ? "Otkaži" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="btn-primary text-sm"
          >
            {saving
              ? language === "sr"
                ? "Čuvanje..."
                : "Saving..."
              : language === "sr"
                ? "Sačuvaj promene"
                : "Save Changes"}
          </button>
        </div>
      </div>
    </>
  );
}

