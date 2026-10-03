// Manual import for partners without a website (Holiday Plus KM) or any
// partner later: an editor uploads a PDF / Excel / CSV / photo of the price
// list. With ANTHROPIC_API_KEY on the deployment, manualImportNode.extract
// turns it into drafts (never published unreviewed); without it the editor
// enters offers through the form (saveManualOffer). Step 13 builds the UI.
// Ids arrive as strings and are normalized after the role check.
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { TRAVEL_TYPE_SLUGS } from "../lib/search/travel-types";
import { AI_MODEL, finalizeManualOffer, isManualExternalId, MANUAL_PREFIX, type ManualOffer } from "../scraper/core/manual";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { requireRole, type Viewer } from "./lib/access";
import { audit } from "./lib/audit";
import { effectiveFields } from "./lib/catalogCards";
import { manualOfferV } from "./lib/syncValidators";
import { ingestFinalOffers, partnerBySlug, recountPartnerCounts } from "./sync/ingest";

const MB = 1024 * 1024;
const FILE_RULES: { pattern: RegExp; maxBytes: number }[] = [
  { pattern: /^application\/pdf$/, maxBytes: 20 * MB },
  { pattern: /^image\/(jpeg|png|webp)$/, maxBytes: 5 * MB },
  { pattern: /^application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet$/, maxBytes: 5 * MB },
  { pattern: /^text\/csv$/, maxBytes: 5 * MB },
];
const LEGACY_OFFICE = /\.(xls|doc|docx|ppt)$/i;
const LIMITS = { drafts: 50, list: 60, text: 20_000, item: 500 };

const hasAiKey = () => Boolean(process.env.ANTHROPIC_API_KEY);

function mimeFor(fileName: string, declared: string | undefined): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (lower.endsWith(".csv")) return "text/csv";
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (/\.jpe?g$/.test(lower)) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return (declared ?? "").toLowerCase();
}

async function importOrThrow(ctx: QueryCtx | MutationCtx, rawId: string): Promise<Doc<"manualImports">> {
  const id = ctx.db.normalizeId("manualImports", rawId);
  const row = id ? await ctx.db.get(id) : null;
  if (!row) throw new ConvexError("NOT_FOUND");
  return row;
}

async function partnerOrThrow(ctx: QueryCtx | MutationCtx, slug: string) {
  const partner = await partnerBySlug(ctx, slug);
  if (!partner || partner.kind !== "partner") throw new ConvexError("UNKNOWN_PARTNER");
  return partner;
}

/** Trims and validates editor/AI input; returns the cleaned offer or throws INVALID_OFFER. */
function cleanManualOffer(offer: Doc<"offerDrafts">["offer"]): Doc<"offerDrafts">["offer"] {
  const text = (value: string | undefined, max = LIMITS.text) => (value?.trim() ? value.trim().slice(0, max) : undefined);
  const list = (values: string[]) => values.map((value) => value.trim().slice(0, LIMITS.item)).filter(Boolean).slice(0, LIMITS.list);
  const title = offer.title.trim();
  if (!title || title.length > 160) throw new ConvexError("INVALID_OFFER");
  const travelTypes = (offer.travelTypes ?? []).filter((slug) => (TRAVEL_TYPE_SLUGS as string[]).includes(slug)).slice(0, 3);
  const positive = (value: number | undefined, max: number) => (value !== undefined && value > 0 && value <= max ? value : undefined);
  return {
    ...offer,
    title,
    place: text(offer.place, 80),
    countryName: text(offer.countryName, 60),
    travelTypes: travelTypes.length ? travelTypes : undefined,
    nights: positive(offer.nights, 365),
    days: positive(offer.days, 366),
    stars: positive(offer.stars, 5),
    departureCities: list(offer.departureCities).slice(0, 12),
    departures: offer.departures
      .filter((departure) => /^\d{4}-\d{2}-\d{2}$/.test(departure.date))
      .filter((departure) => departure.price === undefined || (departure.price > 0 && departure.price < 1_000_000))
      .slice(0, 400),
    listPrice: offer.listPrice && offer.listPrice.price > 0 && offer.listPrice.price < 1_000_000 ? offer.listPrice : undefined,
    included: list(offer.included),
    excluded: list(offer.excluded),
    descriptionText: text(offer.descriptionText),
    programText: text(offer.programText),
    notesText: text(offer.notesText),
    organizerName: offer.organizerName.trim().slice(0, 120),
    organizerLicense: text(offer.organizerLicense, 120),
    imageStorageIds: offer.imageStorageIds.slice(0, 40),
  };
}

