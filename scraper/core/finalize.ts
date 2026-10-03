// finalizeOffer: the single exit point of every adapter (Node): sanitize all
// partner HTML, then validate, cap and hash (normalize.ts).
import { normalizeOffer } from "./normalize";
import { sanitizeFragment } from "./sanitize";
import type { FinalOffer, NormalizedOffer, PartnerConfig } from "./types";

export function finalizeOffer(offer: NormalizedOffer, config: PartnerConfig, listSig?: string): FinalOffer {
  const sanitized: NormalizedOffer = {
    ...offer,
    descriptionHtml: sanitizeFragment(offer.descriptionHtml, 60_000),
    notesHtml: sanitizeFragment(offer.notesHtml, 30_000),
    program: offer.program.map((day) => ({ ...day, html: sanitizeFragment(day.html, 8_000) ?? "" })),
  };
  const final = normalizeOffer(sanitized, config);
  return listSig ? { ...final, listSig } : final;
}
