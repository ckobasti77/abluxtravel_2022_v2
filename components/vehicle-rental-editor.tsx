"use client";

import {
  BusIcon,
  CloudUploadIcon,
  SaveIcon,
  ImagesIcon,
  TrashIcon,
  VanIcon,
  XIcon,
} from "lucide-react";
import CmsImage from "@/components/cms-image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useMutation, useQuery } from "convex/react";
import ImageLightbox, { type LightboxImage } from "./image-lightbox";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import {
  VEHICLE_RENTAL_ITEMS,
  type VehicleRentalKey,
} from "../lib/vehicle-rentals";
import { useSitePreferences } from "./site-preferences-provider";

type VehicleRentalImageRecord = {
  key: VehicleRentalKey;
  storageId: Id<"_storage"> | null;
  imageUrl: string | null;
  additionalStorageIds: Id<"_storage">[];
  additionalImageUrls: (string | null)[];
  updatedAt: number | null;
};

type PendingGalleryImage = {
  id: string;
  file: File;
  previewUrl: string;
};

const iconByKey: Record<VehicleRentalKey, typeof BusIcon> = {
  bus: BusIcon,
  luxuryVan: VanIcon,
};

const isAllowedImage = (file: File) =>
  file.type.startsWith("image/") ||
  /\.(avif|jpe?g|png|webp)$/i.test(file.name);

const getPendingImageId = (file: File) =>
  `${file.name}-${file.lastModified}-${file.size}-${Math.random()
    .toString(36)
    .slice(2)}`;

