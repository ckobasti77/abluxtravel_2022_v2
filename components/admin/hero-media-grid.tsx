"use client";

import {
  PencilIcon,
  TrashIcon,
  EllipsisVerticalIcon,
  XIcon,
} from "lucide-react";
import CmsImage from "@/components/cms-image";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc, Id } from "../../convex/_generated/dataModel";
import { useSitePreferences } from "../site-preferences-provider";

type SlideMediaType = "video" | "image";

type SlideRecord = Doc<"slides"> & {
  mediaType?: SlideMediaType;
  mediaName?: string | null;
  mediaUrl: string | null;
};

type SlideForm = {
  title: string;
  subtitle: string;
  badge: string;
  copy: string;
  order: number;
  isActive: boolean;
};

const resolveUploadMediaType = (
  uploadFile: File
): SlideMediaType | undefined => {
  if (uploadFile.type === "video/mp4") return "video";
  if (uploadFile.type.startsWith("image/")) return "image";
  const n = uploadFile.name.toLowerCase();
  if (n.endsWith(".mp4")) return "video";
  if (/\.(jpg|jpeg|png|webp)$/.test(n)) return "image";
  return undefined;
};

export default function HeroMediaGrid() {
  const { language, dictionary } = useSitePreferences();
  const slides = useQuery(api.slides.list) as SlideRecord[] | undefined;
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const upsert = useMutation(api.slides.upsert);

  const sortedSlides = useMemo(() => {
    if (!slides) return [];
    return [...slides].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [slides]);

  /* Add / Edit form state */
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SlideForm>({
    title: "",
    subtitle: "",
    badge: "",
    copy: "",
    order: 1,
    isActive: true,
  });
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const openEditForm = (slide: SlideRecord) => {
    setEditingId(slide._id);
    setForm({
      title: slide.title,
      subtitle: slide.subtitle,
      badge: slide.badge ?? "",
      copy: slide.copy ?? "",
      order: slide.order,
      isActive: slide.isActive,
    });
    setFile(null);
    setStatus(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setStatus(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    let storageId: Id<"_storage"> | undefined;
    let mediaType: SlideMediaType | undefined;
    let mediaName: string | undefined;

    try {
      if (file) {
        mediaType = resolveUploadMediaType(file);
        if (!mediaType) {
          setStatus(
            language === "sr"
              ? "Dozvoljeni su MP4, JPG, JPEG, PNG i WEBP fajlovi."
              : "Allowed files are MP4, JPG, JPEG, PNG, and WEBP."
          );
          return;
        }
        setStatus(dictionary.admin.uploading);
        const uploadUrl = await generateUploadUrl({});
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const json = await result.json();
        storageId = json.storageId as Id<"_storage"> | undefined;
        if (!storageId) throw new Error("Upload failed.");
        mediaName = file.name;
      }

      // If editing and no new file, keep existing media
      const editingSlide = editingId
        ? sortedSlides.find((s) => s._id === editingId)
        : null;

      await upsert({
        id: editingId ? (editingId as Id<"slides">) : undefined,
        title: form.title,
        subtitle: form.subtitle,
        badge: form.badge || undefined,
        copy: form.copy || undefined,
        mediaType: mediaType ?? editingSlide?.mediaType,
        videoUrl: mediaName ?? editingSlide?.videoUrl,
        storageId: storageId ?? editingSlide?.storageId,
        order: Number(form.order),
        isActive: form.isActive,
      });

      setStatus(dictionary.admin.saved);
      closeForm();
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Unexpected error."
      );
    }
  };

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">
            {language === "sr"
              ? "Hero Medija i Slajdovi"
              : "Hero Media & Slides"}
          </h2>
          <p className="text-sm text-[var(--muted)]">
            {language === "sr"
              ? "Dodajte medija slajdove, tampajte hero medija i stranicu."
              : "Add media slides, manage hero media and page content."}
          </p>
        </div>
      </div>

      {/* Horizontal card grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sortedSlides.map((slide) => (
          <article
            key={slide._id}
            className="group overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]"
          >
            {/* Thumbnail */}
            <div className="relative aspect-video w-full overflow-hidden bg-[var(--bg-soft)]">
              {slide.mediaUrl ? (
                slide.mediaType === "video" ? (
                  <video
                    src={slide.mediaUrl}
                    className="h-full w-full object-cover"
                    muted
                    loop
                    playsInline
                  />
                ) : (
                  <CmsImage
                    src={slide.mediaUrl}
                    alt={slide.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                )
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
                  {language === "sr" ? "Nema medije" : "No media"}
                </div>
              )}
            </div>

            {/* Card body */}
            <div className="p-3">
              <p className="truncate text-sm font-semibold">
                {slide.title}
              </p>

              {/* Status badge */}
              <div className="mt-1.5">
                {slide.isActive ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--success-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--ablux-teal-text)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--ablux-c-teal)]" />
                    Status
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ablux-surface-2)] px-2 py-0.5 text-[10px] font-semibold text-[var(--ablux-text-muted)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--ablux-stone)]" />
                    {language === "sr" ? "Neaktivno" : "Inactive"}
                  </span>
                )}
              </div>

              {/* Action bar */}
              <div className="mt-3 flex items-center gap-2 border-t border-[var(--line)] pt-3">
                <button
                  type="button"
                  onClick={() => openEditForm(slide)}
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--line)] px-2.5 py-1.5 text-xs text-[var(--muted)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                >
                  <PencilIcon strokeWidth={1.5} size="1em" className="text-[10px]" />
                  Edit
                </button>
                <button
                  type="button"
                  className="flex items-center justify-center rounded-lg border border-[var(--line)] p-1.5 text-xs text-[var(--muted)] transition hover:border-[var(--ablux-brick)] hover:text-[var(--ablux-brick)]"
                >
                  <TrashIcon strokeWidth={1.5} size="1em" className="text-[10px]" />
                </button>
                <button
                  type="button"
                  className="ml-auto flex items-center justify-center rounded-lg border border-[var(--line)] p-1.5 text-xs text-[var(--muted)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                >
                  <EllipsisVerticalIcon strokeWidth={1.5} size="1em" className="text-[10px]" />
                </button>
              </div>
            </div>
          </article>
        ))}

        {/* Empty state */}
        {sortedSlides.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--line)] bg-[var(--bg-soft)] py-12 text-center">
            <p className="text-sm font-semibold">
              {language === "sr"
                ? "Nema aktivnih slajdova"
                : "No active slides"}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {language === "sr"
                ? "Dodajte prvi slajd klikom na dugme iznad."
                : "Add your first slide using the button above."}
            </p>
          </div>
        ) : null}
      </div>

      {/* Slide form modal/panel */}
      {showForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-4">
              <h3 className="text-base font-bold">
                {editingId
                  ? language === "sr"
                    ? "Izmeni slajd"
                    : "Edit slide"
                  : language === "sr"
                    ? "Novi slajd"
                    : "New slide"}
              </h3>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg p-1.5 text-[var(--muted)] transition hover:bg-[var(--bg-soft)] hover:text-[var(--text)]"
              >
                <XIcon strokeWidth={1.5} size="1em" />
              </button>
            </div>

            {/* Form body */}
            <form onSubmit={handleSubmit} className="grid gap-4 p-6">
              <input
                className="control"
                placeholder={dictionary.admin.slideTitle}
                value={form.title}
                onChange={(e) =>
                  setForm((p) => ({ ...p, title: e.target.value }))
                }
                required
              />
              <input
                className="control"
                placeholder={dictionary.admin.slideSubtitle}
                value={form.subtitle}
                onChange={(e) =>
                  setForm((p) => ({ ...p, subtitle: e.target.value }))
                }
                required
              />
              <input
                className="control"
                placeholder={`${dictionary.admin.slideBadge} (${dictionary.admin.optional})`}
                value={form.badge}
                onChange={(e) =>
                  setForm((p) => ({ ...p, badge: e.target.value }))
                }
              />
              <textarea
                className="control"
                placeholder={`${dictionary.admin.slideCopy} (${dictionary.admin.optional})`}
                value={form.copy}
                onChange={(e) =>
                  setForm((p) => ({ ...p, copy: e.target.value }))
                }
              />

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  {language === "sr"
                    ? "Media fajl (MP4 ili slika)"
                    : "Media file (MP4 or image)"}
                </label>
                <input
                  type="file"
                  accept="video/mp4,image/jpeg,image/png,image/webp"
                  onChange={(e) =>
                    setFile(e.target.files?.[0] ?? null)
                  }
                  className="text-sm text-[var(--muted)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="grid gap-1">
                  <span className="text-xs font-semibold">
                    {dictionary.admin.order}
                  </span>
                  <input
                    type="number"
                    min={1}
                    className="control"
                    value={form.order}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        order: Number(e.target.value),
                      }))
                    }
                  />
                </label>
                <label className="flex items-end gap-2 pb-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        isActive: e.target.checked,
                      }))
                    }
                  />
                  {dictionary.admin.active}
                </label>
              </div>

              {status ? (
                <p className="rounded-lg border border-[var(--line)] bg-[var(--primary-soft)] px-3 py-2 text-sm">
                  {status}
                </p>
              ) : null}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-[var(--line)] pt-4">
                <button
                  type="button"
                  onClick={closeForm}
                  className="btn-secondary text-sm"
                >
                  {language === "sr" ? "Otkaži" : "Cancel"}
                </button>
                <button type="submit" className="btn-primary text-sm">
                  {language === "sr"
                    ? "Sačuvaj"
                    : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}

