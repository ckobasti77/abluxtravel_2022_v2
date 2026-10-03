// Shared validators for Partner Sync tables and internal functions.
import { v } from "convex/values";

export const transportV = v.union(
  v.literal("bus"),
  v.literal("plane"),
  v.literal("self"),
  v.literal("train"),
  v.literal("ship")
);

export const boardV = v.union(
  v.literal("ro"),
  v.literal("bb"),
  v.literal("hb"),
  v.literal("fb"),
  v.literal("ai"),
  v.literal("uai")
);

export const priceBasisV = v.union(
  v.literal("per_person"),
  v.literal("per_person_night"),
  v.literal("per_unit"),
  v.literal("per_unit_night"),
  v.literal("per_day"),
  v.literal("per_stay"),
  v.literal("total_2_adults"),
  v.literal("unknown")
);

export const availabilityV = v.union(
  v.literal("available"),
  v.literal("few"),
  v.literal("sold_out"),
  v.literal("on_request"),
  v.literal("unknown")
);

export const departureV = v.object({
  date: v.string(),
  endDate: v.optional(v.string()),
  nights: v.optional(v.number()),
  unit: v.optional(v.string()),
  board: v.optional(boardV),
  transport: v.optional(transportV),
  fromCity: v.optional(v.string()),
  price: v.optional(v.number()),
  priceOld: v.optional(v.number()),
  basis: priceBasisV,
  availability: v.optional(availabilityV),
  note: v.optional(v.string()),
});

// "planned" | "connected" | "syncing" are legacy values, mapped by
// sync/registry:migrateLegacySources and removed when the union is tightened.
export const partnerStatusV = v.union(
  v.literal("active"),
  v.literal("paused"),
  v.literal("blocked"),
  v.literal("manual"),
  v.literal("planned"),
  v.literal("connected"),
  v.literal("syncing")
);

export const runItemStatusV = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("ok"),
  v.literal("partial"),
  v.literal("blocked"),
  v.literal("network"),
  v.literal("parse"),
  v.literal("failed"),
  v.literal("cancelled"),
  v.literal("skipped")
);

export const changeTypeV = v.union(
  v.literal("new"),
  v.literal("price_down"),
  v.literal("price_up"),
  v.literal("dates"),
  v.literal("removed"),
  v.literal("expired"),
  v.literal("returned")
);

export const supplementV = v.object({
  label: v.string(),
  price: v.optional(v.number()),
  basis: v.optional(priceBasisV),
  note: v.optional(v.string()),
});

export const manualOfferV = v.object({
  title: v.string(),
  place: v.optional(v.string()),
  countryName: v.optional(v.string()),
  kind: v.union(v.literal("trip"), v.literal("stay")),
  travelTypes: v.optional(v.array(v.string())),
  transports: v.array(transportV),
  nights: v.optional(v.number()),
  days: v.optional(v.number()),
  board: v.optional(boardV),
  stars: v.optional(v.number()),
  departureCities: v.array(v.string()),
  departures: v.array(departureV),
  listPrice: v.optional(
    v.object({ price: v.number(), basis: priceBasisV, note: v.optional(v.string()) })
  ),
  included: v.array(v.string()),
  excluded: v.array(v.string()),
  descriptionText: v.optional(v.string()),
  programText: v.optional(v.string()),
  notesText: v.optional(v.string()),
  organizerName: v.string(),
  organizerLicense: v.optional(v.string()),
  coverStorageId: v.optional(v.id("_storage")),
  imageStorageIds: v.array(v.id("_storage")),
});

// Validator for a finalized offer (output of finalizeOffer / finalizeManualOffer),
// used by sync/ingest:upsertBatch and the relay HTTP actions.
export const finalOfferV = v.object({
  partnerSlug: v.string(),
  externalId: v.string(),
  sourceUrl: v.string(),
  kind: v.union(v.literal("trip"), v.literal("stay")),
  title: v.string(),
  subtitle: v.optional(v.string()),
  countryName: v.optional(v.string()),
  countryCode: v.optional(v.string()),
  place: v.optional(v.string()),
  region: v.optional(v.string()),
  categoryHints: v.array(v.string()),
  transports: v.array(transportV),
  nights: v.optional(v.number()),
  nightsMax: v.optional(v.number()),
  days: v.optional(v.number()),
  stars: v.optional(v.number()),
  board: v.optional(boardV),
  availabilityMode: v.union(v.literal("dated"), v.literal("on_request")),
  departures: v.array(departureV),
  listPrice: v.optional(
    v.object({
      price: v.number(),
      priceOld: v.optional(v.number()),
      basis: priceBasisV,
      note: v.optional(v.string()),
    })
  ),
  priceNote: v.optional(v.string()),
  departureCities: v.array(v.string()),
  supplements: v.array(supplementV),
  coverImage: v.optional(v.string()),
  images: v.array(v.string()),
  descriptionHtml: v.optional(v.string()),
  program: v.array(v.object({ day: v.optional(v.number()), title: v.string(), html: v.string() })),
  included: v.array(v.string()),
  excluded: v.array(v.string()),
  notesHtml: v.optional(v.string()),
  facts: v.array(v.object({ label: v.string(), value: v.string() })),
  organizer: v.optional(
    v.object({ name: v.string(), license: v.optional(v.string()), termsUrl: v.optional(v.string()) })
  ),
  priceListLabel: v.optional(v.string()),
  documents: v.array(v.object({ label: v.string(), url: v.string() })),
  geo: v.optional(v.object({ lat: v.number(), lng: v.number() })),
  badges: v.array(v.string()),
  sourceModifiedAt: v.optional(v.string()),
  warnings: v.array(v.string()),
  contentHash: v.string(),
  listSig: v.optional(v.string()),
});
