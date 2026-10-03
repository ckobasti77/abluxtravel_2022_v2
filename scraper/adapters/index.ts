// Family → adapter map (Node only: adapters use cheerio / sanitize-html).
import type { AdapterFamily, PartnerAdapter } from "../core/types";
import { blockedAdapter } from "./blocked";
import { bluevendoAdapter } from "./bluevendo";
import { dunavtursAdapter } from "./dunavturs";
import { joomlaAdapter } from "./joomla";
import { marsAdapter } from "./mars";
import { oktopodAdapter } from "./oktopod";
import { tourpackageAdapter } from "./tourpackage";
import { tourvisioAdapter } from "./tourvisio";
import { traveloAdapter } from "./travelo";
import { wpRestAdapter } from "./wp-rest";
import { wpRoamAdapter } from "./wp-roam";

export const ADAPTERS: Partial<Record<AdapterFamily, PartnerAdapter>> = {
  bluevendo: bluevendoAdapter,
  dunavturs: dunavtursAdapter,
  mars: marsAdapter,
  oktopod: oktopodAdapter,
  // Mayak; Jungman shares the family but is blocked (liveFetchAllowed false, D8).
  tourpackage: tourpackageAdapter,
  "wp-roam": wpRoamAdapter,
  "wp-rest": wpRestAdapter,
  tourvisio: tourvisioAdapter,
  // Blocked partners: discover/fetch refuse; parse-only (Wayback fixtures) for the relay.
  travelo: traveloAdapter,
  joomla: joomlaAdapter,
  drupal: blockedAdapter("drupal"),
  wpjm: blockedAdapter("wpjm"),
  manual: blockedAdapter("manual"),
};

export function getAdapter(family: AdapterFamily): PartnerAdapter | undefined {
  return ADAPTERS[family];
}
