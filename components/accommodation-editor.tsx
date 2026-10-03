"use client";

import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  ImageIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  HouseIcon,
  BuildingComplexIcon,
  HotelIcon,
  DoorOpenIcon,
  BedDoubleIcon,
  EllipsisIcon,
  UtensilsIcon,
  MapPinIcon,
  ClockIcon,
} from "lucide-react";
import CmsImage from "@/components/cms-image";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { useSitePreferences } from "./site-preferences-provider";
import {
  useAccommodationsByTrip,
  Accommodation,
  AccommodationType,
  BoardType,
} from "../lib/use-accommodations";

const typeIcons: Record<AccommodationType, typeof HouseIcon> = {
  villa: HouseIcon,
  apartment: BuildingComplexIcon,
  hotel: HotelIcon,
  room: DoorOpenIcon,
  hostel: BedDoubleIcon,
  other: EllipsisIcon,
};

const typeOptions: AccommodationType[] = [
  "villa",
  "apartment",
  "hotel",
  "room",
  "hostel",
  "other",
];

const boardOptions: BoardType[] = ["ro", "bb", "hb", "fb", "ai"];

type AccommodationForm = {
  name: string;
  type: AccommodationType;
  description: string;
  pricePerPerson: number;
  currency: string;
  capacity: number;
  amenitiesText: string;
  boardType: BoardType | "";
  roomInfo: string;
  checkIn: string;
  checkOut: string;
  distanceToCenter: string;
  order: number;
  isActive: boolean;
};

const emptyForm: AccommodationForm = {
  name: "",
  type: "hotel",
  description: "",
  pricePerPerson: 0,
  currency: "EUR",
  capacity: 2,
  amenitiesText: "",
  boardType: "",
  roomInfo: "",
  checkIn: "14:00",
  checkOut: "10:00",
  distanceToCenter: "",
  order: 1,
  isActive: true,
};

