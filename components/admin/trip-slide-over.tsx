"use client";

import {
  XIcon,
  CloudUploadIcon,
  TrashIcon,
  PlusIcon,
  BusIcon,
  PlaneIcon,
  CarIcon,
  TrainFrontIcon,
  UserIcon,
  ChevronDownIcon,
} from "lucide-react";
import CmsImage from "@/components/cms-image";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useSitePreferences } from "../site-preferences-provider";
import {
  Trip,
  TripHeroMediaType,
  TripStatus,
  TransportType,
} from "../../lib/use-trips";
import { useCategories } from "../../lib/use-categories";
import IconPicker from "../icon-picker";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ItineraryItem = { day: number; date: string; description: string };

type TripForm = {
  title: string;
  description: string;
  slug: string;
  price: number;
  currency: string;
  nights: number;
  days: number;
  transport: TransportType;
  departureDate: string;
  returnDate: string;
  departureCity: string;
  hotelInfo: string;
  depositPercentage: number;
  depositDeadline: string;
  itinerary: ItineraryItem[];
  includedText: string;
  notIncludedText: string;
  categoryId: string;
  isHero: boolean;
  heroIcon: string;
  status: TripStatus;
  featured: boolean;
  order: number;
};

const emptyForm: TripForm = {
  title: "",
  description: "",
  slug: "",
  price: 0,
  currency: "RSD",
  nights: 0,
  days: 0,
  transport: "bus",
  departureDate: "",
  returnDate: "",
  departureCity: "",
  hotelInfo: "",
  depositPercentage: 0,
  depositDeadline: "",
  itinerary: [{ day: 1, date: "", description: "" }],
  includedText: "",
  notIncludedText: "",
  categoryId: "",
  isHero: false,
  heroIcon: "",
  status: "upcoming",
  featured: false,
  order: 1,
};

const formFromTrip = (trip: Trip): TripForm => ({
  title: trip.title,
  description: trip.description,
  slug: trip.slug,
  price: trip.price,
  currency: trip.currency,
  nights: trip.nights,
  days: trip.days,
  transport: trip.transport,
  departureDate: trip.departureDate,
  returnDate: trip.returnDate,
  departureCity: trip.departureCity,
  hotelInfo: trip.hotelInfo || "",
  depositPercentage: trip.depositPercentage || 0,
  depositDeadline: trip.depositDeadline || "",
  itinerary:
    trip.itinerary.length > 0
      ? trip.itinerary
      : [{ day: 1, date: "", description: "" }],
  includedText: trip.included.join("\n"),
  notIncludedText: trip.notIncluded.join("\n"),
  categoryId: trip.categoryId || "",
  isHero: trip.isHero || false,
  heroIcon: trip.heroIcon || "",
  status: trip.status,
  featured: trip.featured,
  order: trip.order,
});

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[čć]/g, "c")
    .replace(/[š]/g, "s")
    .replace(/[ž]/g, "z")
    .replace(/[đ]/g, "dj")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const resolveHeroMediaType = (file: File): TripHeroMediaType | undefined => {
  if (file.type === "video/mp4") return "video";
  if (file.type.startsWith("image/")) return "image";

  const normalized = file.name.toLowerCase();
  if (normalized.endsWith(".mp4")) return "video";
  if (/\.(jpg|jpeg|png|webp|avif)$/.test(normalized)) return "image";
  return undefined;
};

type DetailMediaItem = {
  storageId: Id<"_storage">;
  mediaType: TripHeroMediaType;
  mediaName?: string;
  previewUrl: string;
};

const transportOptions: { value: TransportType; icon: typeof BusIcon }[] = [
  { value: "bus", icon: BusIcon },
  { value: "plane", icon: PlaneIcon },
  { value: "car", icon: CarIcon },
  { value: "train", icon: TrainFrontIcon },
  { value: "self", icon: UserIcon },
];

type TripSlideOverProps = {
  open: boolean;
  trip: Trip | null;
  source?: "arrangements" | "putovanja";
  onClose: () => void;
};

/* ------------------------------------------------------------------ */
/*  Lightweight collapsible section (inside slide-over)               */
/* ------------------------------------------------------------------ */

