// Plain-language labels for statuses and codes shown in the admin (sr, en).
import type { Status } from "../../components/ui/chip";

type Pair = { sr: string; en: string };
export type Labeled = Pair & { status: Status };

export const pick = (pair: Pair, language: "sr" | "en") => (language === "en" ? pair.en : pair.sr);

// ---- Partners and sync --------------------------------------------------------

export const PARTNER_STATUS: Record<string, Labeled> = {
  active: { sr: "Aktivan", en: "Active", status: "active" },
  paused: { sr: "Pauziran", en: "Paused", status: "off" },
  blocked: { sr: "Čeka dozvolu (whitelist/feed)", en: "Waiting for permission (whitelist/feed)", status: "warning" },
  manual: { sr: "Ručni unos", en: "Manual entry", status: "off" },
  planned: { sr: "Planiran", en: "Planned", status: "off" },
  connected: { sr: "Povezan", en: "Connected", status: "active" },
  syncing: { sr: "Uvoz u toku", en: "Import running", status: "progress" },
};

export const RUN_STATUS: Record<string, Labeled> = {
  queued: { sr: "Čeka na red", en: "Queued", status: "progress" },
  running: { sr: "U toku", en: "Running", status: "progress" },
  ok: { sr: "Uspešno", en: "Successful", status: "active" },
  partial: { sr: "Delimično", en: "Partial", status: "warning" },
  blocked: { sr: "Blokirano", en: "Blocked", status: "error" },
  network: { sr: "Sajt nije odgovorio", en: "Site did not respond", status: "error" },
  parse: { sr: "Promenjena struktura sajta", en: "Site structure changed", status: "error" },
  failed: { sr: "Neuspešno", en: "Failed", status: "error" },
  cancelled: { sr: "Prekinuto", en: "Cancelled", status: "off" },
  skipped: { sr: "Preskočeno", en: "Skipped", status: "off" },
  completed: { sr: "Završeno", en: "Completed", status: "active" },
  done: { sr: "Završeno", en: "Completed", status: "active" },
};

export const TRIGGER_LABEL: Record<string, Pair> = {
  cron: { sr: "Automatski (06:00)", en: "Automatic (06:00)" },
  manual: { sr: "Ručno iz admina", en: "Manual from admin" },
  cli: { sr: "Iz komandne linije", en: "From the command line" },
  relay: { sr: "Relay", en: "Relay" },
};

// ---- Offer changes --------------------------------------------------------------

export const CHANGE_TYPE: Record<string, Labeled> = {
  new: { sr: "Nova ponuda", en: "New offer", status: "active" },
  price_down: { sr: "Niža cena", en: "Price down", status: "active" },
  price_up: { sr: "Viša cena", en: "Price up", status: "warning" },
  dates: { sr: "Promenjeni termini", en: "Dates changed", status: "progress" },
  removed: { sr: "Skinuta kod partnera", en: "Removed by partner", status: "error" },
  expired: { sr: "Istekla", en: "Expired", status: "off" },
  returned: { sr: "Ponovo u ponudi", en: "Back on offer", status: "active" },
};

// ---- Inbox ----------------------------------------------------------------------

export const INBOX_STATUS: Record<"new" | "in_progress" | "confirmed" | "cancelled", Labeled> = {
  new: { sr: "Novo", en: "New", status: "warning" },
  in_progress: { sr: "U obradi", en: "In progress", status: "progress" },
  confirmed: { sr: "Potvrđeno", en: "Confirmed", status: "active" },
  cancelled: { sr: "Otkazano", en: "Cancelled", status: "off" },
};

export const PAYMENT_STATUS: Record<"awaiting_payment" | "paid" | "failed", Labeled> = {
  awaiting_payment: { sr: "Čeka se uplata", en: "Awaiting payment", status: "warning" },
  paid: { sr: "Plaćeno", en: "Paid", status: "active" },
  failed: { sr: "Uplata nije uspela", en: "Payment failed", status: "error" },
};

// ---- Offers ---------------------------------------------------------------------

export const PRICE_BASIS: Record<string, Pair> = {
  per_person: { sr: "po osobi", en: "per person" },
  per_person_night: { sr: "po osobi za noćenje", en: "per person per night" },
  per_unit: { sr: "po smeštajnoj jedinici", en: "per room or unit" },
  per_unit_night: { sr: "po jedinici za noćenje", en: "per unit per night" },
  per_day: { sr: "po danu", en: "per day" },
  per_stay: { sr: "za ceo boravak", en: "for the whole stay" },
  total_2_adults: { sr: "ukupno za 2 osobe", en: "total for 2 people" },
  unknown: { sr: "osnova nije poznata", en: "basis unknown" },
};

export const BOARD: Record<string, Pair> = {
  ro: { sr: "Bez obroka", en: "Room only" },
  bb: { sr: "Noćenje sa doručkom", en: "Bed and breakfast" },
  hb: { sr: "Polupansion", en: "Half board" },
  fb: { sr: "Pun pansion", en: "Full board" },
  ai: { sr: "All inclusive", en: "All inclusive" },
  uai: { sr: "Ultra all inclusive", en: "Ultra all inclusive" },
};

export const TRANSPORT: Record<string, Pair> = {
  bus: { sr: "Autobus", en: "Coach" },
  plane: { sr: "Avion", en: "Plane" },
  self: { sr: "Sopstveni prevoz", en: "Own transport" },
  train: { sr: "Voz", en: "Train" },
  ship: { sr: "Brod", en: "Ship" },
};

