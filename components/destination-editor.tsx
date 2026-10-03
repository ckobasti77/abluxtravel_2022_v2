"use client";

import {
  ChevronDownIcon,
  ChevronUpIcon,
  ImageIcon,
  PencilIcon,
  PlusIcon,
  TagIcon,
  TrashIcon,
} from "lucide-react";
import CmsImage from "@/components/cms-image";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { useSitePreferences } from "./site-preferences-provider";
import {
  Destination,
  useDestinationsByPage,
  useDestinationsByTrip,
} from "../lib/use-destinations";

type DestinationForm = {
  title: string;
  description: string;
  price: number;
  currency: string;
  order: number;
  isActive: boolean;
};

type DestinationEditorProps = {
  tripId?: string;
  pageSlug?: string;
  title?: string;
  description?: string;
};

const emptyForm: DestinationForm = {
  title: "",
  description: "",
  price: 0,
  currency: "EUR",
  order: 1,
  isActive: true,
};

export default function DestinationEditor({
  tripId,
  pageSlug,
  title,
  description,
}: DestinationEditorProps) {
  const { language } = useSitePreferences();
  const destinationsByTrip = useDestinationsByTrip(tripId, { includeInactive: true });
  const destinationsByPage = useDestinationsByPage(pageSlug, { includeInactive: true });
  const destinations = tripId ? destinationsByTrip : destinationsByPage;
  const upsertDestination = useMutation(api.destinations.upsert);
  const removeDestination = useMutation(api.destinations.remove);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DestinationForm>(emptyForm);
  const [imageStorageIds, setImageStorageIds] = useState<Id<"_storage">[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const editorTitle =
    title ??
    (language === "sr" ? "Destinacije putovanja" : "Trip destinations");
  const editorDescription =
    description ??
    (language === "sr"
      ? "Dodaj, izmeni ili obriši destinacije vezane za ovo putovanje."
      : "Add, edit, or remove destinations linked to this trip.");

  const updateField = <K extends keyof DestinationForm>(
    key: K,
    value: DestinationForm[K],
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
          setImagePreviewUrls((prev) => [...prev, URL.createObjectURL(file)]);
        }
      }
    } catch {
      setStatus(
        language === "sr"
          ? "Otpremanje slika nije uspelo."
          : "Image upload failed.",
      );
    }
    setUploading(false);
  };

  const removeImage = (index: number) => {
    setImageStorageIds((prev) => prev.filter((_, i) => i !== index));
    setImagePreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ ...emptyForm, order: destinations.length + 1 });
    setImageStorageIds([]);
    setImagePreviewUrls([]);
    setShowForm(false);
    setStatus(null);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setStatus(
        language === "sr"
          ? "Naslov destinacije je obavezan."
          : "Destination title is required.",
      );
      return;
    }

    setSaving(true);
    setStatus(null);
    try {
      const currentDestination = editingId
        ? destinations.find((item) => item._id === editingId)
        : undefined;
      if (!tripId && !pageSlug) {
        setStatus(
          language === "sr"
            ? "Nije pronađeno putovanje za ovu stranicu."
            : "No travel page found for this destination.",
        );
        setSaving(false);
        return;
      }

      await upsertDestination({
        id: editingId ? (editingId as Id<"destinations">) : undefined,
        tripId: tripId ? (tripId as Id<"trips">) : undefined,
        pageSlug: pageSlug || undefined,
        offerType: currentDestination?.offerType ?? "own",
        title: form.title,
        description: form.description,
        price: Number(form.price),
        currency: form.currency,
        departureDate: currentDestination?.departureDate,
        returnDate: currentDestination?.returnDate,
        departureCity: currentDestination?.departureCity,
        durationLabel: currentDestination?.durationLabel,
        partnerName: currentDestination?.partnerName,
        partnerOfferCode: currentDestination?.partnerOfferCode,
        iframeUrl: currentDestination?.iframeUrl,
        externalUrl: currentDestination?.externalUrl,
        contactNote: currentDestination?.contactNote,
        imageStorageIds,
        order: Number(form.order),
        isActive: form.isActive,
      });
      setStatus(
        language === "sr" ? "Destinacija je sačuvana." : "Destination saved.",
      );
      resetForm();
    } catch {
      setStatus(
        language === "sr" ? "Greška pri čuvanju." : "Save failed.",
      );
    }
    setSaving(false);
  };

  const startEdit = (item: Destination) => {
    setEditingId(item._id);
    setForm({
      title: item.title,
      description: item.description,
      price: item.price,
      currency: item.currency,
      order: item.order,
      isActive: item.isActive,
    });
    setImageStorageIds(item.imageStorageIds as Id<"_storage">[]);
    setImagePreviewUrls(item.imageUrls.filter(Boolean));
    setShowForm(true);
    setExpandedCard(null);
  };

  const handleDelete = async (id: string) => {
    const confirmText =
      language === "sr"
        ? "Obrisati ovu destinaciju?"
        : "Delete this destination?";
    if (!window.confirm(confirmText)) return;
    await removeDestination({ id: id as Id<"destinations"> });
    if (editingId === id) resetForm();
  };

  const formatPrice = (price: number, currency: string) =>
    new Intl.NumberFormat(language === "sr" ? "sr-Latn-RS" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(price);

  return (
    <section className="grid gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">{editorTitle}</h3>
          <p className="mt-1 text-sm text-muted">{editorDescription}</p>
        </div>
        {!showForm ? (
          <button
            type="button"
            className="btn-primary text-sm"
            onClick={() => {
              setForm({ ...emptyForm, order: destinations.length + 1 });
              setShowForm(true);
            }}
          >
            <PlusIcon strokeWidth={1.5} size="1em" className="text-xs" />
            {language === "sr" ? "Dodaj destinaciju" : "Add destination"}
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="rounded-2xl border border-[var(--primary)]/30 bg-[var(--surface)] p-5">
          <h4 className="mb-4 text-lg font-semibold">
            {editingId
              ? language === "sr"
                ? "Izmena destinacije"
                : "Edit destination"
              : language === "sr"
                ? "Nova destinacija"
                : "New destination"}
          </h4>

          <div className="grid gap-5">
            <div>
              <p className="mb-2 text-sm font-semibold">
                {language === "sr" ? "Slike destinacije" : "Destination images"}
              </p>
              <div className="flex flex-wrap gap-3">
                {imagePreviewUrls.map((url, i) => (
                  <div
                    key={i}
                    className="group relative h-20 w-20 overflow-hidden rounded-xl border border-[var(--line)]"
                  >
                    <CmsImage src={url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100"
                    >
                      <TrashIcon strokeWidth={1.5} size="1em" className="text-sm text-white" />
                    </button>
                  </div>
                ))}
                <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-[var(--line)] text-muted transition hover:border-[var(--primary)] hover:text-[var(--primary)]">
                  <ImageIcon strokeWidth={1.5} size="1em" className="text-lg" />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(event) => void handleImageUpload(event.target.files)}
                  />
                </label>
              </div>
              {uploading ? (
                <p className="mt-2 text-xs text-muted">
                  {language === "sr" ? "Otpremanje..." : "Uploading..."}
                </p>
              ) : null}
            </div>

            <label className="grid gap-1.5">
              <span className="text-sm font-semibold">
                {language === "sr" ? "Naslov" : "Title"}
              </span>
              <input
                className="control"
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                placeholder={
                  language === "sr" ? "npr. Rim, Santorini..." : "e.g. Rome, Santorini..."
                }
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-sm font-semibold">
                {language === "sr" ? "Opis" : "Description"}
              </span>
              <textarea
                className="control min-h-[6rem]"
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-4">
              <label className="grid gap-1.5 sm:col-span-2">
                <span className="text-sm font-semibold">
                  {language === "sr" ? "Cena" : "Price"}
                </span>
                <input
                  type="number"
                  min={0}
                  className="control"
                  value={form.price}
                  onChange={(event) => updateField("price", Number(event.target.value))}
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
                  {language === "sr" ? "Redosled" : "Order"}
                </span>
                <input
                  type="number"
                  min={1}
                  className="control"
                  value={form.order}
                  onChange={(event) => updateField("order", Number(event.target.value))}
                />
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => updateField("isActive", event.target.checked)}
              />
              {language === "sr" ? "Aktivna destinacija" : "Active destination"}
            </label>

            <div className="flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-4">
              <button
                type="button"
                className="btn-primary"
                onClick={() => void handleSave()}
                disabled={saving}
              >
                {saving
                  ? language === "sr"
                    ? "Čuvanje..."
                    : "Saving..."
                  : language === "sr"
                    ? "Sačuvaj destinaciju"
                    : "Save destination"}
              </button>
              <button type="button" className="btn-secondary" onClick={resetForm}>
                {language === "sr" ? "Otkaži" : "Cancel"}
              </button>
              {status ? <span className="text-sm text-muted">{status}</span> : null}
            </div>
          </div>
        </div>
      ) : null}

      {destinations.length > 0 ? (
        <div className="grid gap-3">
          {destinations.map((item) => {
            const expanded = expandedCard === item._id;
            const active = item.isActive;
            return (
              <article
                key={item._id}
                className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] transition"
              >
                <button
                  type="button"
                  onClick={() => setExpandedCard(expanded ? null : item._id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[var(--bg-soft)]"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      active
                        ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                        : "bg-[var(--ablux-surface-2)] text-[var(--ablux-text-muted)]"
                    }`}
                  >
                    <TagIcon strokeWidth={1.5} size="1em" className="text-sm" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">{item.title}</p>
                      {!active ? (
                        <span className="shrink-0 rounded-full border border-[var(--ablux-line)] bg-[var(--ablux-surface-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--ablux-text-muted)]">
                          {language === "sr" ? "Neaktivno" : "Inactive"}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted">{formatPrice(item.price, item.currency)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        startEdit(item);
                      }}
                      className="rounded-lg border border-[var(--line)] p-2 text-xs text-muted transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                    >
                      <PencilIcon strokeWidth={1.5} size="1em" />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleDelete(item._id);
                      }}
                      className="rounded-lg border border-[var(--line)] p-2 text-xs text-muted transition hover:border-[var(--ablux-brick)] hover:text-[var(--ablux-brick)]"
                    >
                      <TrashIcon strokeWidth={1.5} size="1em" />
                    </button>
                    {expanded ? (
                      <ChevronUpIcon strokeWidth={1.5} size="1em" className="text-xs text-muted" />
                    ) : (
                      <ChevronDownIcon strokeWidth={1.5} size="1em" className="text-xs text-muted" />
                    )}
                  </div>
                </button>

                {expanded ? (
                  <div className="border-t border-[var(--line)] px-4 py-4">
                    {item.imageUrls.filter(Boolean).length > 0 ? (
                      <div className="mb-3 flex gap-2 overflow-x-auto pb-2">
                        {item.imageUrls.filter(Boolean).map((url, i) => (
                          <CmsImage
                            key={i}
                            src={url}
                            alt={`${item.title} ${i + 1}`}
                            className="h-28 w-auto shrink-0 rounded-xl border border-[var(--line)] object-cover"
                          />
                        ))}
                      </div>
                    ) : null}
                    {item.description ? (
                      <p className="text-sm text-muted">{item.description}</p>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : !showForm ? (
        <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--bg-soft)] p-6 text-center text-sm text-muted">
          {language === "sr"
            ? "Nema dodatih destinacija za ovo putovanje."
            : "No destinations added for this trip yet."}
        </div>
      ) : null}
    </section>
  );
}