/**
 * Publishes one manual offer through the same ingest path as sync (D2 docs,
 * slug, change log). External id is "manual-<draftId>", so re-saving the same
 * draft updates the same card.
 */
async function publishDraft(ctx: MutationCtx, draft: Doc<"offerDrafts">) {
  const partner = await partnerOrThrow(ctx, draft.partnerSlug);
  const externalId = `${MANUAL_PREFIX}${draft._id}`;
  const final = finalizeManualOffer(draft.offer as ManualOffer, {
    partnerSlug: partner.slug,
    externalId,
    organizer: { name: partner.organizerName ?? partner.name, license: partner.organizerLicense },
  });
  await ingestFinalOffers(ctx, partner, [final], { mergeMode: false, published: true });
  const meta = await ctx.db
    .query("offerSyncMeta")
    .withIndex("by_partner_external", (q) => q.eq("partnerSlug", partner.slug).eq("externalId", externalId))
    .unique();
  const card = meta ? await ctx.db.get(meta.cardId) : null;
  if (!card) throw new ConvexError("INGEST_FAILED");

  // Editor-chosen travel types and uploaded images (Convex storage) are ABLux-owned.
  const imported = { ...card.imported, coverStorageId: draft.offer.coverStorageId ?? draft.offer.imageStorageIds[0] };
  const overrides = { ...(card.overrides ?? {}), travelTypes: draft.offer.travelTypes?.length ? draft.offer.travelTypes : card.overrides?.travelTypes };
  const effective = effectiveFields(imported, overrides);
  await ctx.db.patch(card._id, {
    imported,
    overrides,
    title: effective.title,
    travelTypes: effective.travelTypes,
    coverUrl: effective.coverUrl,
    coverStorageId: effective.coverStorageId,
    listed: true,
    removedAt: undefined,
  });
  const detail = await ctx.db
    .query("offerDetails")
    .withIndex("by_card", (q) => q.eq("cardId", card._id))
    .unique();
  if (detail) await ctx.db.patch(detail._id, { gallery: draft.offer.imageStorageIds.map((storageId) => ({ url: "", storageId })) });
  await ctx.db.patch(draft._id, { status: "approved", cardId: card._id, updatedAt: Date.now() });
  return card;
}

async function refreshImportStatus(ctx: MutationCtx, importId: Id<"manualImports"> | undefined) {
  if (!importId) return;
  const drafts = await ctx.db
    .query("offerDrafts")
    .withIndex("by_import", (q) => q.eq("importId", importId))
    .collect();
  const open = drafts.filter((draft) => draft.status === "draft").length;
  const row = await ctx.db.get(importId);
  if (row && row.status !== "extracting" && row.status !== "failed") {
    await ctx.db.patch(importId, { status: open === 0 && drafts.length > 0 ? "done" : "needs_review", draftCount: drafts.length, updatedAt: Date.now() });
  }
}