/** Offer state as one status light: public, hidden, unpublished, inactive, removed. */
export function offerState(row: { isPublic: boolean; hidden: boolean; published: boolean; listed: boolean; isActive: boolean }): Labeled {
  if (!row.listed) return { sr: "Skinuta kod partnera", en: "Removed by partner", status: "error" };
  if (row.hidden) return { sr: "Sakrivena", en: "Hidden", status: "off" };
  if (!row.published) return { sr: "Nije objavljena", en: "Not published", status: "warning" };
  if (!row.isActive) return { sr: "Neaktivna (bez polazaka)", en: "Inactive (no departures)", status: "off" };
  if (row.isPublic) return { sr: "Na sajtu", en: "On the site", status: "active" };
  return { sr: "Partner isključen", en: "Partner switched off", status: "off" };
}

// ---- Errors ---------------------------------------------------------------------

const ERRORS: Record<string, Pair> = {
  UNAUTHENTICATED: { sr: "Sesija je istekla. Prijavite se ponovo.", en: "Your session expired. Please sign in again." },
  FORBIDDEN: { sr: "Za ovu radnju nemate dozvolu.", en: "You do not have permission for this action." },
  NOT_FOUND: { sr: "Stavka više ne postoji. Osvežite stranicu.", en: "This item no longer exists. Refresh the page." },
  SYNC_RUNNING: { sr: "Uvoz je već u toku. Sačekajte da se završi.", en: "An import is already running." },
  SYNC_COOLDOWN: { sr: "Ručni uvoz je već pokrenut u ovom ciklusu. Sledeći je automatski u 06:00.", en: "A manual import already ran this cycle. The next one runs automatically at 06:00." },
  LIVE_FETCH_NOT_ALLOWED: { sr: "Ovaj partner još nije dozvolio automatsko preuzimanje.", en: "This partner has not allowed automatic fetching yet." },
  INVALID_TITLE: { sr: "Naslov mora imati od 1 do 160 znakova.", en: "The title must have 1 to 160 characters." },
  INVALID_INTRO: { sr: "Uvod može imati najviše 600 znakova.", en: "The intro can have at most 600 characters." },
  INVALID_COVER_URL: { sr: "Adresa slike mora počinjati sa https://.", en: "The image address must start with https://." },
  INVALID_TRAVEL_TYPE: { sr: "Izaberite najviše tri vrste putovanja.", en: "Choose at most three travel types." },
  INVALID_URL: { sr: "Adresa mora početi sa https://.", en: "The address must start with https://." },
  INVALID_EMAIL: { sr: "E-adresa nije ispravna.", en: "The e-mail address is not valid." },
  INVALID_COMMISSION: { sr: "Provizija mora biti između 0 i 100 %.", en: "Commission must be between 0 and 100 %." },
  INVALID_CATEGORY_MAP: { sr: "Proverite mapiranje kategorija: svaki red mora imati tekst i vrstu putovanja.", en: "Check the category mapping: every row needs text and a travel type." },
  INVALID_NOTE: { sr: "Beleška ne može biti prazna (najviše 2.000 znakova).", en: "A note cannot be empty (max 2,000 characters)." },
  INVALID_ASSIGNEE: { sr: "Izabrani kolega više nema pristup administraciji.", en: "The selected colleague no longer has admin access." },
  INVALID_OFFER: { sr: "Ponuda mora imati naslov (najviše 160 znakova).", en: "The offer needs a title (max 160 characters)." },
  FILE_TOO_LARGE: { sr: "Fajl je prevelik. PDF do 20 MB, ostalo do 5 MB.", en: "The file is too large. PDF up to 20 MB, others up to 5 MB." },
  UNSUPPORTED_FILE_SAVE_AS_PDF_OR_XLSX: { sr: "Ovaj format nije podržan. Sačuvajte fajl kao PDF ili .xlsx.", en: "This format is not supported. Save the file as PDF or .xlsx." },
  TOO_MANY: { sr: "Izabrano je previše stavki odjednom (najviše 200).", en: "Too many items selected at once (max 200)." },
  TOO_MANY_ATTEMPTS: { sr: "Previše pokušaja. Pokušajte ponovo za sat vremena.", en: "Too many attempts. Try again in an hour." },
};

export function errorMessage(code: string | null, language: "sr" | "en") {
  const pair = code ? ERRORS[code] : undefined;
  if (pair) return pick(pair, language);
  return language === "en" ? "Something went wrong. Please try again." : "Nešto nije u redu. Pokušajte ponovo.";
}

/** One status light per partner card: switch, permission, then the last run. */
export function partnerLight(partner: {
  isEnabled: boolean;
  status: string;
  lastRun: { status?: string } | null;
}): Labeled {
  if (!partner.isEnabled) return { sr: "Isključen", en: "Switched off", status: "off" };
  if (partner.status === "blocked") return PARTNER_STATUS.blocked;
  if (partner.status === "manual") return PARTNER_STATUS.manual;
  if (partner.status === "paused") return PARTNER_STATUS.paused;
  const run = partner.lastRun?.status ? RUN_STATUS[partner.lastRun.status] : undefined;
  return run ?? { sr: "Još nije uvezeno", en: "Not imported yet", status: "off" };
}