export default function AccommodationEditor({ tripId }: { tripId: string }) {
  const { dictionary, language } = useSitePreferences();
  const t = dictionary.accommodation;
  const accommodations = useAccommodationsByTrip(tripId, { includeInactive: true });
  const upsertAccommodation = useMutation(api.accommodations.upsert);
  const removeAccommodation = useMutation(api.accommodations.remove);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AccommodationForm>(emptyForm);
  const [imageStorageIds, setImageStorageIds] = useState<Id<"_storage">[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const updateField = <K extends keyof AccommodationForm>(
    key: K,
    value: AccommodationForm[K]
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
        language === "sr" ? "Otpremanje slika nije uspelo." : "Image upload failed."
      );
    }
    setUploading(false);
  };

  const removeImage = (index: number) => {
    setImageStorageIds((prev) => prev.filter((_, i) => i !== index));
    setImagePreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setStatus(
        language === "sr" ? "Naziv je obavezan." : "Name is required."
      );
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      await upsertAccommodation({
        id: editingId
          ? (editingId as Id<"accommodations">)
          : undefined,
        tripId: tripId as Id<"trips">,
        name: form.name,
        type: form.type,
        description: form.description,
        pricePerPerson: Number(form.pricePerPerson),
        currency: form.currency,
        capacity: Number(form.capacity),
        amenities: form.amenitiesText
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean),
        boardType: form.boardType || undefined,
        roomInfo: form.roomInfo || undefined,
        checkIn: form.checkIn || undefined,
        checkOut: form.checkOut || undefined,
        distanceToCenter: form.distanceToCenter || undefined,
        imageStorageIds,
        order: Number(form.order),
        isActive: form.isActive,
      });
      setStatus(language === "sr" ? "Smeštaj sačuvan." : "Accommodation saved.");
      resetForm();
    } catch {
      setStatus(
        language === "sr" ? "Greška pri čuvanju." : "Save failed."
      );
    }
    setSaving(false);
  };

  const startEdit = (acc: Accommodation) => {
    setEditingId(acc._id);
    setForm({
      name: acc.name,
      type: acc.type,
      description: acc.description,
      pricePerPerson: acc.pricePerPerson,
      currency: acc.currency,
      capacity: acc.capacity,
      amenitiesText: acc.amenities.join("\n"),
      boardType: acc.boardType || "",
      roomInfo: acc.roomInfo || "",
      checkIn: acc.checkIn || "14:00",
      checkOut: acc.checkOut || "10:00",
      distanceToCenter: acc.distanceToCenter || "",
      order: acc.order,
      isActive: acc.isActive,
    });
    setImageStorageIds(acc.imageStorageIds as Id<"_storage">[]);
    setImagePreviewUrls(acc.imageUrls.filter(Boolean));
    setShowForm(true);
    setExpandedCard(null);
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(t.deleteConfirm);
    if (!confirmed) return;
    await removeAccommodation({ id: id as Id<"accommodations"> });
    if (editingId === id) resetForm();
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      order: accommodations.length + 1,
    });
    setImageStorageIds([]);
    setImagePreviewUrls([]);
    setShowForm(false);
    setStatus(null);
  };

  return (
    <section className="grid gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">{t.title}</h3>
          <p className="mt-1 text-sm text-muted">{t.subtitle}</p>
        </div>
        {!showForm && (
          <button
            type="button"
            className="btn-primary text-sm"
            onClick={() => {
              setForm({ ...emptyForm, order: accommodations.length + 1 });
              setShowForm(true);
            }}
          >
            <PlusIcon strokeWidth={1.5} size="1em" className="text-xs" />
            {t.addNew}
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-2xl border border-[var(--primary)]/30 bg-[var(--surface)] p-5">
          <h4 className="mb-4 text-lg font-semibold">
            {editingId ? t.editUnit : t.addNew}
          </h4>

          <div className="grid gap-5">
            {/* Images */}
            <div>
              <p className="mb-2 text-sm font-semibold">{t.images}</p>
              <div className="flex flex-wrap gap-3">
                {imagePreviewUrls.map((url, i) => (
                  <div
                    key={i}
                    className="group relative h-20 w-20 overflow-hidden rounded-xl border border-[var(--line)]"
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
                    onChange={(e) => void handleImageUpload(e.target.files)}
                  />
                </label>
              </div>
              {uploading && (
                <p className="mt-2 text-xs text-muted">
                  {language === "sr" ? "Otpremanje..." : "Uploading..."}
                </p>
              )}
            </div>

            {/* Name & Type */}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-sm font-semibold">{t.name}</span>
                <input
                  className="control"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder={
                    language === "sr"
                      ? "npr. Vila Sunset, Hotel Palace..."
                      : "e.g. Villa Sunset, Hotel Palace..."
                  }
                />
              </label>
              <div className="grid gap-1.5">
                <span className="text-sm font-semibold">{t.type}</span>
                <div className="flex flex-wrap gap-2">
                  {typeOptions.map((opt) => {
                    const Icon = typeIcons[opt];
                    const active = form.type === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => updateField("type", opt)}
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                          active
                            ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                            : "border-[var(--line)] hover:border-[var(--primary)]"
                        }`}
                      >
                        <Icon className="text-xs" />
                        {t[opt]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Description */}
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold">{t.description}</span>
              <textarea
                className="control min-h-[5rem]"
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
              />
            </label>

            {/* Price, Currency, Capacity */}
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="grid gap-1.5">
                <span className="text-sm font-semibold">{t.pricePerPerson}</span>
                <input
                  type="number"
                  min={0}
                  className="control"
                  value={form.pricePerPerson}
                  onChange={(e) =>
                    updateField("pricePerPerson", Number(e.target.value))
                  }
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm font-semibold">{t.currency}</span>
                <input
                  className="control"
                  value={form.currency}
                  onChange={(e) => updateField("currency", e.target.value)}
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm font-semibold">
                  {t.capacity} ({t.capacityUnit})
                </span>
                <input
                  type="number"
                  min={1}
                  className="control"
                  value={form.capacity}
                  onChange={(e) =>
                    updateField("capacity", Number(e.target.value))
                  }
                />
              </label>
            </div>

            {/* Board Type */}
            <div className="grid gap-1.5">
              <span className="text-sm font-semibold">{t.boardType}</span>
              <div className="flex flex-wrap gap-2">
                {boardOptions.map((opt) => {
                  const active = form.boardType === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() =>
                        updateField("boardType", active ? "" : opt)
                      }
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                        active
                          ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                          : "border-[var(--line)] hover:border-[var(--primary)]"
                      }`}
                    >
                      <UtensilsIcon strokeWidth={1.5} size="1em" className="text-[10px]" />
                      {t[opt]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Room info, Check-in/out, Distance */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="grid gap-1.5">
                <span className="text-sm font-semibold">{t.roomInfo}</span>
                <input
                  className="control"
                  value={form.roomInfo}
                  onChange={(e) => updateField("roomInfo", e.target.value)}
                  placeholder={
                    language === "sr"
                      ? "npr. Dvokrevetna sa pogledom na more"
                      : "e.g. Double room with sea view"
                  }
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm font-semibold">{t.checkIn}</span>
                <input
                  type="time"
                  className="control"
                  value={form.checkIn}
                  onChange={(e) => updateField("checkIn", e.target.value)}
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm font-semibold">{t.checkOut}</span>
                <input
                  type="time"
                  className="control"
                  value={form.checkOut}
                  onChange={(e) => updateField("checkOut", e.target.value)}
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm font-semibold">
                  {t.distanceToCenter}
                </span>
                <input
                  className="control"
                  value={form.distanceToCenter}
                  onChange={(e) =>
                    updateField("distanceToCenter", e.target.value)
                  }
                  placeholder={language === "sr" ? "npr. 500m" : "e.g. 500m"}
                />
              </label>
            </div>

            {/* Amenities */}
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold">{t.amenities}</span>
              <textarea
                className="control min-h-[5rem]"
                value={form.amenitiesText}
                onChange={(e) => updateField("amenitiesText", e.target.value)}
                placeholder={t.amenitiesPlaceholder}
              />
            </label>

            {/* Order & Active */}
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="grid gap-1.5">
                <span className="text-sm font-semibold">{t.order}</span>
                <input
                  type="number"
                  min={1}
                  className="control"
                  value={form.order}
                  onChange={(e) => updateField("order", Number(e.target.value))}
                />
              </label>
              <label className="flex items-end gap-2 pb-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => updateField("isActive", e.target.checked)}
                />
                <span className="text-sm font-semibold">{t.active}</span>
              </label>
            </div>

            {/* Actions */}
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
                  : t.save}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={resetForm}
              >
                {t.cancel}
              </button>
              {status && (
                <span className="text-sm text-muted">{status}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Existing Accommodations */}
      {accommodations.length > 0 ? (
        <div className="grid gap-3">
          {accommodations.map((acc) => {
            const Icon = typeIcons[acc.type];
            const expanded = expandedCard === acc._id;
            return (
              <div
                key={acc._id}
                className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] overflow-hidden transition"
              >
                {/* Card header */}
                <button
                  type="button"
                  onClick={() =>
                    setExpandedCard(expanded ? null : acc._id)
                  }
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[var(--bg-soft)]"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      acc.isActive
                        ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                        : "bg-[var(--ablux-surface-2)] text-[var(--ablux-text-muted)]"
                    }`}
                  >
                    <Icon className="text-sm" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">
                        {acc.name}
                      </p>
                      {!acc.isActive && (
                        <span className="shrink-0 rounded-full border border-[var(--ablux-line)] bg-[var(--ablux-surface-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--ablux-text-muted)]">
                          {t.unavailable}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted">
                      <span>{t[acc.type]}</span>
                      <span>|</span>
                      <span>
                        {new Intl.NumberFormat(
                          language === "sr" ? "sr-Latn-RS" : "en-US",
                          {
                            style: "currency",
                            currency: acc.currency,
                            maximumFractionDigits: 0,
                          }
                        ).format(acc.pricePerPerson)}{" "}
                        {t.perPerson}
                      </span>
                      <span>|</span>
                      <span>
                        {t.upTo} {acc.capacity} {t.guests}
                      </span>
                      {acc.boardType && (
                        <>
                          <span>|</span>
                          <span>{t[acc.boardType]}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(acc);
                      }}
                      className="rounded-lg border border-[var(--line)] p-2 text-xs text-muted transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                    >
                      <PencilIcon strokeWidth={1.5} size="1em" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDelete(acc._id);
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

                {/* Expanded details */}
                {expanded && (
                  <div className="border-t border-[var(--line)] px-4 py-4">
                    {/* Images row */}
                    {acc.imageUrls.filter(Boolean).length > 0 && (
                      <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
                        {acc.imageUrls.filter(Boolean).map((url, i) => (
                          <CmsImage
                            key={i}
                            src={url}
                            alt={`${acc.name} ${i + 1}`}
                            className="h-28 w-auto shrink-0 rounded-xl border border-[var(--line)] object-cover"
                          />
                        ))}
                      </div>
                    )}

                    {acc.description && (
                      <p className="mb-3 text-sm text-muted">
                        {acc.description}
                      </p>
                    )}

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {acc.roomInfo && (
                        <div className="flex items-center gap-2 text-sm">
                          <DoorOpenIcon strokeWidth={1.5} size="1em" className="shrink-0 text-xs text-muted" />
                          <span>{acc.roomInfo}</span>
                        </div>
                      )}
                      {acc.checkIn && (
                        <div className="flex items-center gap-2 text-sm">
                          <ClockIcon strokeWidth={1.5} size="1em" className="shrink-0 text-xs text-muted" />
                          <span>
                            {t.checkIn}: {acc.checkIn}
                          </span>
                        </div>
                      )}
                      {acc.checkOut && (
                        <div className="flex items-center gap-2 text-sm">
                          <ClockIcon strokeWidth={1.5} size="1em" className="shrink-0 text-xs text-muted" />
                          <span>
                            {t.checkOut}: {acc.checkOut}
                          </span>
                        </div>
                      )}
                      {acc.distanceToCenter && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPinIcon strokeWidth={1.5} size="1em" className="shrink-0 text-xs text-muted" />
                          <span>{acc.distanceToCenter}</span>
                        </div>
                      )}
                    </div>

                    {acc.amenities.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {acc.amenities.map((a, i) => (
                          <span
                            key={i}
                            className="rounded-full border border-[var(--line)] bg-[var(--bg-soft)] px-2.5 py-1 text-xs"
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : !showForm ? (
        <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--bg-soft)] p-6 text-center text-sm text-muted">
          {t.noUnits}
        </div>
      ) : null}
    </section>
  );
}