async function saveManualOfferImpl(
  ctx: MutationCtx,
  viewer: Viewer | null,
  args: { partnerSlug: string; offer: Doc<"offerDrafts">["offer"]; cardId?: string }
) {
  await partnerOrThrow(ctx, args.partnerSlug);
  const offer = cleanManualOffer(args.offer);
  const now = Date.now();
  let draft: Doc<"offerDrafts"> | null = null;
  if (args.cardId) {
    const cardId = ctx.db.normalizeId("offerCards", args.cardId);
    const card = cardId ? await ctx.db.get(cardId) : null;
    if (!card || !isManualExternalId(card.externalId) || card.partnerSlug !== args.partnerSlug) throw new ConvexError("NOT_MANUAL_OFFER");
    const draftId = ctx.db.normalizeId("offerDrafts", card.externalId.slice(MANUAL_PREFIX.length));
    draft = draftId ? await ctx.db.get(draftId) : null;
    if (!draft) throw new ConvexError("NOT_FOUND");
    await ctx.db.patch(draft._id, { offer, updatedAt: now });
    draft = { ...draft, offer };
  } else {
    const draftId = await ctx.db.insert("offerDrafts", {
      partnerSlug: args.partnerSlug,
      status: "draft",
      offer,
      confidence: "high",
      warnings: [],
      createdAt: now,
      updatedAt: now,
    });
    draft = (await ctx.db.get(draftId))!;
  }
  const card = await publishDraft(ctx, draft);
  await recountPartnerCounts(ctx, args.partnerSlug);
  await audit(ctx, viewer, {
    action: args.cardId ? "manualOffer.update" : "manualOffer.create",
    targetTable: "offerCards",
    targetId: card._id,
    summary: `${args.partnerSlug}/${card.slug}`,
  });
  return { cardId: card._id, slug: card.slug };
}

async function removeManualOfferImpl(ctx: MutationCtx, viewer: Viewer | null, rawCardId: string) {
  const cardId = ctx.db.normalizeId("offerCards", rawCardId);
  const card = cardId ? await ctx.db.get(cardId) : null;
  if (!card || !isManualExternalId(card.externalId)) throw new ConvexError("NOT_MANUAL_OFFER");
  const now = Date.now();
  if (card.listed) {
    await ctx.db.patch(card._id, { listed: false, isActive: false, isPublic: false, removedAt: now, updatedAt: now });
    await ctx.db.insert("offerChanges", {
      cardId: card._id,
      partnerSlug: card.partnerSlug,
      type: "removed",
      title: card.title,
      slug: card.slug,
      oldPrice: card.priceFrom,
      basis: card.priceBasis,
      at: now,
    });
  }
  await recountPartnerCounts(ctx, card.partnerSlug);
  await audit(ctx, viewer, { action: "manualOffer.remove", targetTable: "offerCards", targetId: card._id, summary: `${card.partnerSlug}/${card.slug}` });
  return { ok: true };
}

// ---------------------------------------------------------------- public (editor)

export const capabilities = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "editor");
    return {
      aiExtraction: hasAiKey(),
      model: hasAiKey() ? AI_MODEL : null,
      accepted: ["PDF do 20 MB", "JPG/PNG/WebP do 5 MB", "Excel .xlsx do 5 MB", "CSV do 5 MB"],
    };
  },
});

export const createImport = mutation({
  args: {
    partnerSlug: v.string(),
    storageId: v.id("_storage"),
    fileName: v.string(),
    mimeType: v.optional(v.string()),
    preferAi: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireRole(ctx, "editor");
    await partnerOrThrow(ctx, args.partnerSlug);
    const fileName = args.fileName.trim().slice(0, 200) || "cenovnik";
    if (LEGACY_OFFICE.test(fileName)) throw new ConvexError("UNSUPPORTED_FILE_SAVE_AS_PDF_OR_XLSX");
    const file = await ctx.db.system.get(args.storageId);
    if (!file) throw new ConvexError("NOT_FOUND");
    const mimeType = mimeFor(fileName, args.mimeType ?? file.contentType);
    const rule = FILE_RULES.find((candidate) => candidate.pattern.test(mimeType));
    if (!rule) throw new ConvexError("UNSUPPORTED_FILE_SAVE_AS_PDF_OR_XLSX");
    if (file.size > rule.maxBytes) throw new ConvexError("FILE_TOO_LARGE");
    const useAi = hasAiKey() && args.preferAi !== false;
    const now = Date.now();
    const importId = await ctx.db.insert("manualImports", {
      partnerSlug: args.partnerSlug,
      storageId: args.storageId,
      fileName,
      mimeType,
      size: file.size,
      method: useAi ? "ai" : "manual",
      status: useAi ? "extracting" : "needs_review",
      draftCount: 0,
      model: useAi ? AI_MODEL : undefined,
      message: useAi ? "Automatsko čitanje je u toku." : "Unesite ponude ručno iz priloženog fajla.",
      createdBy: viewer.userId,
      createdAt: now,
      updatedAt: now,
    });
    if (useAi) await ctx.scheduler.runAfter(0, internal.manualImportNode.extract, { importId });
    await audit(ctx, viewer, { action: "manualImport.create", targetTable: "manualImports", targetId: importId, summary: `${args.partnerSlug}: ${useAi ? "AI" : "ručno"}` });
    return { importId, method: useAi ? ("ai" as const) : ("manual" as const) };
  },
});

