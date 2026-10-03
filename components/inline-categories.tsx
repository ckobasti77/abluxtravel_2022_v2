"use client";

import { useState, type FormEvent } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { useSitePreferences } from "./site-preferences-provider";
import {
  useCategoriesAll,
  type Category,
  type CategoryType,
} from "../lib/use-categories";
import IconPicker from "./icon-picker";
import DynamicIcon from "./dynamic-icon";

type CategoryForm = {
  nameSr: string;
  nameEn: string;
  slug: string;
  isMain: boolean;
  mainIcon: string;
  isActive: boolean;
  order: number;
};

const emptyForm: CategoryForm = {
  nameSr: "",
  nameEn: "",
  slug: "",
  isMain: false,
  mainIcon: "",
  isActive: true,
  order: 1,
};

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[čć]/g, "c")
    .replace(/[š]/g, "s")
    .replace(/[ž]/g, "z")
    .replace(/[đ]/g, "dj")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

type InlineCategoriesProps = {
  type: CategoryType;
};

export default function InlineCategories({ type }: InlineCategoriesProps) {
  const { language, dictionary } = useSitePreferences();
  const d = dictionary.admin;
  const categories = useCategoriesAll(type);
  const upsert = useMutation(api.categories.upsert);
  const remove = useMutation(api.categories.remove);

  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [editingId, setEditingId] = useState<Id<"categories"> | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleNameSrChange = (val: string) => {
    setForm((f) => ({
      ...f,
      nameSr: val,
      slug: editingId ? f.slug : slugify(val),
    }));
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat._id as Id<"categories">);
    setForm({
      nameSr: cat.name.sr,
      nameEn: cat.name.en,
      slug: cat.slug,
      isMain: cat.isMain || false,
      mainIcon: cat.mainIcon || "",
      isActive: cat.isActive,
      order: cat.order,
    });
    setStatus(null);
    setShowForm(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setStatus(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.nameSr.trim() || !form.slug.trim()) return;
    if (form.isMain && !form.mainIcon) return;
    setBusy(true);
    setStatus(null);
    try {
      await upsert({
        id: editingId ?? undefined,
        name: { sr: form.nameSr.trim(), en: form.nameEn.trim() || form.nameSr.trim() },
        slug: form.slug.trim(),
        type,
        isMain: form.isMain || undefined,
        mainIcon: form.isMain && form.mainIcon ? form.mainIcon : undefined,
        isActive: form.isActive,
        order: form.order,
      });
      setStatus(d.saved);
      cancelEdit();
    } catch {
      setStatus("Error");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: Id<"categories">) => {
    if (!window.confirm(d.categoryDeleteConfirm)) return;
    await remove({ id });
  };

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-xl font-semibold sm:text-2xl">
          {d.categoriesTitle}
        </h3>
        {!showForm && (
          <button
            type="button"
            className="btn-secondary !px-3 !py-2 !text-xs"
            onClick={() => {
              setForm(emptyForm);
              setEditingId(null);
              setShowForm(true);
            }}
          >
            + {d.categoryCreate}
          </button>
        )}
      </div>

      {/* Inline form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="surface mb-5 grid gap-4 rounded-2xl p-5"
        >
          <p className="text-sm font-semibold">
            {editingId ? d.categoryEdit : d.categoryCreate}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
                {d.categoryNameSr}
              </label>
              <input
                type="text"
                value={form.nameSr}
                onChange={(e) => handleNameSrChange(e.target.value)}
                className="control w-full"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
                {d.categoryNameEn}
              </label>
              <input
                type="text"
                value={form.nameEn}
                onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
                className="control w-full"
                placeholder={d.optional}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
                {d.categorySlug}
              </label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                className="control w-full font-mono text-xs"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
                {d.categoryOrder}
              </label>
              <input
                type="number"
                value={form.order}
                onChange={(e) =>
                  setForm((f) => ({ ...f, order: parseInt(e.target.value) || 1 }))
                }
                className="control w-full"
                min={1}
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="h-4 w-4 rounded accent-[var(--primary)]"
                />
                <span className="font-semibold">{d.categoryActive}</span>
              </label>
            </div>
          </div>

          {/* Main category toggle */}
          <div className="grid gap-3">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={form.isMain}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    isMain: e.target.checked,
                    mainIcon: e.target.checked ? f.mainIcon : "",
                  }))
                }
                className="h-4 w-4 rounded accent-[var(--primary)]"
              />
              <span className="font-semibold">
                {language === "sr"
                  ? "Glavna kategorija (prikazuje se na hero sekciji)"
                  : "Main category (shown on homepage hero)"}
              </span>
            </label>
            {form.isMain && (
              <IconPicker
                value={form.mainIcon}
                onChange={(icon) => setForm((f) => ({ ...f, mainIcon: icon }))}
                label={language === "sr" ? "Ikonica za hero sekciju" : "Hero section icon"}
              />
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy || !form.nameSr.trim() || (form.isMain && !form.mainIcon)}
              className="btn-primary"
            >
              {busy ? d.uploading : editingId ? d.categoryEdit : d.categoryCreate}
            </button>
            <button type="button" onClick={cancelEdit} className="btn-secondary">
                {language === "sr" ? "Otkaži" : "Cancel"}
            </button>
            {status && (
              <span className="self-center text-xs font-semibold text-[var(--ablux-teal-text)]">{status}</span>
            )}
          </div>
        </form>
      )}

      {/* Category list */}
      {categories.length === 0 && !showForm && (
        <p className="text-sm text-muted">{d.categoryNoCategories}</p>
      )}

      {categories.length > 0 && (
        <div className="grid gap-2">
          {categories.map((cat) => (
            <div
              key={cat._id}
              className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 transition hover:border-[var(--primary-soft)]"
            >
              {cat.isMain && cat.mainIcon ? (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-soft)]">
                  <DynamicIcon
                    name={cat.mainIcon}
                    size={16}
                    className="text-[var(--primary)]"
                  />
                </span>
              ) : (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-soft)] text-xs text-muted">
                  #
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {language === "sr" ? cat.name.sr : cat.name.en}
                </p>
                <p className="truncate text-xs text-muted">/{cat.slug}</p>
              </div>
              <span className="shrink-0 rounded-full border border-[var(--line)] bg-[var(--bg-soft)] px-2 py-0.5 text-[0.65rem] font-semibold tabular-nums">
                {cat.itemCount} {d.categoryItems}
              </span>
              {cat.isMain && (
                <span className="shrink-0 rounded-full border border-[var(--ablux-line)] bg-[var(--success-soft)] px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-[var(--ablux-teal-text)]">
                  {language === "sr" ? "glavna" : "main"}
                </span>
              )}
              {!cat.isActive && (
                <span className="shrink-0 rounded-full border border-[var(--ablux-line)] bg-[color-mix(in_srgb,var(--ablux-ochre)_14%,transparent)] px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-[var(--ablux-accent-text)]">
                  {language === "sr" ? "neaktivna" : "inactive"}
                </span>
              )}
              <div className="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  onClick={() => startEdit(cat)}
                  className="rounded-lg border border-[var(--line)] px-2.5 py-1.5 text-xs font-semibold text-[var(--primary)] transition hover:bg-[var(--primary-soft)]"
                >
                  {d.categoryEdit}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(cat._id as Id<"categories">)}
                  className="rounded-lg border border-[var(--ablux-brick)] px-2.5 py-1.5 text-xs font-semibold text-[var(--ablux-brick)] transition hover:bg-[color-mix(in_srgb,var(--ablux-brick)_12%,transparent)]"
                >
                  {d.categoryDelete}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
