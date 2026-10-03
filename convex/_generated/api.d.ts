/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accommodations from "../accommodations.js";
import type * as audit from "../audit.js";
import type * as auth from "../auth.js";
import type * as authLegacy from "../authLegacy.js";
import type * as catalog from "../catalog.js";
import type * as categories from "../categories.js";
import type * as crons from "../crons.js";
import type * as destinations from "../destinations.js";
import type * as files from "../files.js";
import type * as homeRouteSlides from "../homeRouteSlides.js";
import type * as http from "../http.js";
import type * as inbox from "../inbox.js";
import type * as inquiries from "../inquiries.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_audit from "../lib/audit.js";
import type * as lib_catalogCards from "../lib/catalogCards.js";
import type * as lib_catalogProjection from "../lib/catalogProjection.js";
import type * as lib_constants from "../lib/constants.js";
import type * as lib_inbox from "../lib/inbox.js";
import type * as lib_passwords from "../lib/passwords.js";
import type * as lib_pricing from "../lib/pricing.js";
import type * as lib_profile from "../lib/profile.js";
import type * as lib_rateLimit from "../lib/rateLimit.js";
import type * as lib_relaySecret from "../lib/relaySecret.js";
import type * as lib_roles from "../lib/roles.js";
import type * as lib_serverSecret from "../lib/serverSecret.js";
import type * as lib_syncValidators from "../lib/syncValidators.js";
import type * as manualImport from "../manualImport.js";
import type * as manualImportNode from "../manualImportNode.js";
import type * as offerAdmin from "../offerAdmin.js";
import type * as offers from "../offers.js";
import type * as orders from "../orders.js";
import type * as partners from "../partners.js";
import type * as rateLimits from "../rateLimits.js";
import type * as settings from "../settings.js";
import type * as slides from "../slides.js";
import type * as stripe from "../stripe.js";
import type * as sync_connectivity from "../sync/connectivity.js";
import type * as sync_images from "../sync/images.js";
import type * as sync_imagesDb from "../sync/imagesDb.js";
import type * as sync_ingest from "../sync/ingest.js";
import type * as sync_orchestrator from "../sync/orchestrator.js";
import type * as sync_registry from "../sync/registry.js";
import type * as sync_relay from "../sync/relay.js";
import type * as sync_worker from "../sync/worker.js";
import type * as syncAdmin from "../syncAdmin.js";
import type * as trips from "../trips.js";
import type * as users from "../users.js";
import type * as vehicleRentalImages from "../vehicleRentalImages.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accommodations: typeof accommodations;
  audit: typeof audit;
  auth: typeof auth;
  authLegacy: typeof authLegacy;
  catalog: typeof catalog;
  categories: typeof categories;
  crons: typeof crons;
  destinations: typeof destinations;
  files: typeof files;
  homeRouteSlides: typeof homeRouteSlides;
  http: typeof http;
  inbox: typeof inbox;
  inquiries: typeof inquiries;
  "lib/access": typeof lib_access;
  "lib/audit": typeof lib_audit;
  "lib/catalogCards": typeof lib_catalogCards;
  "lib/catalogProjection": typeof lib_catalogProjection;
  "lib/constants": typeof lib_constants;
  "lib/inbox": typeof lib_inbox;
  "lib/passwords": typeof lib_passwords;
  "lib/pricing": typeof lib_pricing;
  "lib/profile": typeof lib_profile;
  "lib/rateLimit": typeof lib_rateLimit;
  "lib/relaySecret": typeof lib_relaySecret;
  "lib/roles": typeof lib_roles;
  "lib/serverSecret": typeof lib_serverSecret;
  "lib/syncValidators": typeof lib_syncValidators;
  manualImport: typeof manualImport;
  manualImportNode: typeof manualImportNode;
  offerAdmin: typeof offerAdmin;
  offers: typeof offers;
  orders: typeof orders;
  partners: typeof partners;
  rateLimits: typeof rateLimits;
  settings: typeof settings;
  slides: typeof slides;
  stripe: typeof stripe;
  "sync/connectivity": typeof sync_connectivity;
  "sync/images": typeof sync_images;
  "sync/imagesDb": typeof sync_imagesDb;
  "sync/ingest": typeof sync_ingest;
  "sync/orchestrator": typeof sync_orchestrator;
  "sync/registry": typeof sync_registry;
  "sync/relay": typeof sync_relay;
  "sync/worker": typeof sync_worker;
  syncAdmin: typeof syncAdmin;
  trips: typeof trips;
  users: typeof users;
  vehicleRentalImages: typeof vehicleRentalImages;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