export const listImports = query({
  args: { partnerSlug: v.optional(v.string()), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireRole(ctx, "editor");
    const page = args.partnerSlug
      ? await ctx.db
          .query("manualImports")
          .withIndex("by_partner_created", (q) => q.eq("partnerSlug", args.partnerSlug!))
          .order("desc")
          .paginate(args.paginationOpts)
      : await ctx.db.query("manualImports").withIndex("by_created").order("desc").paginate(args.paginationOpts);
    return {
      ...page,
      page: page.page.map((row) => ({
        _id: row._id,
        partnerSlug: row.partnerSlug,
        fileName: row.fileName,
        mimeType: row.mimeType,
        size: row.size,
        method: row.method,
        status: row.status,
        draftCount: row.draftCount,
        message: row.message,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
    };
  },
});

export const getImport = query({
  args: { importId: v.string() },
  handler: async (ctx, args) => {
    await requireRole(ctx, "editor");
    const row = await importOrThrow(ctx, args.importId);
    const drafts = await ctx.db
      .query("offerDrafts")
      .withIndex("by_import", (q) => q.eq("importId", row._id))
      .collect();
    return { import: row, fileUrl: await ctx.storage.getUrl(row.storageId), drafts };
  },
});

export const updateDraft = mutation({
  args: { draftId: v.string(), offer: manualOfferV },
  handler: async (ctx, args) => {
    const viewer = await requireRole(ctx, "editor");
    const draftId = ctx.db.normalizeId("offerDrafts", args.draftId);
    const draft = draftId ? await ctx.db.get(draftId) : null;
    if (!draft) throw new ConvexError("NOT_FOUND");
    if (draft.status !== "draft") throw new ConvexError("NOT_A_DRAFT");
    await ctx.db.patch(draft._id, { offer: cleanManualOffer(args.offer), updatedAt: Date.now() });
    await audit(ctx, viewer, { action: "manualImport.updateDraft", targetTable: "offerDrafts", targetId: draft._id });
    return { ok: true };
  },
});

export const approveDrafts = mutation({
  args: { draftIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const viewer = await requireRole(ctx, "editor");
    if (args.draftIds.length > LIMITS.drafts) throw new ConvexError("TOO_MANY");
    const imports = new Set<Id<"manualImports">>();
    const partners = new Set<string>();
    const published: string[] = [];
    for (const rawId of new Set(args.draftIds)) {
      const draftId = ctx.db.normalizeId("offerDrafts", rawId);
      const draft = draftId ? await ctx.db.get(draftId) : null;
      if (!draft || draft.status !== "draft") continue;
      const card = await publishDraft(ctx, { ...draft, offer: cleanManualOffer(draft.offer) });
      published.push(card.slug);
      partners.add(draft.partnerSlug);
      if (draft.importId) imports.add(draft.importId);
    }
    for (const importId of imports) await refreshImportStatus(ctx, importId);
    for (const slug of partners) await recountPartnerCounts(ctx, slug);
    await audit(ctx, viewer, { action: "manualImport.approve", targetTable: "offerDrafts", summary: `${published.length} ponuda objavljeno` });
    return { published };
  },
});

export const discardDrafts = mutation({
  args: { draftIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const viewer = await requireRole(ctx, "editor");
    if (args.draftIds.length > LIMITS.drafts) throw new ConvexError("TOO_MANY");
    const imports = new Set<Id<"manualImports">>();
    let discarded = 0;
    for (const rawId of new Set(args.draftIds)) {
      const draftId = ctx.db.normalizeId("offerDrafts", rawId);
      const draft = draftId ? await ctx.db.get(draftId) : null;
      if (!draft || draft.status !== "draft") continue;
      await ctx.db.patch(draft._id, { status: "discarded", updatedAt: Date.now() });
      if (draft.importId) imports.add(draft.importId);
      discarded += 1;
    }
    for (const importId of imports) await refreshImportStatus(ctx, importId);
    await audit(ctx, viewer, { action: "manualImport.discard", targetTable: "offerDrafts", summary: `${discarded} nacrta odbačeno` });
    return { discarded };
  },
});

/** Manual entry form: create (no cardId) or update (cardId of a manual offer). Publishes immediately. */
export const saveManualOffer = mutation({
  args: { partnerSlug: v.string(), offer: manualOfferV, cardId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const viewer = await requireRole(ctx, "editor");
    return saveManualOfferImpl(ctx, viewer, args);
  },
});

/** Takes a manual offer off the site (listed: false). Expiry by date still applies to the others. */
export const removeManualOffer = mutation({
  args: { cardId: v.string() },
  handler: async (ctx, args) => {
    const viewer = await requireRole(ctx, "editor");
    return removeManualOfferImpl(ctx, viewer, args.cardId);
  },
});

/** The form data behind a published manual offer (to edit it in the admin form). */
export const getManualOffer = query({
  args: { cardId: v.string() },
  handler: async (ctx, args) => {
    await requireRole(ctx, "editor");
    const cardId = ctx.db.normalizeId("offerCards", args.cardId);
    const card = cardId ? await ctx.db.get(cardId) : null;
    if (!card || !isManualExternalId(card.externalId)) throw new ConvexError("NOT_MANUAL_OFFER");
    const draftId = ctx.db.normalizeId("offerDrafts", card.externalId.slice(MANUAL_PREFIX.length));
    const draft = draftId ? await ctx.db.get(draftId) : null;
    if (!draft) throw new ConvexError("NOT_FOUND");
    const images = await Promise.all(draft.offer.imageStorageIds.map(async (storageId) => ({ storageId, url: await ctx.storage.getUrl(storageId) })));
    return { cardId: card._id, slug: card.slug, partnerSlug: draft.partnerSlug, listed: card.listed, offer: draft.offer, images };
  },
});

// ---------------------------------------------------------------- internal

/** Only a boolean: never returns or logs the key. */
export const hasAiKeyInternal = internalQuery({
  args: {},
  handler: async () => hasAiKey(),
});

export const getImportInternal = internalQuery({
  args: { importId: v.id("manualImports") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.importId);
    if (!row) return null;
    const partner = await partnerBySlug(ctx, row.partnerSlug);
    return { ...row, partnerName: partner?.name ?? row.partnerSlug, organizerName: partner?.organizerName ?? partner?.name ?? row.partnerSlug };
  },
});

const extractedOfferV = v.object({ offer: manualOfferV, warnings: v.array(v.string()) });

export const saveDrafts = internalMutation({
  args: { importId: v.id("manualImports"), offers: v.array(extractedOfferV), warnings: v.array(v.string()) },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.importId);
    if (!row || row.status !== "extracting") return { saved: 0 };
    const now = Date.now();
    let saved = 0;
    for (const item of args.offers.slice(0, LIMITS.drafts)) {
      let offer: Doc<"offerDrafts">["offer"];
      try {
        offer = cleanManualOffer(item.offer);
      } catch {
        continue;
      }
      await ctx.db.insert("offerDrafts", {
        importId: row._id,
        partnerSlug: row.partnerSlug,
        status: "draft",
        offer,
        confidence: "low",
        warnings: ["Proverite pre objave.", ...item.warnings].slice(0, 20).map((warning) => warning.slice(0, 300)),
        createdAt: now,
        updatedAt: now,
      });
      saved += 1;
    }
    const general = args.warnings.slice(0, 5).map((warning) => warning.slice(0, 200)).join(" ");
    await ctx.db.patch(row._id, {
      status: "needs_review",
      draftCount: saved,
      message: saved
        ? `Pronađeno ponuda: ${saved}. Proverite ih pre objave.${general ? ` ${general}` : ""}`
        : "U dokumentu nisu pronađene ponude. Unesite ih ručno.",
      updatedAt: now,
    });
    return { saved };
  },
});