function Section({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
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

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function TripSlideOver({
  open,
  trip,
  source = "arrangements",
  onClose,
}: TripSlideOverProps) {
  const { language, dictionary } = useSitePreferences();
  const upsertTrip = useMutation(api.trips.upsert);
  const upsertJourney = useMutation(api.slides.upsertTravelGroup);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const arrangementCategories = useCategories("arrangement");

  const t = dictionary.tripDetail;
  const a = dictionary.admin;
  const isPutovanja = source === "putovanja";
  const groupLabel = isPutovanja
    ? language === "sr"
      ? "putovanje"
      : "trip"
    : language === "sr"
      ? "aranžman"
      : "package";
  const groupLabelTitle = isPutovanja
    ? language === "sr"
      ? "Putovanje"
      : "Trip"
    : language === "sr"
      ? "Aranžman"
      : "Package";
  const sectionHref = isPutovanja ? "/putovanja" : "/aranzmani";

  const [form, setForm] = useState<TripForm>(() =>
    trip ? formFromTrip(trip) : emptyForm
  );
  const [detailMediaItems, setDetailMediaItems] = useState<DetailMediaItem[]>(
    () =>
      trip
        ? trip.detailMedia && trip.detailMedia.length > 0
          ? trip.detailMedia
              .filter((media) => Boolean(media.url))
              .map((media) => ({
                storageId: media.storageId as Id<"_storage">,
                mediaType: media.mediaType,
                mediaName: media.mediaName,
                previewUrl: media.url,
              }))
          : trip.imageStorageIds.map((storageId, index) => ({
              storageId: storageId as Id<"_storage">,
              mediaType: "image" as const,
              previewUrl: trip.imageUrls[index] ?? "",
            }))
        : []
  );
  const [heroMediaStorageId, setHeroMediaStorageId] = useState<
    Id<"_storage"> | undefined
  >(() =>
    trip?.heroMediaStorageId
      ? (trip.heroMediaStorageId as Id<"_storage">)
      : undefined
  );
  const [heroMediaType, setHeroMediaType] = useState<
    TripHeroMediaType | undefined
  >(() => trip?.heroMediaType);
  const [heroMediaName, setHeroMediaName] = useState(
    () => trip?.heroMediaName ?? ""
  );
  const [heroMediaPreviewUrl, setHeroMediaPreviewUrl] = useState(
    () => trip?.heroMediaUrl ?? ""
  );
  const [uploading, setUploading] = useState(false);
  const [heroUploading, setHeroUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);


  /* Helpers */
  const updateField = <K extends keyof TripForm>(
    key: K,
    value: TripForm[K]
  ) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "title" && !trip) {
        next.slug = slugify(value as string);
      }
      return next;
    });
  };

  const handleDetailMediaUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const mediaType = resolveHeroMediaType(file);
        if (!mediaType) {
          setStatus(
            language === "sr"
              ? "Detaljni mediji mogu biti MP4, JPG, JPEG, PNG, WEBP ili AVIF."
              : "Detail media can be MP4, JPG, JPEG, PNG, WEBP, or AVIF."
          );
          continue;
        }
        const uploadUrl = await generateUploadUrl({});
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const json = await result.json();
        const storageId = json.storageId as Id<"_storage">;
        if (storageId) {
          setDetailMediaItems((prev) => [
            ...prev,
            {
              storageId,
              mediaType,
              mediaName: file.name,
              previewUrl: URL.createObjectURL(file),
            },
          ]);
        }
      }
    } catch {
      setStatus(
        language === "sr"
          ? "Otpremanje detaljnih medija nije uspelo."
          : "Detail media upload failed."
      );
    }
    setUploading(false);
  };

  const handleHeroMediaUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    const nextMediaType = resolveHeroMediaType(file);
    if (!nextMediaType) {
      setStatus(
        language === "sr"
          ? "Hero pozadina može biti MP4, JPG, JPEG, PNG, WEBP ili AVIF."
          : "Hero background can be MP4, JPG, JPEG, PNG, WEBP, or AVIF."
      );
      return;
    }

    setHeroUploading(true);
    setStatus(null);
    try {
      const uploadUrl = await generateUploadUrl({});
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const json = await result.json();
      const storageId = json.storageId as Id<"_storage"> | undefined;

      if (!storageId) {
        throw new Error("Upload failed.");
      }

      setHeroMediaStorageId(storageId);
      setHeroMediaType(nextMediaType);
      setHeroMediaName(file.name);
      setHeroMediaPreviewUrl(URL.createObjectURL(file));
    } catch {
      setStatus(
        language === "sr"
          ? "Otpremanje hero pozadine nije uspelo."
          : "Hero background upload failed."
      );
    }
    setHeroUploading(false);
  };

  const removeHeroMedia = () => {
    setHeroMediaStorageId(undefined);
    setHeroMediaType(undefined);
    setHeroMediaName("");
    setHeroMediaPreviewUrl("");
  };

  const removeDetailMedia = (index: number) => {
    setDetailMediaItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    void handleDetailMediaUpload(e.dataTransfer.files);
  };

  const addItineraryDay = () => {
    setForm((prev) => ({
      ...prev,
      itinerary: [
        ...prev.itinerary,
        { day: prev.itinerary.length + 1, date: "", description: "" },
      ],
    }));
  };

  const removeItineraryDay = (index: number) => {
    setForm((prev) => ({
      ...prev,
      itinerary: prev.itinerary
        .filter((_, i) => i !== index)
        .map((item, i) => ({ ...item, day: i + 1 })),
    }));
  };

  const updateItinerary = (
    index: number,
    field: keyof ItineraryItem,
    value: string | number
  ) => {
    setForm((prev) => ({
      ...prev,
      itinerary: prev.itinerary.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  /* Save */
  const handleSave = async () => {
    if (!form.title || !form.slug) {
      setStatus(
        language === "sr" ? "Naslov je obavezan." : "Title is required."
      );
      return;
    }

    setSaving(true);
    setStatus(null);

    try {
      const detailMedia = detailMediaItems.map((item) => ({
        storageId: item.storageId,
        mediaType: item.mediaType,
        mediaName: item.mediaName,
      }));
      const imageStorageIds = detailMediaItems
        .filter((item) => item.mediaType === "image")
        .map((item) => item.storageId);
      const payload = {
        slug: form.slug,
        title: form.title,
        description: form.description,
        price: Number(form.price),
        currency: form.currency,
        nights: Number(form.nights),
        days: Number(form.days),
        transport: form.transport,
        departureDate: form.departureDate,
        returnDate: form.returnDate,
        departureCity: form.departureCity,
        hotelInfo: form.hotelInfo || undefined,
        depositPercentage: form.depositPercentage || undefined,
        depositDeadline: form.depositDeadline || undefined,
        itinerary: form.itinerary,
        included: form.includedText
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean),
        notIncluded: form.notIncludedText
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean),
        imageStorageIds,
        detailMedia,
        heroMediaType: heroMediaStorageId ? heroMediaType : undefined,
        heroMediaStorageId,
        heroMediaName:
          heroMediaStorageId && heroMediaName ? heroMediaName : undefined,
        categoryId: form.categoryId
          ? (form.categoryId as Id<"categories">)
          : undefined,
        isHero: form.isHero || undefined,
        heroIcon: form.isHero && form.heroIcon ? form.heroIcon : undefined,
        status: form.status,
        featured: form.featured,
        order: Number(form.order),
      };

      if (isPutovanja) {
        await upsertJourney({
          id: trip ? (trip._id as Id<"slides">) : undefined,
          ...payload,
        });
      } else {
        await upsertTrip({
          id: trip ? (trip._id as Id<"trips">) : undefined,
          ...payload,
        });
      }

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

      {/* Panel */}
      <div
        className="fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-[var(--line)] bg-[var(--surface-strong)] shadow-2xl sm:max-w-xl"
        style={{ animation: "admin-slide-in-right 0.25s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-4 sm:px-6">
          <h3 className="min-w-0 truncate text-base font-bold">
            {trip
              ? `${language === "sr" ? "Uredi" : "Edit"}: ${trip.title}`
              : language === "sr"
                ? `Novo ${groupLabelTitle}`
                : `New ${groupLabelTitle}`}
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
            {/* Hero media */}
            <Section
              title={language === "sr" ? "Hero pozadina" : "Hero background"}
            >
              <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-soft)] p-3">
                {heroMediaPreviewUrl ? (
                  <div className="mb-3 overflow-hidden rounded-lg border border-[var(--line)] bg-black">
                    {heroMediaType === "video" ? (
                      <video
                        src={heroMediaPreviewUrl}
                        className="aspect-video w-full object-cover"
                        muted
                        loop
                        playsInline
                      />
                    ) : (
                      <CmsImage
                        src={heroMediaPreviewUrl}
                        alt=""
                        className="aspect-video w-full object-cover"
                      />
                    )}
                  </div>
                ) : (
                  <div className="mb-3 flex aspect-video items-center justify-center rounded-lg border border-dashed border-[var(--line)]">
                    <CloudUploadIcon strokeWidth={1.5} size="1em" className="text-2xl text-[var(--muted)]" />
                  </div>
                )}
                <p className="text-sm font-semibold">
                  {language === "sr"
                    ? "Glavna slika/video za pozadinu"
                    : "Main background image/video"}
                </p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                  {language === "sr"
                    ? `Ovaj medij se prikazuje na glavnoj ${sectionHref} stranici za ovo ${groupLabel}.`
                    : `This media is shown on the main ${sectionHref} page for this ${groupLabel}.`}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-xs font-medium text-[var(--muted)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]">
                    {language === "sr" ? "Odaberi medij" : "Choose media"}
                    <input
                      type="file"
                      accept="video/mp4,image/jpeg,image/png,image/webp,image/avif"
                      className="hidden"
                      onChange={(e) => void handleHeroMediaUpload(e.target.files)}
                    />
                  </label>
                  {heroMediaPreviewUrl ? (
                    <button
                      type="button"
                      onClick={removeHeroMedia}
                      className="rounded-lg border border-[var(--line)] px-4 py-2 text-xs font-medium text-[var(--muted)] transition hover:border-[var(--ablux-brick)] hover:text-[var(--ablux-brick)]"
                    >
                      {language === "sr" ? "Ukloni" : "Remove"}
                    </button>
                  ) : null}
                  {heroUploading ? (
                    <span className="text-xs text-[var(--muted)]">
                      {language === "sr" ? "Otpremanje..." : "Uploading..."}
                    </span>
                  ) : null}
                </div>
              </div>
            </Section>

            {/* Detail media */}
            <Section
              title={
                language === "sr"
                  ? "Mediji za pojedinačnu stranicu"
                  : "Detail page media"
              }
            >
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
                  {language === "sr"
                    ? "Dodaj dodatne slike ili video"
                    : "Upload additional images or video"}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {language === "sr"
                    ? "Ova grupa medija prikazuje se na stranici pojedinačnog putovanja / aranžmana."
                    : "Drag & drop or click to browse"}
                </p>
                <label className="mt-3 cursor-pointer rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-xs font-medium text-[var(--muted)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]">
                  {language === "sr" ? "Odaberi fajlove" : "Choose files"}
                  <input
                    type="file"
                    accept="video/mp4,image/jpeg,image/png,image/webp,image/avif"
                    multiple
                    className="hidden"
                    onChange={(e) => void handleDetailMediaUpload(e.target.files)}
                  />
                </label>
                {uploading ? (
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    {language === "sr" ? "Otpremanje..." : "Uploading..."}
                  </p>
                ) : null}
              </div>
              {detailMediaItems.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {detailMediaItems.map((item, i) => (
                    <div
                      key={i}
                      className="group relative h-16 w-20 overflow-hidden rounded-lg border border-[var(--line)] bg-black"
                    >
                      {item.mediaType === "video" ? (
                        <video
                          src={item.previewUrl}
                          className="h-full w-full object-cover"
                          muted
                          loop
                          playsInline
                        />
                      ) : (
                        <CmsImage
                          src={item.previewUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeDetailMedia(i)}
                        className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100"
                      >
                        <TrashIcon strokeWidth={1.5} size="1em" className="text-xs text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </Section>

            {/* Basic info */}
            <Section
              title={language === "sr" ? "Osnovne informacije" : "Basic info"}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold">{a.slideTitle}</span>
                  <input
                    className="control"
                    value={form.title}
                    onChange={(e) => updateField("title", e.target.value)}
                    required
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold">Slug</span>
                  <input
                    className="control"
                    value={form.slug}
                    onChange={(e) => updateField("slug", e.target.value)}
                  />
                </label>
              </div>
              <label className="grid gap-1.5">
                <span className="text-sm font-semibold">{a.slideCopy}</span>
                <textarea
                  className="control !min-h-[80px]"
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                />
              </label>
            </Section>

            {/* Category and hero */}
            <Section
              title={
                language === "sr" ? "Kategorija & hero" : "Category & hero"
              }
              defaultOpen={false}
            >
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {language === "sr"
                    ? "Kategorija aranžmana"
                    : "Arrangement category"}
                </span>
                <select
                  className="control"
                  value={form.categoryId}
                  onChange={(e) => updateField("categoryId", e.target.value)}
                >
                  <option value="">{a.categorySelectPlaceholder}</option>
                  {arrangementCategories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {language === "sr" ? cat.name.sr : cat.name.en}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={form.isHero}
                  onChange={(e) => updateField("isHero", e.target.checked)}
                  className="h-4 w-4 rounded accent-[var(--primary)]"
                />
                <span className="font-semibold">
                  {language === "sr"
                    ? "Glavno putovanje (prikazuje se na početnoj)"
                    : "Main trip (shown on homepage hero)"}
                </span>
              </label>
              {form.isHero ? (
                <IconPicker
                  value={form.heroIcon}
                  onChange={(icon) => updateField("heroIcon", icon)}
                  label={
                    language === "sr"
                      ? "Ikonica za hero sekciju"
                      : "Hero section icon"
                  }
                />
              ) : null}
            </Section>

            {/* Duration */}
            <Section
              title={language === "sr" ? "Trajanje" : "Duration"}
            >
              <div className="grid grid-cols-2 gap-4">
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold">{t.nights}</span>
                  <input
                    type="number"
                    min={0}
                    className="control"
                    value={form.nights}
                    onChange={(e) =>
                      updateField("nights", Number(e.target.value))
                    }
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold">{t.days}</span>
                  <input
                    type="number"
                    min={0}
                    className="control"
                    value={form.days}
                    onChange={(e) =>
                      updateField("days", Number(e.target.value))
                    }
                  />
                </label>
              </div>
            </Section>

            {/* Transport */}
            <Section title={t.transport}>
              <div className="flex flex-wrap gap-2">
                {transportOptions.map((opt) => {
                  const Icon = opt.icon;
                  const active = form.transport === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateField("transport", opt.value)}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition ${
                        active
                          ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                          : "border-[var(--line)] hover:border-[var(--primary)]"
                      }`}
                    >
                      <Icon />
                      {t[opt.value]}
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* Dates and departure */}
            <Section
              title={
                language === "sr" ? "Datumi i polazak" : "Dates & departure"
              }
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold">{t.departure}</span>
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
                    {t.returnLabel}
                  </span>
                  <input
                    type="date"
                    className="control"
                    value={form.returnDate}
                    onChange={(e) => updateField("returnDate", e.target.value)}
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold">
                    {t.departureCity}
                  </span>
                  <input
                    className="control"
                    value={form.departureCity}
                    onChange={(e) =>
                      updateField("departureCity", e.target.value)
                    }
                  />
                </label>
              </div>
            </Section>

            {/* Hotel and deposit */}
            <Section
              title={
                language === "sr" ? "Hotel i depozit" : "Hotel & deposit"
              }
              defaultOpen={false}
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold">{t.hotel}</span>
                  <input
                    className="control"
                    value={form.hotelInfo}
                    onChange={(e) => updateField("hotelInfo", e.target.value)}
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold">
                    {t.deposit} (%)
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="control"
                    value={form.depositPercentage}
                    onChange={(e) =>
                      updateField(
                        "depositPercentage",
                        Number(e.target.value)
                      )
                    }
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold">
                    {t.depositDeadline}
                  </span>
                  <input
                    type="date"
                    className="control"
                    value={form.depositDeadline}
                    onChange={(e) =>
                      updateField("depositDeadline", e.target.value)
                    }
                  />
                </label>
              </div>
            </Section>

            {/* Itinerary */}
            <Section title={t.itinerary} defaultOpen={false}>
              <div className="grid gap-2">
                {form.itinerary.map((item, index) => (
                  <div
                    key={index}
                    className="grid gap-2 rounded-lg border border-[var(--line)] bg-[var(--bg-soft)] p-2.5 sm:grid-cols-[50px_120px_1fr_auto]"
                  >
                    <label className="grid gap-1">
                      <span className="text-[10px] uppercase text-[var(--muted)]">
                        {t.days}
                      </span>
                      <input
                        type="number"
                        min={1}
                        className="control !text-xs"
                        value={item.day}
                        onChange={(e) =>
                          updateItinerary(
                            index,
                            "day",
                            Number(e.target.value)
                          )
                        }
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-[10px] uppercase text-[var(--muted)]">
                        {language === "sr" ? "Datum" : "Date"}
                      </span>
                      <input
                        type="date"
                        className="control !text-xs"
                        value={item.date}
                        onChange={(e) =>
                          updateItinerary(index, "date", e.target.value)
                        }
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-[10px] uppercase text-[var(--muted)]">
                        {a.slideCopy}
                      </span>
                      <input
                        className="control !text-xs"
                        value={item.description}
                        onChange={(e) =>
                          updateItinerary(
                            index,
                            "description",
                            e.target.value
                          )
                        }
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => removeItineraryDay(index)}
                      className="self-end rounded-lg border border-[var(--line)] p-1.5 text-xs text-[var(--muted)] transition hover:border-[var(--ablux-brick)] hover:text-[var(--ablux-brick)]"
                    >
                      <TrashIcon strokeWidth={1.5} size="1em" className="text-[10px]" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addItineraryDay}
                  className="flex w-fit items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                >
                  <PlusIcon strokeWidth={1.5} size="1em" className="text-[10px]" />
                  {language === "sr" ? "Dodaj dan" : "Add day"}
                </button>
              </div>
            </Section>

            {/* Included / Not included */}
            <Section
              title={`${t.included} / ${t.notIncluded}`}
              defaultOpen={false}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold">{t.included}</span>
                  <textarea
                    className="control !min-h-[100px]"
                    value={form.includedText}
                    onChange={(e) =>
                      updateField("includedText", e.target.value)
                    }
                    placeholder={
                      language === "sr"
                        ? "Svaki red = jedna stavka"
                        : "Each line = one item"
                    }
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold">
                    {t.notIncluded}
                  </span>
                  <textarea
                    className="control !min-h-[100px]"
                    value={form.notIncludedText}
                    onChange={(e) =>
                      updateField("notIncludedText", e.target.value)
                    }
                    placeholder={
                      language === "sr"
                        ? "Svaki red = jedna stavka"
                        : "Each line = one item"
                    }
                  />
                </label>
              </div>
            </Section>

            {/* Status and order */}
            <Section
              title={
                language === "sr" ? "Status i redosled" : "Status & order"
              }
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold">Status</span>
                  <select
                    className="control"
                    value={form.status}
                    onChange={(e) =>
                      updateField("status", e.target.value as TripStatus)
                    }
                  >
                    <option value="active">{t.statusActive}</option>
                    <option value="upcoming">{t.statusUpcoming}</option>
                    <option value="completed">{t.statusCompleted}</option>
                  </select>
                </label>
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold">{a.order}</span>
                  <input
                    type="number"
                    min={1}
                    className="control"
                    value={form.order}
                    onChange={(e) =>
                      updateField("order", Number(e.target.value))
                    }
                  />
                </label>
                <label className="flex items-end gap-2 pb-2">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) =>
                      updateField("featured", e.target.checked)
                    }
                    className="h-4 w-4 rounded accent-[var(--primary)]"
                  />
                  <span className="text-sm font-semibold">{t.featured}</span>
                </label>
              </div>
            </Section>

            {/* Error message */}
            {status ? (
              <p className="rounded-lg border border-[var(--ablux-brick)] bg-[color-mix(in_srgb,var(--ablux-brick)_8%,transparent)] px-3 py-2 text-sm text-[var(--ablux-brick)]">
                {status}
              </p>
            ) : null}
          </div>
        </div>

        {/* Footer */}
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
            disabled={saving || uploading || heroUploading}
            className="btn-primary text-sm"
          >
            {saving
              ? language === "sr"
                ? "Čuvanje..."
                : "Saving..."
              : language === "sr"
                ? "Sačuvaj"
                : "Save"}
          </button>
        </div>
      </div>
    </>
  );
}

