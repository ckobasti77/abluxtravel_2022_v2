// Adapter behaviour that Convex mutations need without importing adapters
// (adapters are Node-only). A test keeps this in sync with scraper/adapters.
import type { AdapterFamily } from "./types";

export type FamilyBehavior = { mergeMode: boolean; listedFrom: "discover" | "touched" };

export const FAMILY_BEHAVIOR: Record<AdapterFamily, FamilyBehavior> = {
  bluevendo: { mergeMode: true, listedFrom: "touched" },
  tourvisio: { mergeMode: true, listedFrom: "touched" },
  dunavturs: { mergeMode: false, listedFrom: "discover" },
  mars: { mergeMode: false, listedFrom: "discover" },
  oktopod: { mergeMode: false, listedFrom: "discover" },
  tourpackage: { mergeMode: false, listedFrom: "discover" },
  "wp-roam": { mergeMode: false, listedFrom: "discover" },
  "wp-rest": { mergeMode: false, listedFrom: "discover" },
  travelo: { mergeMode: false, listedFrom: "discover" },
  joomla: { mergeMode: false, listedFrom: "discover" },
  drupal: { mergeMode: false, listedFrom: "discover" },
  wpjm: { mergeMode: false, listedFrom: "discover" },
  manual: { mergeMode: false, listedFrom: "discover" },
};