export default function VehicleRentalEditor() {
  const { language } = useSitePreferences();
  const records = useQuery(api.vehicleRentalImages.list) as
    | VehicleRentalImageRecord[]
    | undefined;
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const deleteFile = useMutation(api.files.deleteById);
  const upsertImage = useMutation(api.vehicleRentalImages.upsert);
  const addAdditionalImages = useMutation(api.vehicleRentalImages.addAdditional);
  const removeAdditionalImage = useMutation(
    api.vehicleRentalImages.removeAdditional
  );
  const removeImage = useMutation(api.vehicleRentalImages.remove);

  const [files, setFiles] = useState<Partial<Record<VehicleRentalKey, File>>>(
    {}
  );
  const [previews, setPreviews] = useState<
    Partial<Record<VehicleRentalKey, string>>
  >({});
  const previewsRef = useRef(previews);
  const [galleryFiles, setGalleryFiles] = useState<
    Partial<Record<VehicleRentalKey, PendingGalleryImage[]>>
  >({});
  const galleryFilesRef = useRef(galleryFiles);
  const [savingKey, setSavingKey] = useState<VehicleRentalKey | null>(null);
  const [status, setStatus] = useState<
    Partial<Record<VehicleRentalKey, string>>
  >({});
  const [lightboxState, setLightboxState] = useState<{
    key: VehicleRentalKey;
    index: number;
  } | null>(null);

  const recordsByKey = useMemo(
    () => new Map((records ?? []).map((record) => [record.key, record])),
    [records]
  );
  const imageGroupsByKey = useMemo(() => {
    const groups = new Map<VehicleRentalKey, LightboxImage[]>();

    VEHICLE_RENTAL_ITEMS.forEach((item) => {
      const label = language === "sr" ? item.title.sr : item.title.en;
      const record = recordsByKey.get(item.key);
      const mainUrl = previews[item.key] ?? record?.imageUrl ?? null;
      const urls = [
        mainUrl,
        ...(record?.additionalImageUrls ?? []),
        ...(galleryFiles[item.key] ?? []).map((pending) => pending.previewUrl),
      ].filter((url): url is string => Boolean(url));

      groups.set(
        item.key,
        urls.map((url, imageIndex) => ({
          src: url,
          alt:
            imageIndex === 0
              ? label
              : `${label} ${
                  language === "sr" ? "dodatna slika" : "gallery image"
                } ${imageIndex}`,
        }))
      );
    });

    return groups;
  }, [galleryFiles, language, previews, recordsByKey]);
  const activeLightboxImages = lightboxState
    ? (imageGroupsByKey.get(lightboxState.key) ?? [])
    : [];
  const setActiveLightboxIndex = useCallback((nextIndex: number | null) => {
    if (nextIndex === null) {
      setLightboxState(null);
      return;
    }

    setLightboxState((current) =>
      current ? { ...current, index: nextIndex } : current
    );
  }, []);

  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);

  useEffect(() => {
    galleryFilesRef.current = galleryFiles;
  }, [galleryFiles]);

  useEffect(() => {
    return () => {
      Object.values(previewsRef.current).forEach((preview) => {
        if (preview) {
          URL.revokeObjectURL(preview);
        }
      });
      Object.values(galleryFilesRef.current).forEach((items) => {
        items?.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      });
    };
  }, []);

  const clearPreview = (key: VehicleRentalKey) => {
    setPreviews((current) => {
      const preview = current[key];
      if (preview) {
        URL.revokeObjectURL(preview);
      }
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const clearGalleryPreviews = (key: VehicleRentalKey) => {
    setGalleryFiles((current) => {
      current[key]?.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const removePendingGalleryImage = (
    key: VehicleRentalKey,
    pendingId: string
  ) => {
    setGalleryFiles((current) => {
      const nextItems = (current[key] ?? []).filter((item) => {
        if (item.id === pendingId) {
          URL.revokeObjectURL(item.previewUrl);
          return false;
        }
        return true;
      });
      const next = { ...current };
      if (nextItems.length) {
        next[key] = nextItems;
      } else {
        delete next[key];
      }
      return next;
    });
  };

  const setItemStatus = (key: VehicleRentalKey, message: string) => {
    setStatus((current) => ({ ...current, [key]: message }));
  };

  const selectImage = (
    key: VehicleRentalKey,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    clearPreview(key);

    if (!file) {
      setFiles((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      return;
    }

    if (!isAllowedImage(file)) {
      setItemStatus(
        key,
        language === "sr"
          ? "Dozvoljene su samo slike: JPG, PNG, WEBP i AVIF."
          : "Allowed image files: JPG, PNG, WEBP, and AVIF."
      );
      return;
    }

    setFiles((current) => ({ ...current, [key]: file }));
    setPreviews((current) => ({
      ...current,
      [key]: URL.createObjectURL(file),
    }));
    setItemStatus(
      key,
      language === "sr"
        ? "Glavna slika je spremna. Kliknite Sačuvaj glavnu sliku."
        : "Main image is ready. Click Save main image."
    );
  };

  const selectGalleryImages = (
    key: VehicleRentalKey,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (!selectedFiles.length) {
      return;
    }

    const acceptedFiles = selectedFiles.filter(isAllowedImage);

    if (!acceptedFiles.length) {
      setItemStatus(
        key,
        language === "sr"
          ? "Dozvoljene su samo slike: JPG, PNG, WEBP i AVIF."
          : "Allowed image files: JPG, PNG, WEBP, and AVIF."
      );
      return;
    }

    const nextItems = acceptedFiles.map((file) => ({
      id: getPendingImageId(file),
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setGalleryFiles((current) => ({
      ...current,
      [key]: [...(current[key] ?? []), ...nextItems],
    }));

    const skipped = selectedFiles.length - acceptedFiles.length;
    setItemStatus(
      key,
      skipped
        ? language === "sr"
          ? "Dodatne slike su spremne. Neki fajlovi su preskočeni jer nisu slike."
          : "Gallery images are ready. Some files were skipped because they are not images."
        : language === "sr"
          ? "Dodatne slike su spremne. Kliknite Sačuvaj dodatne slike."
          : "Gallery images are ready. Click Save gallery images."
    );
  };

  const uploadBlob = async (blob: Blob, contentType?: string) => {
    const uploadUrl = await generateUploadUrl({});
    const result = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Type": contentType || blob.type || "application/octet-stream",
      },
      body: blob,
    });

    if (!result.ok) {
      throw new Error("Upload failed.");
    }

    const json = (await result.json()) as { storageId?: Id<"_storage"> };
    if (!json.storageId) {
      throw new Error("Upload failed.");
    }

    return json.storageId;
  };

  const saveImage = async (key: VehicleRentalKey) => {
    const file = files[key];

    if (!file) {
      setItemStatus(
        key,
        language === "sr"
          ? "Prvo odaberite glavnu sliku za ovu stavku."
          : "Choose a main image for this item first."
      );
      return;
    }

    setSavingKey(key);
    setItemStatus(key, language === "sr" ? "Otpremanje..." : "Uploading...");

    try {
      const storageId = await uploadBlob(file, file.type);
      await upsertImage({ key, storageId });
      setFiles((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      clearPreview(key);
      setItemStatus(
        key,
        language === "sr"
          ? "Glavna slika je sačuvana."
          : "Main image has been saved."
      );
    } catch (error) {
      setItemStatus(
        key,
        error instanceof Error
          ? error.message
          : language === "sr"
            ? "Čuvanje nije uspelo."
            : "Save failed."
      );
    }

    setSavingKey(null);
  };

  const saveGalleryImages = async (key: VehicleRentalKey) => {
    const pendingImages = galleryFiles[key] ?? [];
    const record = recordsByKey.get(key);

    if (!record?.storageId) {
      setItemStatus(
        key,
        language === "sr"
          ? "Prvo sačuvajte glavnu sliku za ovu stavku."
          : "Save the main image for this item first."
      );
      return;
    }

    if (!pendingImages.length) {
      setItemStatus(
        key,
        language === "sr"
          ? "Prvo odaberite dodatne slike."
          : "Choose gallery images first."
      );
      return;
    }

    const uploadedStorageIds: Id<"_storage">[] = [];
    setSavingKey(key);
    setItemStatus(
      key,
      language === "sr" ? "Otpremanje dodatnih slika..." : "Uploading gallery..."
    );

    try {
      for (const item of pendingImages) {
        const storageId = await uploadBlob(item.file, item.file.type);
        uploadedStorageIds.push(storageId);
      }

      await addAdditionalImages({ key, storageIds: uploadedStorageIds });
      clearGalleryPreviews(key);
      setItemStatus(
        key,
        language === "sr"
          ? "Dodatne slike su sačuvane."
          : "Gallery images have been saved."
      );
    } catch (error) {
      await Promise.all(
        uploadedStorageIds.map(async (storageId) => {
          try {
            await deleteFile({ storageId });
          } catch {
            // Best effort cleanup if the gallery mutation fails after upload.
          }
        })
      );
      setItemStatus(
        key,
        error instanceof Error
          ? error.message
          : language === "sr"
            ? "Čuvanje dodatnih slika nije uspelo."
            : "Gallery save failed."
      );
    }

    setSavingKey(null);
  };

  const deleteImage = async (key: VehicleRentalKey) => {
    const confirmed = window.confirm(
      language === "sr"
        ? "Obrisati glavnu sliku i sve dodatne slike za ovu stavku?"
        : "Delete the main image and all gallery images for this item?"
    );

    if (!confirmed) {
      return;
    }

    setSavingKey(key);
    try {
      await removeImage({ key });
      clearPreview(key);
      clearGalleryPreviews(key);
      setFiles((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      setItemStatus(
        key,
        language === "sr"
          ? "Glavna slika i dodatne slike su obrisane."
          : "Main image and gallery images deleted."
      );
    } catch (error) {
      setItemStatus(
        key,
        error instanceof Error
          ? error.message
          : language === "sr"
            ? "Brisanje nije uspelo."
            : "Delete failed."
      );
    }
    setSavingKey(null);
  };

  const deleteAdditionalImage = async (
    key: VehicleRentalKey,
    storageId: Id<"_storage">
  ) => {
    const confirmed = window.confirm(
      language === "sr"
        ? "Obrisati ovu dodatnu sliku?"
        : "Delete this gallery image?"
    );

    if (!confirmed) {
      return;
    }

    setSavingKey(key);
    try {
      await removeAdditionalImage({ key, storageId });
      setItemStatus(
        key,
        language === "sr"
          ? "Dodatna slika je obrisana."
          : "Gallery image deleted."
      );
    } catch (error) {
      setItemStatus(
        key,
        error instanceof Error
          ? error.message
          : language === "sr"
            ? "Brisanje dodatne slike nije uspelo."
            : "Gallery delete failed."
      );
    }
    setSavingKey(null);
  };

  return (
    <section className="grid gap-6">
      <article className="section-holo p-4 sm:p-5">
        <p className="adm-section-title" style={{ margin: 0 }}>
          {language === "sr" ? "Iznajmljivanje vozila" : "Vehicle rental"}
        </p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="adm-panel__title">
              {language === "sr"
                ? "Glavne i dodatne slike za vozila"
                : "Main and gallery images for vehicles"}
            </h2>
            <p className="adm-intro__text mt-1">
              {language === "sr"
                ? "Autobus i luksuzni kombi imaju odvojenu glavnu sliku i odvojenu galeriju dodatnih slika. Glavna slika ostaje na početnoj sekciji, a dodatne slike se prikazuju na stranici Iznajmljivanje vozila."
                : "Coach and luxury van each have a separate main image and gallery. The main image remains in the homepage section, while gallery images appear on the Vehicle rental page."}
            </p>
          </div>
        </div>
      </article>

      <section className="grid gap-5 lg:grid-cols-2">
        {VEHICLE_RENTAL_ITEMS.map((item, itemIndex) => {
          const record = recordsByKey.get(item.key);
          const previewUrl = previews[item.key] ?? record?.imageUrl ?? null;
          const label = language === "sr" ? item.title.sr : item.title.en;
          const description =
            language === "sr" ? item.description.sr : item.description.en;
          const Icon = iconByKey[item.key];
          const isSaving = savingKey === item.key;
          const hasSavedImage = Boolean(record?.imageUrl);
          const savedGallery = (record?.additionalStorageIds ?? [])
            .map((storageId, index) => ({
              storageId,
              imageUrl: record?.additionalImageUrls[index] ?? null,
            }))
            .filter(
              (
                galleryItem
              ): galleryItem is {
                storageId: Id<"_storage">;
                imageUrl: string;
              } => Boolean(galleryItem.imageUrl)
            );
          const pendingGallery = galleryFiles[item.key] ?? [];
          const galleryCount = savedGallery.length + pendingGallery.length;
          const galleryBaseIndex = previewUrl ? 1 : 0;

          return (
            <article key={item.key} className="section-holo p-5 sm:p-6">
              <div className="grid gap-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--surface)] text-[var(--primary)]">
                    <Icon aria-hidden />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                      {language === "sr"
                        ? "Poseban upload"
                        : "Separate upload"}
                    </p>
                    <h2 className="mt-1 text-xl font-semibold">{label}</h2>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      {description}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                    {language === "sr" ? "Glavna slika" : "Main image"}
                  </p>
                  <div className="group relative flex aspect-[16/10] items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[var(--line)] bg-[var(--bg-soft)] text-center transition hover:border-[var(--primary)]">
                    {previewUrl ? (
                      <button
                        type="button"
                        className="h-full w-full cursor-zoom-in"
                        aria-label={
                          language === "sr"
                            ? `Uvećaj sliku: ${label}`
                            : `Open image: ${label}`
                        }
                        onClick={() =>
                          setLightboxState({ key: item.key, index: 0 })
                        }
                      >
                        <CmsImage
                          src={previewUrl}
                          alt={label}
                          className="h-full w-full object-cover"
                          loading={itemIndex === 0 ? "eager" : "lazy"}
                        />
                      </button>
                    ) : (
                      <label className="grid h-full w-full cursor-pointer place-items-center px-5 text-sm text-muted">
                        <span className="grid justify-items-center gap-2">
                          <CloudUploadIcon strokeWidth={1.5} size="1em" className="text-2xl" />
                          {language === "sr"
                            ? "Odaberite glavnu sliku"
                            : "Choose main image"}
                        </span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/avif"
                          className="hidden"
                          disabled={isSaving}
                          onChange={(event) => selectImage(item.key, event)}
                        />
                      </label>
                    )}
                    {previewUrl ? (
                      <label className="absolute bottom-3 left-3 z-10 cursor-pointer rounded-full border border-white/30 bg-black/45 px-3 py-1 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100">
                        {language === "sr" ? "Promeni sliku" : "Change image"}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/avif"
                          className="hidden"
                          disabled={isSaving}
                          onChange={(event) => selectImage(item.key, event)}
                        />
                      </label>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={isSaving || !files[item.key]}
                      onClick={() => void saveImage(item.key)}
                    >
                      <SaveIcon strokeWidth={1.5} size="1em" className="text-xs" />
                      {isSaving
                        ? language === "sr"
                          ? "Čuvanje..."
                          : "Saving..."
                        : language === "sr"
                          ? "Sačuvaj glavnu sliku"
                          : "Save main image"}
                    </button>
                    {hasSavedImage ? (
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={isSaving}
                        onClick={() => void deleteImage(item.key)}
                      >
                        <TrashIcon strokeWidth={1.5} size="1em" className="text-xs" />
                        {language === "sr" ? "Obriši sve" : "Delete all"}
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                        {language === "sr" ? "Dodatne slike" : "Gallery images"}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {language === "sr"
                          ? "Dodajte više slika za prikaz na stranici."
                          : "Add multiple images for the public page."}
                      </p>
                    </div>
                    <span className="rounded-full border border-[var(--line)] px-3 py-1 text-xs font-semibold text-muted">
                      {galleryCount}
                    </span>
                  </div>

                  {galleryCount ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {savedGallery.map((galleryItem, galleryIndex) => (
                        <div
                          key={galleryItem.storageId}
                          className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--bg-soft)]"
                        >
                          <button
                            type="button"
                            className="h-full w-full cursor-zoom-in"
                            aria-label={
                              language === "sr"
                                ? `Uvećaj dodatnu sliku: ${label}`
                                : `Open gallery image: ${label}`
                            }
                            onClick={() =>
                              setLightboxState({
                                key: item.key,
                                index: galleryBaseIndex + galleryIndex,
                              })
                            }
                          >
                            <CmsImage
                              src={galleryItem.imageUrl}
                              alt={label}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </button>
                          <button
                            type="button"
                            className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition group-hover:opacity-100"
                            aria-label={
                              language === "sr"
                                ? "Obriši dodatnu sliku"
                                : "Delete gallery image"
                            }
                            disabled={isSaving}
                            onClick={() =>
                              void deleteAdditionalImage(
                                item.key,
                                galleryItem.storageId
                              )
                            }
                          >
                            <TrashIcon strokeWidth={1.5} size="1em" className="text-xs" aria-hidden />
                          </button>
                        </div>
                      ))}

                      {pendingGallery.map((pendingItem, pendingIndex) => (
                        <div
                          key={pendingItem.id}
                          className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-[var(--primary)] bg-[var(--bg-soft)]"
                        >
                          <button
                            type="button"
                            className="h-full w-full cursor-zoom-in"
                            aria-label={
                              language === "sr"
                                ? `Uvećaj odabranu sliku: ${pendingItem.file.name}`
                                : `Open selected image: ${pendingItem.file.name}`
                            }
                            onClick={() =>
                              setLightboxState({
                                key: item.key,
                                index:
                                  galleryBaseIndex +
                                  savedGallery.length +
                                  pendingIndex,
                              })
                            }
                          >
                            <CmsImage
                              src={pendingItem.previewUrl}
                              alt={pendingItem.file.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </button>
                          <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-[var(--primary)] px-2 py-1 text-[0.65rem] font-semibold text-white">
                            {language === "sr" ? "Spremno" : "Ready"}
                          </span>
                          <button
                            type="button"
                            className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition group-hover:opacity-100"
                            aria-label={
                              language === "sr"
                                ? "Ukloni odabranu sliku"
                                : "Remove selected image"
                            }
                            disabled={isSaving}
                            onClick={() =>
                              removePendingGalleryImage(
                                item.key,
                                pendingItem.id
                              )
                            }
                          >
                            <XIcon strokeWidth={1.5} size="1em" className="text-sm" aria-hidden />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid min-h-28 place-items-center rounded-xl border border-dashed border-[var(--line)] bg-[var(--bg-soft)] px-4 py-6 text-center text-sm text-muted">
                      {language === "sr"
                        ? "Još nema dodatnih slika za ovu stavku."
                        : "No gallery images have been added for this item yet."}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3">
                    <label
                      className={`btn-secondary cursor-pointer ${
                        !hasSavedImage || isSaving
                          ? "pointer-events-none opacity-60"
                          : ""
                      }`}
                    >
                      <ImagesIcon strokeWidth={1.5} size="1em" className="text-xs" />
                      {language === "sr" ? "Dodaj slike" : "Add images"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        multiple
                        className="hidden"
                        disabled={isSaving || !hasSavedImage}
                        onChange={(event) =>
                          selectGalleryImages(item.key, event)
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={isSaving || !pendingGallery.length}
                      onClick={() => void saveGalleryImages(item.key)}
                    >
                      <SaveIcon strokeWidth={1.5} size="1em" className="text-xs" />
                      {isSaving
                        ? language === "sr"
                          ? "Čuvanje..."
                          : "Saving..."
                        : language === "sr"
                          ? "Sačuvaj dodatne slike"
                          : "Save gallery images"}
                    </button>
                  </div>

                  {!hasSavedImage ? (
                    <p className="text-sm text-muted">
                      {language === "sr"
                        ? "Prvo sačuvajte glavnu sliku, zatim dodajte dodatne slike."
                        : "Save the main image first, then add gallery images."}
                    </p>
                  ) : null}
                </div>

                {status[item.key] ? (
                  <p className="text-sm text-muted">{status[item.key]}</p>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>
      <ImageLightbox
        images={activeLightboxImages}
        activeIndex={lightboxState?.index ?? null}
        closeLabel={
          language === "sr" ? "Zatvori prikaz slike" : "Close image viewer"
        }
        previousLabel={language === "sr" ? "Prethodna slika" : "Previous image"}
        nextLabel={language === "sr" ? "Sledeća slika" : "Next image"}
        onActiveIndexChange={setActiveLightboxIndex}
      />
    </section>
  );
}
