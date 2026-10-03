import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";
import {
  boardV,
  changeTypeV,
  departureV,
  manualOfferV,
  partnerStatusV,
  priceBasisV,
  runItemStatusV,
  supplementV,
  transportV,
} from "./lib/syncValidators";

export default defineSchema({
  // Convex Auth tables (sessions, accounts, refresh tokens, rate limits, ...).
  // `users` below overrides authTables.users, so it must stay after the spread.
  ...authTables,
  settings: defineTable({
    key: v.literal("global"),
    workingHours: v.string(),
    address: v.string(),
    phone: v.string(),
    email: v.string(),
    instagramUrl: v.string(),
    // Tourism license (e.g. "OTP 123/2022"), shown in the footer when set.
    licenseNumber: v.optional(v.string()),
    // Social links besides Instagram (step 13); empty = hidden on the site.
    facebookUrl: v.optional(v.string()),
    tiktokUrl: v.optional(v.string()),
    youtubeUrl: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
  categories: defineTable({
    name: v.object({ sr: v.string(), en: v.string() }),
    slug: v.string(),
    type: v.union(
      v.literal("arrangement"),
      v.literal("religious")
    ),
    isMain: v.optional(v.boolean()),
    mainIcon: v.optional(v.string()),
    isActive: v.boolean(),
    order: v.number(),
    updatedAt: v.number(),
  })
    .index("by_type", ["type"])
    .index("by_slug", ["slug"])
    .index("by_type_active", ["type", "isActive"]),
  trips: defineTable({
    slug: v.string(),
    title: v.string(),
    description: v.string(),
    price: v.number(),
    currency: v.string(),
    nights: v.number(),
    days: v.number(),
    transport: v.union(
      v.literal("bus"),
      v.literal("plane"),
      v.literal("car"),
      v.literal("train"),
      v.literal("self")
    ),
    departureDate: v.string(),
    returnDate: v.string(),
    departureCity: v.string(),
    hotelInfo: v.optional(v.string()),
    depositPercentage: v.optional(v.number()),
    depositDeadline: v.optional(v.string()),
    itinerary: v.array(
      v.object({
        day: v.number(),
        date: v.string(),
        description: v.string(),
      })
    ),
    included: v.array(v.string()),
    notIncluded: v.array(v.string()),
    imageStorageIds: v.array(v.id("_storage")),
    detailMedia: v.optional(
      v.array(
        v.object({
          storageId: v.id("_storage"),
          mediaType: v.union(v.literal("video"), v.literal("image")),
          mediaName: v.optional(v.string()),
        })
      )
    ),
    heroMediaType: v.optional(v.union(v.literal("video"), v.literal("image"))),
    heroMediaStorageId: v.optional(v.id("_storage")),
    heroMediaName: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("upcoming"),
      v.literal("completed")
    ),
    categoryId: v.optional(v.id("categories")),
    isHero: v.optional(v.boolean()),
    heroIcon: v.optional(v.string()),
    featured: v.boolean(),
    order: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_status_order", ["status", "order"])
    .index("by_featured", ["featured"])
    .index("by_category", ["categoryId"]),
  accommodations: defineTable({
    tripId: v.id("trips"),
    name: v.string(),
    type: v.union(
      v.literal("villa"),
      v.literal("apartment"),
      v.literal("hotel"),
      v.literal("room"),
      v.literal("hostel"),
      v.literal("other")
    ),
    description: v.string(),
    pricePerPerson: v.number(),
    currency: v.string(),
    capacity: v.number(),
    amenities: v.array(v.string()),
    boardType: v.optional(
      v.union(
        v.literal("ro"),
        v.literal("bb"),
        v.literal("hb"),
        v.literal("fb"),
        v.literal("ai")
      )
    ),
    roomInfo: v.optional(v.string()),
    checkIn: v.optional(v.string()),
    checkOut: v.optional(v.string()),
    distanceToCenter: v.optional(v.string()),
    imageStorageIds: v.array(v.id("_storage")),
    order: v.number(),
    isActive: v.boolean(),
    updatedAt: v.number(),
  }).index("by_trip_order", ["tripId", "order"]),
  destinations: defineTable({
    tripId: v.optional(v.id("trips")),
    pageSlug: v.optional(v.string()),
    offerType: v.optional(
      v.union(v.literal("own"), v.literal("subagency"))
    ),
    title: v.string(),
    description: v.string(),
    price: v.number(),
    currency: v.string(),
    departureDate: v.optional(v.string()),
    returnDate: v.optional(v.string()),
    departureCity: v.optional(v.string()),
    durationLabel: v.optional(v.string()),
    partnerName: v.optional(v.string()),
    partnerOfferCode: v.optional(v.string()),
    iframeUrl: v.optional(v.string()),
    externalUrl: v.optional(v.string()),
    contactNote: v.optional(v.string()),
    imageStorageIds: v.array(v.id("_storage")),
    order: v.number(),
    isActive: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_trip_order", ["tripId", "order"])
    .index("by_page_order", ["pageSlug", "order"]),
  users: defineTable({
    // Convex Auth fields
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // ABLux fields
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    // owner > editor > customer. "admin"/"user" are legacy values kept until
    // users.migrateLegacyUsers has run on every deployment.
    role: v.optional(
      v.union(
        v.literal("owner"),
        v.literal("editor"),
        v.literal("customer"),
        v.literal("admin"),
        v.literal("user")
      )
    ),
    disabled: v.optional(v.boolean()),
    // Legacy (pre-Convex Auth). passwordHash is cleared once an account is migrated.
    username: v.optional(v.string()),
    passwordHash: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_username", ["username"])
    .index("by_role", ["role"]),
  slides: defineTable({
    slug: v.optional(v.string()),
    title: v.string(),
    subtitle: v.string(),
    badge: v.optional(v.string()),
    copy: v.optional(v.string()),
    mediaType: v.optional(v.union(v.literal("video"), v.literal("image"))),
    videoUrl: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    currency: v.optional(v.string()),
    nights: v.optional(v.number()),
    days: v.optional(v.number()),
    transport: v.optional(
      v.union(
        v.literal("bus"),
        v.literal("plane"),
        v.literal("car"),
        v.literal("train"),
        v.literal("self")
      )
    ),
    departureDate: v.optional(v.string()),
    returnDate: v.optional(v.string()),
    departureCity: v.optional(v.string()),
    hotelInfo: v.optional(v.string()),
    depositPercentage: v.optional(v.number()),
    depositDeadline: v.optional(v.string()),
    itinerary: v.optional(
      v.array(
        v.object({
          day: v.number(),
          date: v.string(),
          description: v.string(),
        })
      )
    ),
    included: v.optional(v.array(v.string())),
    notIncluded: v.optional(v.array(v.string())),
    imageStorageIds: v.optional(v.array(v.id("_storage"))),
    detailMedia: v.optional(
      v.array(
        v.object({
          storageId: v.id("_storage"),
          mediaType: v.union(v.literal("video"), v.literal("image")),
          mediaName: v.optional(v.string()),
        })
      )
    ),
    heroMediaType: v.optional(v.union(v.literal("video"), v.literal("image"))),
    heroMediaStorageId: v.optional(v.id("_storage")),
    heroMediaName: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("upcoming"),
        v.literal("completed")
      )
    ),
    categoryId: v.optional(v.id("categories")),
    isHero: v.optional(v.boolean()),
    heroIcon: v.optional(v.string()),
    featured: v.optional(v.boolean()),
    order: v.number(),
    isActive: v.boolean(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_order", ["order"])
    .index("by_slug", ["slug"]),
  homeRouteSlides: defineTable({
    title: v.object({ sr: v.string(), en: v.string() }),
    caption: v.object({ sr: v.string(), en: v.string() }),
    accent: v.string(),
    storageId: v.id("_storage"),
    order: v.number(),
    isActive: v.boolean(),
    updatedAt: v.number(),
    // Homepage "Najtraženije rute" (step 11): a slide with `href` is a route card.
    href: v.optional(v.string()),
    body: v.optional(v.object({ sr: v.string(), en: v.string() })),
    tone: v.optional(v.union(v.literal("brick"), v.literal("teal"), v.literal("teal-deep"), v.literal("gold"))),
  }).index("by_order", ["order"]),
  vehicleRentalImages: defineTable({
    key: v.union(v.literal("bus"), v.literal("luxuryVan")),
    storageId: v.id("_storage"),
    additionalStorageIds: v.optional(v.array(v.id("_storage"))),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
  // Partner registry (Partner Sync). Legacy status values stay valid until
  // sync/registry:migrateLegacySources has run on every deployment.
  sources: defineTable({
    slug: v.string(),
    name: v.string(),
    status: partnerStatusV,
    syncEverySeconds: v.number(),
    apiBaseUrl: v.optional(v.string()),
    webhookSecretLabel: v.optional(v.string()),
    isEnabled: v.boolean(),
    lastSyncAt: v.optional(v.number()),
    updatedAt: v.number(),
    kind: v.optional(v.union(v.literal("partner"), v.literal("internal"))),
    number: v.optional(v.number()),
    website: v.optional(v.string()),
    logoPath: v.optional(v.string()),
    adapter: v.optional(v.string()),
    blockedReason: v.optional(v.string()),
    autoPublish: v.optional(v.boolean()),
    categoryMap: v.optional(v.array(v.object({ match: v.string(), travelType: v.string() }))),
    // Business fields below are never returned by public queries.
    commissionPercent: v.optional(v.number()),
    organizerName: v.optional(v.string()),
    organizerLicense: v.optional(v.string()),
    termsUrl: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    notes: v.optional(v.string()),
    defaultDepartureCity: v.optional(v.string()),
    dailyRequestCap: v.optional(v.number()),
    robotsCache: v.optional(v.string()),
    lastRunId: v.optional(v.id("syncRuns")),
    lastRunAt: v.optional(v.number()),
    lastRunStatus: v.optional(runItemStatusV),
    lastRunMessage: v.optional(v.string()),
    lastRunDurationMs: v.optional(v.number()),
    lastRunRequests: v.optional(v.number()),
    counts: v.optional(
      v.object({ listed: v.number(), active: v.number(), public: v.number(), total: v.number() })
    ),
  })
    .index("by_slug", ["slug"])
    .index("by_enabled", ["isEnabled"])
    .index("by_number", ["number"]),
  offers: defineTable({
    sourceSlug: v.string(),
    externalId: v.string(),
    title: v.string(),
    destination: v.string(),
    departureCity: v.optional(v.string()),
    departureDate: v.optional(v.string()),
    returnDate: v.optional(v.string()),
    price: v.number(),
    currency: v.string(),
    seatsLeft: v.optional(v.number()),
    tags: v.array(v.string()),
    pdfStorageId: v.optional(v.id("_storage")),
    pdfFileName: v.optional(v.string()),
    imageStorageIds: v.optional(v.array(v.id("_storage"))),
    navTitle: v.optional(v.string()),
    normalizedHash: v.string(),
    score: v.optional(v.number()),
    rawSnapshot: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    isActive: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_source_external", ["sourceSlug", "externalId"])
    .index("by_active_updated", ["isActive", "updatedAt"])
    .index("by_destination_price", ["destination", "price"])
    .index("by_category", ["categoryId"]),
  orders: defineTable({
    items: v.array(
      v.object({
        id: v.string(),
        type: v.union(
          v.literal("trip"),
          v.literal("destination"),
          v.literal("offer"),
          v.literal("accommodation")
        ),
        title: v.string(),
        price: v.number(),
        currency: v.string(),
        quantity: v.number(),
        meta: v.optional(v.any()),
      })
    ),
    totalAmount: v.number(),
    currency: v.string(),
    customerEmail: v.optional(v.string()),
    customerName: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    paymentMethod: v.optional(
      v.union(v.literal("nbs_ips_qr"), v.literal("stripe"), v.literal("manual"))
    ),
    paymentStatus: v.optional(
      v.union(
        v.literal("awaiting_payment"),
        v.literal("paid"),
        v.literal("failed")
      )
    ),
    ipsReference: v.optional(v.string()),
    ipsPayload: v.optional(v.string()),
    ipsAmountRsd: v.optional(v.number()),
    ipsExchangeRate: v.optional(v.number()),
    ipsExchangeRateDate: v.optional(v.string()),
    ipsPayeeAccount: v.optional(v.string()),
    ipsPayeeName: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      // Inbox "U obradi" (step 13).
      v.literal("in_progress"),
      v.literal("confirmed"),
      v.literal("paid"),
      v.literal("cancelled")
    ),
    stripeSessionId: v.optional(v.string()),
    note: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    // Inbox work fields (step 13), as on inquiries: assignee and staff notes.
    assigneeId: v.optional(v.id("users")),
    notes: v.optional(v.array(v.object({ at: v.number(), by: v.id("users"), text: v.string() }))),
    updatedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"])
    .index("by_user", ["userId"]),
  auditLog: defineTable({
    actorId: v.optional(v.id("users")),
    actorEmail: v.optional(v.string()),
    actorRole: v.optional(v.string()),
    action: v.string(),
    targetTable: v.optional(v.string()),
    targetId: v.optional(v.string()),
    summary: v.optional(v.string()),
    at: v.number(),
  })
    .index("by_at", ["at"])
    .index("by_actor", ["actorId", "at"]),
  rateLimits: defineTable({
    key: v.string(),
    windowStart: v.number(),
    count: v.number(),
  }).index("by_key", ["key"]),
  // ---------------------------------------------------------------------
  // Partner Sync (step 07): slim catalog cards, heavy details, sync bookkeeping.
  offerCards: defineTable({
    kind: v.union(v.literal("partner"), v.literal("ablux")),
    partnerSlug: v.string(),
    externalId: v.string(),
    slug: v.string(),
    href: v.optional(v.string()),
    offerKind: v.union(v.literal("trip"), v.literal("stay")),
    title: v.string(),
    place: v.optional(v.string()),
    region: v.optional(v.string()),
    countryCode: v.optional(v.string()),
    countryName: v.optional(v.string()),
    countrySlug: v.optional(v.string()),
    travelTypes: v.array(v.string()),
    transports: v.array(transportV),
    nights: v.optional(v.number()),
    nightsMax: v.optional(v.number()),
    days: v.optional(v.number()),
    stars: v.optional(v.number()),
    board: v.optional(boardV),
    availabilityMode: v.union(v.literal("dated"), v.literal("on_request")),
    departureDates: v.array(v.string()),
    nextDepartureDate: v.optional(v.string()),
    sortDeparture: v.string(),
    departureCities: v.array(v.string()),
    priceKind: v.union(v.literal("from"), v.literal("on_request")),
    priceFrom: v.optional(v.number()),
    priceOld: v.optional(v.number()),
    priceBasis: v.optional(priceBasisV),
    priceNote: v.optional(v.string()),
    sortPrice: v.number(),
    currency: v.string(),
    coverUrl: v.optional(v.string()),
    coverStorageId: v.optional(v.id("_storage")),
    organizerName: v.string(),
    badges: v.array(v.string()),
    imported: v.object({
      title: v.string(),
      travelTypes: v.array(v.string()),
      coverUrl: v.optional(v.string()),
      coverStorageId: v.optional(v.id("_storage")),
    }),
    overrides: v.optional(
      v.object({
        title: v.optional(v.string()),
        intro: v.optional(v.string()),
        travelTypes: v.optional(v.array(v.string())),
        coverUrl: v.optional(v.string()),
        coverStorageId: v.optional(v.id("_storage")),
      })
    ),
    listed: v.boolean(),
    isActive: v.boolean(),
    published: v.boolean(),
    hidden: v.boolean(),
    featured: v.boolean(),
    partnerEnabled: v.boolean(),
    isPublic: v.boolean(),
    searchText: v.string(),
    firstSeenAt: v.number(),
    updatedAt: v.number(),
    removedAt: v.optional(v.number()),
    runBaseline: v.optional(
      v.object({
        runId: v.id("syncRuns"),
        isNew: v.boolean(),
        priceFrom: v.optional(v.number()),
        priceBasis: v.optional(priceBasisV),
        nextDepartureDate: v.optional(v.string()),
        departureCount: v.number(),
      })
    ),
  })
    .index("by_partner_external", ["partnerSlug", "externalId"])
    .index("by_slug", ["slug"])
    .index("by_partner_public", ["partnerSlug", "isPublic"])
    .index("by_public_departure", ["isPublic", "sortDeparture"])
    .index("by_public_price", ["isPublic", "sortPrice"])
    .index("by_public_first_seen", ["isPublic", "firstSeenAt"])
    .index("by_public_country_departure", ["isPublic", "countrySlug", "sortDeparture"])
    .index("by_public_featured", ["isPublic", "featured", "sortDeparture"])
    .index("by_active_departure", ["isActive", "sortDeparture"])
    .index("by_updated", ["updatedAt"])
    .searchIndex("search_text", {
      searchField: "searchText",
      filterFields: ["partnerSlug", "isPublic", "kind"],
    }),
  offerDetails: defineTable({
    cardId: v.id("offerCards"),
    partnerSlug: v.string(),
    externalId: v.string(),
    sourceUrl: v.string(),
    subtitle: v.optional(v.string()),
    descriptionHtml: v.optional(v.string()),
    program: v.array(v.object({ day: v.optional(v.number()), title: v.string(), html: v.string() })),
    included: v.array(v.string()),
    excluded: v.array(v.string()),
    notesHtml: v.optional(v.string()),
    departures: v.array(departureV),
    supplements: v.array(supplementV),
    gallery: v.array(
      v.object({ url: v.string(), storageId: v.optional(v.id("_storage")), alt: v.optional(v.string()) })
    ),
    organizer: v.object({
      name: v.string(),
      license: v.optional(v.string()),
      termsUrl: v.optional(v.string()),
    }),
    priceListLabel: v.optional(v.string()),
    documents: v.array(v.object({ label: v.string(), url: v.string() })),
    geo: v.optional(v.object({ lat: v.number(), lng: v.number() })),
    facts: v.array(v.object({ label: v.string(), value: v.string() })),
    warnings: v.array(v.string()),
    updatedAt: v.number(),
  })
    .index("by_card", ["cardId"])
    .index("by_partner_external", ["partnerSlug", "externalId"]),
  offerSyncMeta: defineTable({
    partnerSlug: v.string(),
    externalId: v.string(),
    cardId: v.id("offerCards"),
    listSig: v.optional(v.string()),
    contentHash: v.string(),
    detailFetchedAt: v.optional(v.number()),
    contentFetchedAt: v.optional(v.number()),
    lastSeenRunId: v.optional(v.id("syncRuns")),
    lastSeenAt: v.optional(v.number()),
    sourceModifiedAt: v.optional(v.string()),
    parseErrorCount: v.number(),
  }).index("by_partner_external", ["partnerSlug", "externalId"]),
  offerChanges: defineTable({
    cardId: v.id("offerCards"),
    partnerSlug: v.string(),
    runId: v.optional(v.id("syncRuns")),
    type: changeTypeV,
    title: v.string(),
    slug: v.string(),
    oldPrice: v.optional(v.number()),
    newPrice: v.optional(v.number()),
    basis: v.optional(priceBasisV),
    oldNextDeparture: v.optional(v.string()),
    newNextDeparture: v.optional(v.string()),
    at: v.number(),
  })
    .index("by_at", ["at"])
    .index("by_partner_at", ["partnerSlug", "at"])
    .index("by_type_at", ["type", "at"])
    .index("by_card_at", ["cardId", "at"]),
  syncRuns: defineTable({
    trigger: v.union(v.literal("cron"), v.literal("manual"), v.literal("cli"), v.literal("relay")),
    requestedBy: v.optional(v.id("users")),
    cycleKey: v.string(),
    status: v.union(
      v.literal("running"),
      v.literal("ok"),
      v.literal("partial"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    partnerSlugs: v.array(v.string()),
    maxRequestsPerPartner: v.optional(v.number()),
    cancelRequested: v.optional(v.boolean()),
    // Ignore stored hashes/fetch times and fetch every listed page again (after parser fixes).
    forceRefetch: v.optional(v.boolean()),
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
    totals: v.optional(
      v.object({
        ok: v.number(),
        partial: v.number(),
        blocked: v.number(),
        failed: v.number(),
        skipped: v.number(),
        created: v.number(),
        updated: v.number(),
        removed: v.number(),
        expired: v.number(),
        requests: v.number(),
      })
    ),
  })
    .index("by_started", ["startedAt"])
    .index("by_status", ["status"]),
  syncRunItems: defineTable({
    runId: v.id("syncRuns"),
    partnerSlug: v.string(),
    status: runItemStatusV,
    phase: v.union(v.literal("discover"), v.literal("fetch"), v.literal("finalize"), v.literal("done")),
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
    heartbeatAt: v.number(),
    requestBudget: v.number(),
    requestsUsed: v.number(),
    discovered: v.number(),
    queued: v.number(),
    processed: v.number(),
    created: v.number(),
    updated: v.number(),
    unchanged: v.number(),
    removed: v.number(),
    expired: v.number(),
    parseErrors: v.number(),
    discoveryComplete: v.boolean(),
    queueComplete: v.boolean(),
    listedIds: v.optional(v.array(v.string())),
    followUpKeys: v.optional(v.array(v.string())),
    clientState: v.optional(v.string()),
    errorClass: v.optional(v.string()),
    message: v.optional(v.string()),
    log: v.array(
      v.object({
        at: v.number(),
        level: v.union(v.literal("info"), v.literal("warn"), v.literal("error")),
        text: v.string(),
      })
    ),
  })
    .index("by_run", ["runId"])
    .index("by_partner_started", ["partnerSlug", "startedAt"])
    .index("by_status", ["status"]),
  // Transient work items: rows are deleted as they are processed (not business data).
  syncQueue: defineTable({
    runItemId: v.id("syncRunItems"),
    seq: v.number(),
    key: v.string(),
    url: v.string(),
    externalId: v.optional(v.string()),
    kind: v.optional(v.string()),
    listSig: v.optional(v.string()),
    dataJson: v.optional(v.string()),
  }).index("by_item_seq", ["runItemId", "seq"]),
  syncState: defineTable({
    key: v.literal("global"),
    activeRunId: v.optional(v.id("syncRuns")),
    lastAutoCycleKey: v.optional(v.string()),
    lastAutoRunAt: v.optional(v.number()),
    lastManualCycleKey: v.optional(v.string()),
    lastManualRunAt: v.optional(v.number()),
    lastManualBy: v.optional(v.id("users")),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
  partnerImages: defineTable({
    urlHash: v.string(),
    url: v.string(),
    partnerSlug: v.string(),
    storageId: v.id("_storage"),
    contentType: v.string(),
    bytes: v.number(),
    fetchedAt: v.number(),
  })
    .index("by_url_hash", ["urlHash"])
    .index("by_partner_fetched", ["partnerSlug", "fetchedAt"]),
  inquiries: defineTable({
    cardId: v.optional(v.id("offerCards")),
    offer: v.optional(
      v.object({
        title: v.string(),
        slug: v.string(),
        partnerSlug: v.string(),
        organizerName: v.string(),
        sourceUrl: v.optional(v.string()),
        priceFrom: v.optional(v.number()),
        priceBasis: v.optional(priceBasisV),
      })
    ),
    fullName: v.string(),
    phone: v.string(),
    email: v.string(),
    // General inquiries without an offer (Rent a bus, Kontakt): short topic line, step 12.
    subject: v.optional(v.string()),
    travelers: v.optional(v.number()),
    preferredDeparture: v.optional(v.string()),
    message: v.optional(v.string()),
    consentAt: v.number(),
    locale: v.union(v.literal("sr"), v.literal("en")),
    status: v.union(
      v.literal("new"),
      v.literal("in_progress"),
      v.literal("confirmed"),
      v.literal("cancelled")
    ),
    assigneeId: v.optional(v.id("users")),
    notes: v.array(v.object({ at: v.number(), by: v.id("users"), text: v.string() })),
    userId: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status_created", ["status", "createdAt"])
    .index("by_created", ["createdAt"])
    .index("by_card", ["cardId"]),
  manualImports: defineTable({
    partnerSlug: v.string(),
    storageId: v.id("_storage"),
    fileName: v.string(),
    mimeType: v.string(),
    size: v.number(),
    method: v.union(v.literal("ai"), v.literal("manual")),
    status: v.union(
      v.literal("uploaded"),
      v.literal("extracting"),
      v.literal("needs_review"),
      v.literal("done"),
      v.literal("failed")
    ),
    draftCount: v.number(),
    message: v.optional(v.string()),
    model: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_partner_created", ["partnerSlug", "createdAt"])
    .index("by_created", ["createdAt"]),
  offerDrafts: defineTable({
    importId: v.optional(v.id("manualImports")),
    partnerSlug: v.string(),
    status: v.union(v.literal("draft"), v.literal("approved"), v.literal("discarded")),
    offer: manualOfferV,
    confidence: v.optional(v.union(v.literal("high"), v.literal("medium"), v.literal("low"))),
    warnings: v.array(v.string()),
    cardId: v.optional(v.id("offerCards")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_import", ["importId"])
    .index("by_partner_status", ["partnerSlug", "status"]),
});
