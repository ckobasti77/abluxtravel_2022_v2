// Families without a live adapter (blocked partners and the manual partner).
// The worker never reaches them (liveFetchAllowed: false, D8); if anything
// does, they refuse loudly instead of fetching. A parse-only implementation
// (built on Wayback fixtures) can be attached for the relay.
import { BlockedError } from "../core/errors";
import type { AdapterFamily, PartnerAdapter } from "../core/types";

export function blockedAdapter(family: AdapterFamily, parse?: PartnerAdapter["parse"]): PartnerAdapter {
  const refuse = (): never => {
    throw new BlockedError("Čeka dozvolu (whitelist/feed): ovaj partner se ne preuzima automatski.");
  };
  return {
    family,
    mergeMode: false,
    listedFrom: "discover",
    discover: async () => refuse(),
    fetchDetail: async () => refuse(),
    parse: parse ?? (() => refuse()),
  };
}