export const markImportFailed = internalMutation({
  args: { importId: v.id("manualImports"), message: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.importId);
    if (!row) return;
    await ctx.db.patch(row._id, { status: "failed", message: args.message.slice(0, 300), updatedAt: Date.now() });
  },
});

/**
 * QA round trip for the night report (no editor session needed):
 * creates one Holiday Plus KM offer through the manual path, checks it,
 * takes it down with removeManualOffer, then deletes exactly the documents
 * it created. `npx convex run manualImport:qaManualRoundTrip`
 */
export const qaManualRoundTrip = internalMutation({
  args: {},
  handler: async (ctx) => {
    const offer: Doc<"offerDrafts">["offer"] = {
      title: "QA test ručnog unosa (briše se)",
      place: "Atina",
      countryName: "Grčka",
      kind: "trip",
      travelTypes: ["evropski-gradovi"],
      transports: ["bus"],
      nights: 3,
      days: 5,
      departureCities: ["Beograd"],
      departures: [{ date: "2099-01-10", endDate: "2099-01-14", basis: "per_person" }],
      included: ["QA"],
      excluded: [],
      programText: "1. dan Beograd – Atina\nQA\n2. dan Atina\nQA",
      organizerName: "",
      imageStorageIds: [],
    };
    const created = await saveManualOfferImpl(ctx, null, { partnerSlug: "holidayplus", offer });
    const card = (await ctx.db.get(created.cardId))!;
    const detail = await ctx.db
      .query("offerDetails")
      .withIndex("by_card", (q) => q.eq("cardId", card._id))
      .unique();
    const report = {
      slug: card.slug,
      externalId: card.externalId,
      publishedOnCreate: card.isPublic,
      travelTypes: card.travelTypes,
      priceKind: card.priceKind,
      organizer: detail?.organizer.name,
      programDays: detail?.program.length,
      sourceUrl: detail?.sourceUrl,
    };
    await removeManualOfferImpl(ctx, null, card._id);
    const removed = (await ctx.db.get(card._id))!;
    const after = { listed: removed.listed, isPublic: removed.isPublic };

    // Clean up exactly what this helper created (QA data, not a bulk delete).
    const draftId = ctx.db.normalizeId("offerDrafts", card.externalId.slice(MANUAL_PREFIX.length));
    const meta = await ctx.db
      .query("offerSyncMeta")
      .withIndex("by_partner_external", (q) => q.eq("partnerSlug", card.partnerSlug).eq("externalId", card.externalId))
      .unique();
    const changes = await ctx.db
      .query("offerChanges")
      .withIndex("by_card_at", (q) => q.eq("cardId", card._id))
      .collect();
    // The audit log keeps its two entries: it is a record, not QA data.
    for (const change of changes) await ctx.db.delete(change._id);
    if (meta) await ctx.db.delete(meta._id);
    if (detail) await ctx.db.delete(detail._id);
    await ctx.db.delete(card._id);
    if (draftId) await ctx.db.delete(draftId);
    await recountPartnerCounts(ctx, "holidayplus");
    return { created: report, afterRemove: after, cleanedUp: true };
  },
});
