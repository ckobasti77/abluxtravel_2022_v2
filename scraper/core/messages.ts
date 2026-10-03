// Human Serbian messages for run statuses (shown in admin). Pure.

export type RunItemStatus =
  | "queued"
  | "running"
  | "ok"
  | "partial"
  | "blocked"
  | "network"
  | "parse"
  | "failed"
  | "cancelled"
  | "skipped";

export const STATUS_MESSAGES: Record<RunItemStatus, string> = {
  queued: "Čeka na red.",
  running: "Uvoz je u toku.",
  ok: "Uspešno.",
  partial: "Uvoz je delimičan: dostignut je dnevni limit zahteva ili deo stranica nije učitan.",
  blocked:
    "Sajt partnera blokira automatsko preuzimanje (zaštita od botova). Potrebna je dozvola (whitelist IP adrese) ili feed.",
  network: "Sajt partnera nije odgovorio (mreža ili isteklo vreme). Pokušaćemo ponovo pri sledećem uvozu.",
  parse: "Struktura sajta se promenila; deo ponuda nije pročitan. Potrebna je provera adaptera.",
  failed: "Interna greška adaptera. Pogledajte dnevnik uvoza.",
  cancelled: "Uvoz je prekinut na zahtev.",
  skipped: "Uvoz nije pokrenut.",
};

export const SKIP_MESSAGES = {
  disabled: "Partner je isključen.",
  paused: "Uvoz je pauziran.",
  blocked: "Čeka dozvolu (whitelist/feed).",
  manual: "Ponude ovog partnera se unose ručno.",
  budget: "Dnevni limit zahteva je iskorišćen.",
  noAdapter: "Adapter za ovog partnera još ne postoji.",
} as const;

export const ROBOTS_MESSAGE = "robots.txt partnera ne dozvoljava pristup ovoj stranici.";
export const STALE_MESSAGE = "Prekinuto: nema odziva duže od 15 minuta.";

export function suspiciousDropMessage(found: number, previous: number): string {
  return `Neobično mali broj ponuda (${found} umesto ${previous}). Ponude nisu skinute; proverite partnera.`;
}
