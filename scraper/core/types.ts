// Partner Sync: shared types and the adapter contract.
// Pure module: safe to import from Convex queries/mutations, Node actions,
// the relay CLI and tests. No Node APIs here.

export type AdapterFamily =
  | "bluevendo"
  | "dunavturs"
  | "mars"
  | "oktopod"
  | "tourpackage"
  | "wp-roam"
  | "wp-rest"
  | "tourvisio"
  | "travelo"
  | "joomla"
  | "drupal"
  | "wpjm"
  | "manual";

export type PartnerStatus = "active" | "paused" | "blocked" | "manual";
export type Transport = "bus" | "plane" | "self" | "train" | "ship";
export type Board = "ro" | "bb" | "hb" | "fb" | "ai" | "uai";
export type PriceBasis =
  | "per_person"
  | "per_person_night"
  | "per_unit"
  | "per_unit_night"
  | "per_day"
  | "per_stay"
  | "total_2_adults"
  | "unknown";
export type Availability = "available" | "few" | "sold_out" | "on_request" | "unknown";
export type Badge = "first_minute" | "last_minute" | "promo" | "new" | "few_left" | "guaranteed";

export type Departure = {
  /** Start of the stay or trip, YYYY-MM-DD. */
  date: string;
  endDate?: string;
  nights?: number;
  unit?: string;
  board?: Board;
  transport?: Transport;
  fromCity?: string;
  /** EUR, current price. */
  price?: number;
  /** EUR, price before discount. */
  priceOld?: number;
  basis: PriceBasis;
  availability?: Availability;
  note?: string;
};

export type Supplement = { label: string; price?: number; basis?: PriceBasis; note?: string };

export type NormalizedOffer = {
  partnerSlug: string;
  /** Stable id within the partner, ≤ 120 chars. */
  externalId: string;
  /** Partner's public program URL (must be on a registry host; "" for manual offers). */
  sourceUrl: string;
  kind: "trip" | "stay";
  title: string;
  subtitle?: string;
  countryName?: string;
  countryCode?: string;
  place?: string;
  region?: string;
  /** Partner categories, tags and breadcrumbs (travel type mapping input). */
  categoryHints: string[];
  transports: Transport[];
  nights?: number;
  nightsMax?: number;
  days?: number;
  stars?: number;
  board?: Board;
  /** D4: "on_request" only with an explicit signal ("na upit" or an active-only list). */
  availabilityMode: "dated" | "on_request";
  departures: Departure[];
  /** Card-level "od X €" when departures carry no price. */
  listPrice?: { price: number; priceOld?: number; basis: PriceBasis; note?: string };
  /** Partner wording for the price basis ("Cena po danu", "za 7 noći"). */
  priceNote?: string;
  departureCities: string[];
  supplements: Supplement[];
  coverImage?: string;
  images: string[];
  descriptionHtml?: string;
  program: { day?: number; title: string; html: string }[];
  included: string[];
  excluded: string[];
  notesHtml?: string;
  facts: { label: string; value: string }[];
  organizer?: { name: string; license?: string; termsUrl?: string };
  priceListLabel?: string;
  documents: { label: string; url: string }[];
  geo?: { lat: number; lng: number };
  badges: Badge[];
  /** ISO date from sitemap lastmod or REST `modified`. */
  sourceModifiedAt?: string;
  warnings: string[];
};

/** Output of finalizeOffer (Node) or finalizeManualOffer (pure). */
export type FinalOffer = NormalizedOffer & { contentHash: string; listSig?: string };

export type DiscoveredItem = {
  /** Unique per run: externalId, or a work key such as "date:2026-10-02". */
  key: string;
  url: string;
  externalId?: string;
  /** Adapter-specific work type: "detail" | "date" | "hotel" | "tour" | "rotator". */
  kind?: string;
  /** Change signal from the listing (lastmod, REST modified, card-text hash). */
  listSig?: string;
  /** Lower is fetched first. */
  priority: number;
  /** List-level fields handed back to fetchDetail/parse (JSON, ≤ 16 KB). */
  data?: unknown;
  /** ISO date of the source (lastmod / modified), used by maxAgeDays. */
  sourceModifiedAt?: string;
};

export type DiscoverResult = {
  items: DiscoveredItem[];
  listedIds: string[];
  complete: boolean;
  warnings: string[];
};

export type RawPage = {
  url: string;
  status: number;
  contentType: string;
  body: string;
  truncated: boolean;
};

export type RawDetail = { item: DiscoveredItem; pages: Record<string, RawPage> };

export type ParseResult = {
  offers: NormalizedOffer[];
  followUps?: DiscoveredItem[];
  goneIds?: string[];
  warnings: string[];
};

export type LogLevel = "info" | "warn" | "error";

export type AdapterEnv = {
  config: PartnerConfig;
  /** YYYY-MM-DD in Europe/Belgrade. */
  today: string;
  log: (level: LogLevel, text: string) => void;
};

export type GetTextOptions = {
  accept?: string;
  maxBytes?: number;
  stopWhen?: (bodySoFar: string) => boolean;
};

export type HttpLike = {
  getText(url: string, opts?: GetTextOptions): Promise<RawPage>;
  getJson<T>(url: string): Promise<{ page: RawPage; json: T }>;
};

export interface PartnerAdapter {
  family: AdapterFamily;
  /** D5: union departures per offer within a run. */
  mergeMode: boolean;
  /** How finalize builds the listed set. */
  listedFrom: "discover" | "touched";
  discover(http: HttpLike, env: AdapterEnv): Promise<DiscoverResult>;
  fetchDetail(http: HttpLike, item: DiscoveredItem, env: AdapterEnv): Promise<RawDetail>;
  /** Pure: no I/O, deterministic for (raw, env.today). */
  parse(raw: RawDetail, env: AdapterEnv): ParseResult;
}

export type PartnerConfig = {
  number: number;
  slug: string;
  name: string;
  website: string;
  logoPath: string;
  family: AdapterFamily;
  status: PartnerStatus;
  liveFetchAllowed: boolean;
  blockedReason?: string;
  /** Fetch allowlist (site plus media/API hosts). */
  hosts: string[];
  /** Path + query allowlist (D13). */
  allowedPaths: RegExp[];
  minDelayMs: number;
  dailyRequestCap: number;
  batchSize: number;
  maxBytes: number;
  refreshDays: number;
  maxAgeDays?: number;
  defaultDepartureCity?: string;
  organizer: { name: string; license?: string };
  imagePolicy: "hotlink" | "copy";
  notes?: string;
  options?: Record<string, unknown>;
};
