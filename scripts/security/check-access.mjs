// Security checks against the Convex DEV deployment.
//   node --env-file=.env.local scripts/security/check-access.mjs [--only <group>]
// Groups: inventory, anon, customer, editor, owner, removed, signin, legacy, orders.
// Credentials come from night-run/SECRETS.local.md and are never printed.
// Results: night-run/qa/03-security-check.json (exit code 1 on any FAIL).
import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { anyApi, makeFunctionReference } from "convex/server";
import {
  assertDevDeployment,
  convex,
  getArg,
  readEnvLocal,
  readSecret,
  ROOT,
} from "../lib/convex-cli.mjs";

assertDevDeployment();

const URL_ = process.env.NEXT_PUBLIC_CONVEX_URL ?? readEnvLocal().NEXT_PUBLIC_CONVEX_URL;
const SERVER_SECRET = readEnvLocal().ABLUX_SERVER_SECRET ?? "";
const ONLY = getArg("only");
const TS = Date.now();
const ACCOUNTS = {
  owner: "abluxtravel@gmail.com",
  editor: "qa-editor@ablux.local",
  customer: "qa-customer@ablux.local",
};
const ACCESS = JSON.parse(
  readFileSync(path.join(ROOT, "scripts", "security", "function-access.json"), "utf8")
).functions;

// ---- result helpers -----------------------------------------------------------

const results = [];
const record = (group, name, status, detail = "") => {
  results.push({ group, name, status, detail });
  console.log(`${status.padEnd(4)} [${group}] ${name}${detail ? ` — ${detail}` : ""}`);
};
const skipError = (message) => Object.assign(new Error(message), { skip: true });
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
async function check(group, name, fn) {
  try {
    const detail = await fn();
    record(group, name, "PASS", typeof detail === "string" ? detail : "");
  } catch (error) {
    record(group, name, error?.skip ? "SKIP" : "FAIL", String(error?.message ?? error).slice(0, 300));
  }
}
const runGroup = (group) => !ONLY || ONLY === group;

const errorCode = (error) => {
  if (typeof error?.data === "string") return error.data;
  const message = String(error?.message ?? error);
  const match = message.match(/ConvexError: ([A-Z_]+)/);
  return match ? match[1] : message;
};

async function expectError(promise, expected) {
  try {
    await promise;
  } catch (error) {
    const code = errorCode(error);
    assert(code === expected || String(error?.message).includes(expected), `očekivano ${expected}, dobijeno ${code}`);
    return;
  }
  throw new Error(`očekivano ${expected}, poziv je uspeo`);
}

// The pre-step-03 admin password is still in git history (history is never
// rewritten). Read it from there at runtime so it is not repeated in the tree;
// it is never printed.
function leakedAdminPassword() {
  const log = spawnSync("git", ["log", "--all", "-p", "--", "convex/auth.ts"], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return log.stdout?.match(/ADMIN_PASSWORD = "([^"]+)"/)?.[1] ?? null;
}

// ---- clients ------------------------------------------------------------------

const fn = (identifier) => makeFunctionReference(identifier.replace(".js:", ":"));
const anon = () => new ConvexHttpClient(URL_);
const signedIn = [];

async function signIn(email, password) {
  const client = anon();
  const result = await client.action(anyApi.auth.signIn, {
    provider: "password",
    params: { flow: "signIn", email, password },
  });
  assert(result?.tokens?.token, "nema tokena");
  client.setAuth(result.tokens.token);
  signedIn.push(client);
  return client;
}

async function signInAs(role) {
  const email = ACCOUNTS[role];
  const password = readSecret(email);
  assert(password, `nema lozinke za ${email} u SECRETS.local.md`);
  return signIn(email, password);
}

async function call(client, identifier, args) {
  const type = identifier.startsWith("users.js:changePassword") || identifier.startsWith("users.js:setDisabled")
    ? "action"
    : FUNCTION_TYPES.get(identifier);
  if (type === "Query" || type === "query") return client.query(fn(identifier), args);
  if (type === "Action" || type === "action") return client.action(fn(identifier), args);
  return client.mutation(fn(identifier), args);
}

// ---- inventory ----------------------------------------------------------------

const spec = JSON.parse(convex(["function-spec"]).stdout);
const FUNCTION_TYPES = new Map(
  spec.functions
    .filter((item) => item.identifier && item.visibility?.kind === "public")
    .map((item) => [item.identifier, item.functionType])
);

const GUARD = /^\s*(const \w+ = )?await (requireRole|requireUser|requireRoleInAction)\(|^\s*requireServerSecret\(/;

if (runGroup("inventory")) {
  await check("inventory", "svaka javna funkcija je klasifikovana", () => {
    const missing = [...FUNCTION_TYPES.keys()].filter((id) => !ACCESS[id]);
    const stale = Object.keys(ACCESS).filter((id) => !FUNCTION_TYPES.has(id));
    assert(missing.length === 0, `neklasifikovane: ${missing.join(", ")}`);
    assert(stale.length === 0, `zastarele u JSON-u: ${stale.join(", ")}`);
    return `${FUNCTION_TYPES.size} javnih funkcija`;
  });

  await check("inventory", "zaštićene funkcije počinju proverom uloge/tajne", () => {
    const bad = [];
    for (const [identifier, level] of Object.entries(ACCESS)) {
      if (level === "public" || level === "auth") continue;
      const [file, name] = identifier.split(".js:");
      const source = readFileSync(path.join(ROOT, "convex", `${file}.ts`), "utf8");
      const start = source.indexOf(`export const ${name} = `);
      const handler = source.slice(start).match(/handler: async \([^)]*\)(?:: [^=]+)? => \{\r?\n([^\r\n]*)/);
      if (start < 0 || !handler || !GUARD.test(handler[1])) bad.push(identifier);
    }
    assert(bad.length === 0, `bez provere na prvoj liniji: ${bad.join(", ")}`);
  });
}

// Stop early if the static audit failed: runtime calls below would be unsafe.
if (results.some((result) => result.group === "inventory" && result.status === "FAIL")) {
  finish();
}

// ---- fixtures (created by the QA editor, removed at the end) ------------------

const fixtures = {};
let editor;
let customer;
let owner;
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

async function upload(client) {
  const uploadUrl = await client.mutation(anyApi.files.generateUploadUrl, {});
  const response = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": "image/png" }, body: PNG });
  return (await response.json()).storageId;
}

const tripArgs = (slug) => ({
  slug,
  title: "QA bezbednosni test (briše se)",
  description: "QA",
  price: 1,
  currency: "RSD",
  nights: 1,
  days: 1,
  transport: "bus",
  departureDate: "2020-01-01",
  returnDate: "2020-01-02",
  departureCity: "QA",
  itinerary: [],
  included: [],
  notIncluded: [],
  imageStorageIds: [],
  status: "completed",
  featured: false,
  order: 999,
});

async function cleanupLeftovers(client) {
  const trips = await client.query(anyApi.trips.list, {});
  for (const trip of trips.filter((item) => item.slug.startsWith("qa-sec-"))) {
    for (const acc of await client.query(anyApi.accommodations.listByTrip, { tripId: trip._id, includeInactive: true })) {
      await client.mutation(anyApi.accommodations.remove, { id: acc._id });
    }
    for (const dest of await client.query(anyApi.destinations.listByTrip, { tripId: trip._id, includeInactive: true })) {
      await client.mutation(anyApi.destinations.remove, { id: dest._id });
    }
    await client.mutation(anyApi.trips.remove, { id: trip._id });
  }
  for (const cat of await client.query(anyApi.categories.listAll, {})) {
    if (cat.slug.startsWith("qa-sec-")) await client.mutation(anyApi.categories.remove, { id: cat._id });
  }
  for (const slide of await client.query(anyApi.slides.listAll, {})) {
    if (slide.title.startsWith("QA sec ")) await client.mutation(anyApi.slides.remove, { id: slide._id });
  }
  for (const slide of await client.query(anyApi.homeRouteSlides.listAll, {})) {
    if (slide.title.sr.startsWith("QA sec")) await client.mutation(anyApi.homeRouteSlides.remove, { id: slide._id });
  }
}

async function createFixtures() {
  await cleanupLeftovers(editor);
  fixtures.storageA = await upload(editor);
  fixtures.storageB = await upload(editor);
  fixtures.categorySlug = `qa-sec-${TS}`;
  fixtures.categoryId = await editor.mutation(anyApi.categories.upsert, {
    name: { sr: "QA test", en: "QA test" },
    slug: fixtures.categorySlug,
    type: "arrangement",
    isActive: false,
    order: 999,
  });
  fixtures.tripSlug = `qa-sec-${TS}`;
  fixtures.tripId = await editor.mutation(anyApi.trips.upsert, tripArgs(fixtures.tripSlug));
  fixtures.accommodationArgs = {
    tripId: fixtures.tripId,
    name: "QA",
    type: "other",
    description: "QA",
    pricePerPerson: 1,
    currency: "RSD",
    capacity: 1,
    amenities: [],
    imageStorageIds: [],
    order: 999,
    isActive: false,
  };
  fixtures.accommodationId = await editor.mutation(anyApi.accommodations.upsert, fixtures.accommodationArgs);
  fixtures.destinationArgs = {
    tripId: fixtures.tripId,
    title: "QA",
    description: "QA",
    price: 1,
    currency: "RSD",
    imageStorageIds: [],
    order: 999,
    isActive: false,
  };
  fixtures.destinationId = await editor.mutation(anyApi.destinations.upsert, fixtures.destinationArgs);
  fixtures.slideArgs = { title: `QA sec ${TS}`, subtitle: "QA", order: 999, isActive: false };
  fixtures.slideId = await editor.mutation(anyApi.slides.upsert, fixtures.slideArgs);
  fixtures.homeSlideArgs = {
    title: { sr: `QA sec ${TS}`, en: "QA" },
    caption: { sr: "QA", en: "QA" },
    storageId: fixtures.storageA,
    order: 999,
    isActive: false,
  };
  fixtures.homeSlideId = await editor.mutation(anyApi.homeRouteSlides.upsert, fixtures.homeSlideArgs);
  const orders = await editor.query(anyApi.orders.list, {});
  fixtures.orderId = orders[0]?._id;
}

async function removeFixtures() {
  if (!editor) return;
  const steps = [
    () => fixtures.accommodationId && editor.mutation(anyApi.accommodations.remove, { id: fixtures.accommodationId }),
    () => fixtures.destinationId && editor.mutation(anyApi.destinations.remove, { id: fixtures.destinationId }),
    () => fixtures.tripId && editor.mutation(anyApi.trips.remove, { id: fixtures.tripId }),
    () => fixtures.categoryId && editor.mutation(anyApi.categories.remove, { id: fixtures.categoryId }),
    () => fixtures.slideId && editor.mutation(anyApi.slides.remove, { id: fixtures.slideId }),
    () => fixtures.homeSlideId && editor.mutation(anyApi.homeRouteSlides.remove, { id: fixtures.homeSlideId }),
    () => fixtures.storageB && editor.mutation(anyApi.files.deleteById, { storageId: fixtures.storageB }),
  ];
  for (const step of steps) {
    try {
      await step();
    } catch {
      // Already removed (e.g. by a positive test).
    }
  }
}

// Arguments for every protected function. Negative tests only reach the
// handler's first line (the guard), which the inventory check verified.
// Minimal valid manual offer (validators pass; the role check must fail first).
const QA_MANUAL_OFFER = {
  title: "QA",
  kind: "trip",
  transports: [],
  departureCities: [],
  departures: [],
  included: [],
  excluded: [],
  organizerName: "QA",
  imageStorageIds: [],
};
const PAGE_1 = { numItems: 1, cursor: null };

function protectedArgs(customerId) {
  const settingsArgs = { workingHours: "", address: "", phone: "", email: "", instagramUrl: "" };
  return {
    "manualImport.js:approveDrafts": { draftIds: [] },
    "manualImport.js:capabilities": {},
    "manualImport.js:createImport": { partnerSlug: "holidayplus", storageId: fixtures.storageA, fileName: "qa.pdf", preferAi: false },
    "manualImport.js:discardDrafts": { draftIds: [] },
    "manualImport.js:getImport": { importId: "qa" },
    "manualImport.js:getManualOffer": { cardId: "qa" },
    "manualImport.js:listImports": { paginationOpts: PAGE_1 },
    "manualImport.js:removeManualOffer": { cardId: "qa" },
    "manualImport.js:saveManualOffer": { partnerSlug: "holidayplus", offer: QA_MANUAL_OFFER },
    "manualImport.js:updateDraft": { draftId: "qa", offer: QA_MANUAL_OFFER },
    "partners.js:adminGet": { slug: "qa" },
    "partners.js:adminList": {},
    "partners.js:setStatus": { slug: "qa", status: "paused" },
    "partners.js:updateSettings": { slug: "qa", patch: {} },
    "syncAdmin.js:cancelRun": { runId: "qa" },
    "syncAdmin.js:getRun": { runId: "qa" },
    "syncAdmin.js:getSyncStatus": {},
    "syncAdmin.js:listChanges": { paginationOpts: PAGE_1 },
    "syncAdmin.js:listRuns": { paginationOpts: PAGE_1 },
    "syncAdmin.js:overview": {},
    "syncAdmin.js:requestManualRun": {},
    "offerAdmin.js:bulkUpdate": { cardIds: [], action: "publish" },
    "offerAdmin.js:get": { cardId: "qa" },
    "offerAdmin.js:list": { paginationOpts: PAGE_1 },
    "offerAdmin.js:setOverrides": { cardId: "qa" },
    "accommodations.js:remove": { id: fixtures.accommodationId },
    "accommodations.js:upsert": { ...fixtures.accommodationArgs, id: fixtures.accommodationId },
    "audit.js:list": {},
    "categories.js:listAll": {},
    "categories.js:remove": { id: fixtures.categoryId },
    "categories.js:upsert": {
      id: fixtures.categoryId,
      name: { sr: "QA test", en: "QA test" },
      slug: fixtures.categorySlug,
      type: "arrangement",
      isActive: false,
      order: 999,
    },
    "destinations.js:remove": { id: fixtures.destinationId },
    "destinations.js:upsert": { ...fixtures.destinationArgs, id: fixtures.destinationId },
    "files.js:deleteById": { storageId: fixtures.storageB },
    "files.js:generateUploadUrl": {},
    "homeRouteSlides.js:listAll": {},
    "homeRouteSlides.js:remove": { id: fixtures.homeSlideId },
    "homeRouteSlides.js:upsert": { ...fixtures.homeSlideArgs, id: fixtures.homeSlideId },
    "offers.js:deactivateOffer": { sourceSlug: "qa-security", externalId: "none" },
    "offers.js:upsertOffer": {
      sourceSlug: "qa-security",
      externalId: "qa",
      title: "QA",
      destination: "QA",
      price: 1,
      currency: "RSD",
      tags: [],
      normalizedHash: "qa",
      isActive: false,
    },
    "offers.js:upsertSource": {
      slug: "qa-security",
      name: "QA",
      status: "paused",
      syncEverySeconds: 86400,
      isEnabled: false,
    },
    "inquiries.js:create": {
      secret: "x".repeat(43),
      fullName: "QA",
      phone: "0600000000",
      email: "qa@example.com",
      consent: true,
      locale: "sr",
    },
    "orders.js:consumeCheckoutQuota": { secret: "x".repeat(43) },
    "orders.js:createIpsOrder": {
      secret: "x".repeat(43),
      items: [],
      customer: { name: "QA" },
      ips: { reference: "1", payload: "x", amountRsdCents: 1, payeeAccount: "x", payeeName: "x" },
    },
    "inbox.js:list": {},
    "inbox.js:newCount": {},
    "inquiries.js:adminList": { paginationOpts: PAGE_1 },
    "inquiries.js:get": { id: "qa" },
    "inquiries.js:update": { id: "qa" },
    "orders.js:get": { id: "qa" },
    "orders.js:list": {},
    "orders.js:update": { id: "qa" },
    "orders.js:updateStatus": { id: fixtures.orderId, status: "pending" },
    "settings.js:upsert": settingsArgs,
    "slides.js:listAll": {},
    "slides.js:remove": { id: fixtures.slideId },
    "slides.js:upsert": { ...fixtures.slideArgs, id: fixtures.slideId },
    "slides.js:upsertTravelGroup": { ...tripArgs("qa-sec-group"), id: fixtures.slideId },
    "trips.js:remove": { id: fixtures.tripId },
    "trips.js:upsert": { ...tripArgs(fixtures.tripSlug), id: fixtures.tripId },
    "users.js:changePassword": { currentPassword: "x", newPassword: "xxxxxxxx" },
    "users.js:list": {},
    "users.js:staffList": {},
    "users.js:setDisabled": { userId: customerId, disabled: false },
    "users.js:setRole": { userId: customerId, role: "customer" },
    "vehicleRentalImages.js:addAdditional": { key: "bus", storageIds: [fixtures.storageB] },
    "vehicleRentalImages.js:remove": { key: "luxuryVan" },
    "vehicleRentalImages.js:removeAdditional": { key: "bus", storageId: fixtures.storageB },
    "vehicleRentalImages.js:upsert": { key: "bus", storageId: fixtures.storageB },
  };
}

const INCLUDE_INACTIVE = () => [
  ["accommodations.js:listByTrip", { tripId: fixtures.tripId, includeInactive: true }],
  ["destinations.js:listByTrip", { tripId: fixtures.tripId, includeInactive: true }],
  ["destinations.js:listByPage", { pageSlug: "qa-sec", includeInactive: true }],
  ["slides.js:listTravelGroups", { includeInactive: true }],
  ["slides.js:getTravelGroupBySlug", { slug: "qa-sec", includeInactive: true }],
];

function finish() {
  const dir = path.join(ROOT, "night-run", "qa");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "03-security-check.json"), JSON.stringify({ at: new Date().toISOString(), results }, null, 2));
  const failed = results.filter((result) => result.status === "FAIL").length;
  const skipped = results.filter((result) => result.status === "SKIP").length;
  console.log(`\n${results.length} provera: ${results.length - failed - skipped} PASS, ${failed} FAIL, ${skipped} SKIP`);
  process.exit(failed ? 1 : 0);
}

// ---- runtime checks -------------------------------------------------------------

const needsFixtures = ["anon", "customer", "editor", "owner"].some(runGroup);

try {
  editor = await signInAs("editor");
  customer = await signInAs("customer");
  const customerMe = await customer.query(anyApi.users.me, {});
  if (needsFixtures) await createFixtures();
  const args = needsFixtures ? protectedArgs(customerMe._id) : {};

  if (runGroup("anon")) {
    const client = anon();
    for (const [identifier, level] of Object.entries(ACCESS)) {
      if (level === "public" || level === "auth") continue;
      const expected = level === "server" ? "FORBIDDEN" : "UNAUTHENTICATED";
      await check("anon", `${identifier} → ${expected}`, () =>
        expectError(call(client, identifier, args[identifier]), expected)
      );
    }
    for (const [identifier, input] of INCLUDE_INACTIVE()) {
      await check("anon", `${identifier} includeInactive → UNAUTHENTICATED`, () =>
        expectError(call(client, identifier, input), "UNAUTHENTICATED")
      );
    }
    await check("anon", "javni upiti rade i skrivaju neaktivne stavke", async () => {
      assert((await client.query(anyApi.users.me, {})) === null, "users.me nije null");
      await client.query(anyApi.trips.list, {});
      await client.query(anyApi.settings.get, {});
      await client.query(anyApi.categories.list, {});
      await client.query(anyApi.categories.heroData, {});
      await client.query(anyApi.offers.listSources, {});
      await client.query(anyApi.offers.listForNav, {});
      await client.query(anyApi.slides.list, {});
      await client.query(anyApi.homeRouteSlides.list, {});
      await client.query(anyApi.vehicleRentalImages.list, {});
      const accommodations = await client.query(anyApi.accommodations.listByTrip, { tripId: fixtures.tripId });
      const destinations = await client.query(anyApi.destinations.listByTrip, { tripId: fixtures.tripId });
      assert(accommodations.length === 0 && destinations.length === 0, "neaktivne stavke su javno vidljive");
      const board = await client.query(anyApi.offers.listLiveBoard, { limit: 5 });
      assert(board.every((offer) => !("rawSnapshot" in offer)), "rawSnapshot je javan");
      const sources = await client.query(anyApi.offers.listSources, {});
      assert(sources.every((source) => !("apiBaseUrl" in source) && !("webhookSecretLabel" in source)), "interni podaci izvora su javni");
    });
  }

  if (runGroup("customer")) {
    await check("customer", "users.me je customer", async () => {
      assert(customerMe.role === "customer" && !customerMe.isStaff, `uloga ${customerMe.role}`);
    });
    for (const [identifier, level] of Object.entries(ACCESS)) {
      if (!["editor", "owner"].includes(level)) continue;
      await check("customer", `${identifier} → FORBIDDEN`, () =>
        expectError(call(customer, identifier, args[identifier]), "FORBIDDEN")
      );
    }
  }

  if (runGroup("editor")) {
    for (const identifier of ["users.js:list", "users.js:setRole", "users.js:setDisabled", "audit.js:list", "partners.js:setStatus"]) {
      await check("editor", `${identifier} → FORBIDDEN`, () =>
        expectError(call(editor, identifier, args[identifier]), "FORBIDDEN")
      );
    }
    await check("editor", "editor radi sa sadržajem (fixture)", async () => {
      await editor.query(anyApi.categories.listAll, {});
      await editor.query(anyApi.slides.listAll, {});
      await editor.query(anyApi.homeRouteSlides.listAll, {});
      await editor.query(anyApi.orders.list, {});
      await editor.mutation(anyApi.trips.upsert, args["trips.js:upsert"]);
      await editor.mutation(anyApi.slides.upsert, args["slides.js:upsert"]);
      const accommodations = await editor.query(anyApi.accommodations.listByTrip, { tripId: fixtures.tripId, includeInactive: true });
      const destinations = await editor.query(anyApi.destinations.listByTrip, { tripId: fixtures.tripId, includeInactive: true });
      assert(accommodations.length === 1 && destinations.length === 1, "editor ne vidi neaktivne stavke");
      await editor.mutation(anyApi.files.deleteById, { storageId: fixtures.storageB });
      fixtures.storageB = undefined;
    });
    await check("editor", "editor čita ponude partnera i ručni uvoz (step 08)", async () => {
      const offers = await editor.query(anyApi.offerAdmin.list, { paginationOpts: { numItems: 5, cursor: null } });
      const caps = await editor.query(anyApi.manualImport.capabilities, {});
      await editor.query(anyApi.manualImport.listImports, { paginationOpts: PAGE_1 });
      if (offers.page[0]) {
        const detail = await editor.query(anyApi.offerAdmin.get, { cardId: offers.page[0]._id });
        assert(!("searchText" in detail.card) && !("contentHash" in (detail.meta ?? {})), "admin detalj vraća interna polja");
      }
      await expectError(editor.query(anyApi.offerAdmin.get, { cardId: "nije-id" }), "NOT_FOUND");
      return `${offers.page.length} ponuda, AI: ${caps.aiExtraction ? "da" : "ne"}`;
    });
    await check("editor", "editor vidi status uvoza i partnere (step 09, bez pokretanja)", async () => {
      const status = await editor.query(anyApi.syncAdmin.getSyncStatus, {});
      const partners = await editor.query(anyApi.partners.adminList, {});
      await editor.query(anyApi.syncAdmin.overview, {});
      await editor.query(anyApi.syncAdmin.listRuns, { paginationOpts: PAGE_1 });
      assert(partners.length === 17, `partnera: ${partners.length}`);
      assert(typeof status.nextAutoRunAt === "number" && "available" in status.manual, "status bez rasporeda");
      return `ručno: ${status.manual.available ? "dostupno" : status.manual.reason}`;
    });
  }

  if (runGroup("owner")) {
    owner = await signInAs("owner");
    const ownerMe = await owner.query(anyApi.users.me, {});
    await check("owner", "users.list radi", async () => {
      const users = await owner.query(anyApi.users.list, {});
      assert(users.some((user) => user.email === ACCOUNTS.editor), "nema QA urednika u listi");
      return `${users.length} korisnika`;
    });
    await check("owner", "promena sopstvene uloge → FORBIDDEN", () =>
      expectError(owner.mutation(anyApi.users.setRole, { userId: ownerMe._id, role: "editor" }), "FORBIDDEN")
    );
    await check("owner", "audit log beleži izmene urednika", async () => {
      const entries = await owner.query(anyApi.audit.list, { limit: 200 });
      assert(
        entries.some((entry) => entry.action === "trips.upsert" && entry.actorEmail === ACCOUNTS.editor),
        "nema trips.upsert od urednika"
      );
    });
    await check("owner", "isključen nalog ne može da se prijavi", async () => {
      await owner.action(anyApi.users.setDisabled, { userId: customerMe._id, disabled: true });
      try {
        await expectError(
          signIn(ACCOUNTS.customer, readSecret(ACCOUNTS.customer)),
          "ACCOUNT_DISABLED"
        );
        await expectError(customer.query(anyApi.orders.list, {}), "UNAUTHENTICATED");
      } finally {
        await owner.action(anyApi.users.setDisabled, { userId: customerMe._id, disabled: false });
      }
      await signInAs("customer");
    });
  }

  if (runGroup("removed")) {
    for (const identifier of ["auth:ensureAdminUser", "auth:login", "auth:register", "orders:create"]) {
      await check("removed", `${identifier} ne postoji`, () =>
        expectError(anon().mutation(makeFunctionReference(identifier), {}), "Could not find public function")
      );
    }
  }

  if (runGroup("signin")) {
    await check("signin", "pogrešna lozinka → INVALID_CREDENTIALS", () =>
      expectError(signIn(ACCOUNTS.editor, "pogresna-lozinka-123"), "INVALID_CREDENTIALS")
    );
    await check("signin", "stara hardkodovana lozinka vlasnika ne radi", () => {
      const leaked = leakedAdminPassword();
      if (!leaked) throw skipError("stara lozinka nije pronađena u istoriji gita");
      return expectError(signIn(ACCOUNTS.owner, leaked), "INVALID_CREDENTIALS");
    });
    await check("signin", "10 pogrešnih pokušaja → TOO_MANY_ATTEMPTS", async () => {
      const email = `qa-lockout-${TS}@ablux.local`;
      const password = randomBytes(12).toString("base64url");
      await anon().action(anyApi.auth.signIn, {
        provider: "password",
        params: { flow: "signUp", email, password, firstName: "QA", lastName: "Lockout" },
      });
      for (let attempt = 0; attempt < 10; attempt += 1) {
        await signIn(email, `wrong-${attempt}-password`).catch(() => undefined);
      }
      await expectError(signIn(email, password), "TOO_MANY_ATTEMPTS");
    });
    await check("signin", "registracija sa honeypot poljem → REJECTED", () =>
      expectError(
        anon().action(anyApi.auth.signIn, {
          provider: "password",
          params: { flow: "signUp", email: `qa-bot-${TS}@ablux.local`, password: "bot-password-123", firstName: "Bot", lastName: "Bot", website: "http://spam" },
        }),
        "REJECTED"
      )
    );
    await check("signin", "registracija sa emailom vlasnika → USER_EXISTS", () =>
      expectError(
        anon().action(anyApi.auth.signIn, {
          provider: "password",
          params: { flow: "signUp", email: ACCOUNTS.owner, password: "neka-lozinka-123", firstName: "Lazni", lastName: "Vlasnik" },
        }),
        "USER_EXISTS"
      )
    );
  }

  if (runGroup("legacy")) {
    await check("legacy", "stari kupac se prijavljuje, hash prelazi na Scrypt", async () => {
      const email = `qa-legacy-${TS}@ablux.local`;
      const password = randomBytes(9).toString("base64url");
      const legacyHash = createHash("sha256").update(`abluxtravel2022_auth_v1:${password}`).digest("hex");
      const seeded = convex(["run", "authLegacy:qaSeedLegacyUser", JSON.stringify({ email, passwordHash: legacyHash })]);
      assert(seeded.status === 0, "seed nije uspeo");
      const client = await signIn(email, password);
      const state = JSON.parse(convex(["run", "authLegacy:qaAccountState", JSON.stringify({ email })]).stdout);
      assert(state.hasPasswordAccount && !state.hasLegacyHash && state.role === "customer", JSON.stringify(state));
      await signIn(email, password);
      await expectError(signIn(email, `${password}x`), "INVALID_CREDENTIALS");
      const next = randomBytes(9).toString("base64url");
      await client.action(anyApi.users.changePassword, { currentPassword: password, newPassword: next });
      await signIn(email, next);
      await expectError(signIn(email, password), "INVALID_CREDENTIALS");
    });
  }

  if (runGroup("orders")) {
    const pub = anon();
    const offers = await pub.query(anyApi.offers.listLiveBoard, { limit: 100 });
    // Only pilgrimages that are still sold (no date, free-text date or a date from today on; convex/lib/pricing.ts).
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Belgrade" }).format(new Date());
    const departed = (offer) => /^\d{4}-\d{2}-\d{2}/.test(offer.departureDate ?? "") && offer.departureDate.slice(0, 10) < today;
    const own = offers.find((offer) => offer.sourceSlug === "manual-verski" && offer.price > 0 && !departed(offer));
    const past = offers.find((offer) => offer.sourceSlug === "manual-verski" && offer.price > 0 && departed(offer));
    const partner = offers.find((offer) => offer.sourceSlug !== "manual-verski");

    await check("orders", "quote vraća cenu iz baze", async () => {
      if (!own) throw skipError("nema manual-verski ponude koja se još prodaje");
      const quote = await pub.query(anyApi.orders.quote, { items: [{ type: "offer", id: own._id, quantity: 2 }] });
      assert(quote.ok && quote.lines[0].price === own.price, JSON.stringify(quote));
      return `${own.price} ${own.currency} → ${quote.lines[0].currency}`;
    });
    await check("orders", "prošao polazak → ITEM_UNAVAILABLE", async () => {
      if (!past) throw skipError("nema manual-verski ponude sa prošlim polaskom");
      const quote = await pub.query(anyApi.orders.quote, { items: [{ type: "offer", id: past._id, quantity: 1 }] });
      assert(!quote.ok && quote.error === "ITEM_UNAVAILABLE", "ponuda sa prošlim polaskom je prošla");
      return `${past.departureDate} odbijeno`;
    });
    await check("orders", "lažni id i partnerske stavke → ITEM_UNAVAILABLE", async () => {
      const pseudo = await pub.query(anyApi.orders.quote, { items: [{ type: "destination", id: "destination-turska", quantity: 1 }] });
      assert(!pseudo.ok && pseudo.error === "ITEM_UNAVAILABLE", "pseudo id je prošao");
      let subagency = null;
      for (const trip of await pub.query(anyApi.trips.list, {})) {
        const destinations = await pub.query(anyApi.destinations.listByTrip, { tripId: trip._id });
        subagency = destinations.find((item) => item.offerType === "subagency") ?? subagency;
      }
      if (subagency) {
        const quote = await pub.query(anyApi.orders.quote, { items: [{ type: "destination", id: subagency._id, quantity: 1 }] });
        assert(!quote.ok, "subagency destinacija je prošla");
      }
      if (partner) {
        const quote = await pub.query(anyApi.orders.quote, { items: [{ type: "offer", id: partner._id, quantity: 1 }] });
        assert(!quote.ok, "partnerska ponuda je prošla");
      }
      return `subagency: ${subagency ? "provereno" : "nema"}, partnerska ponuda: ${partner ? "provereno" : "nema"}`;
    });

    const order = (overrides = {}) => ({
      secret: SERVER_SECRET,
      items: [{ type: "offer", id: (own ?? past)?._id ?? "qa-no-offer", quantity: 1 }],
      customer: { name: "QA test", email: "qa-checkout@ablux.local", note: "QA (bezbednosni test) — otkazati" },
      ips: {
        reference: `9${TS}`.slice(0, 15),
        payload: "QA",
        amountRsdCents: Math.round((own?.price ?? 0) * 100),
        payeeAccount: "205000000052490086",
        payeeName: "QA",
      },
      ...overrides,
    });

    await check("orders", "createIpsOrder bez tajne → FORBIDDEN", () =>
      expectError(pub.mutation(anyApi.orders.createIpsOrder, order({ secret: "x".repeat(43) })), "FORBIDDEN")
    );
    await check("orders", "izmenjen iznos → AMOUNT_MISMATCH", async () => {
      if (!own) throw skipError("nema manual-verski ponude koja se još prodaje");
      const result = await pub.mutation(anyApi.orders.createIpsOrder, order({ ips: { ...order().ips, amountRsdCents: 100 } }));
      assert(!result.ok && result.error === "AMOUNT_MISMATCH", JSON.stringify(result));
    });
    await check("orders", "honeypot → REJECTED, bez upisa", async () => {
      if (!own) throw skipError("nema manual-verski ponude koja se još prodaje");
      const before = (await editor.query(anyApi.orders.list, {})).length;
      const result = await pub.mutation(anyApi.orders.createIpsOrder, order({ website: "http://spam" }));
      const after = (await editor.query(anyApi.orders.list, {})).length;
      assert(!result.ok && result.error === "REJECTED" && before === after, JSON.stringify(result));
    });
    await check("orders", "ispravna porudžbina čuva cenu iz baze", async () => {
      if (!own) throw skipError("nema manual-verski ponude koja se još prodaje");
      const result = await pub.mutation(anyApi.orders.createIpsOrder, order());
      assert(result.ok, JSON.stringify(result));
      const stored = (await editor.query(anyApi.orders.list, {})).find((item) => item._id === result.orderId);
      assert(stored.items[0].price === own.price && stored.totalAmount === own.price, "cena u porudžbini nije iz baze");
    });
    await check("orders", "11. pokušaj sa istog klijenta → RATE_LIMITED", async () => {
      const clientKey = `qa-${TS}`;
      let last;
      for (let attempt = 0; attempt < 11; attempt += 1) {
        last = await pub.mutation(anyApi.orders.consumeCheckoutQuota, { secret: SERVER_SECRET, clientKey });
      }
      assert(!last.ok && last.error === "RATE_LIMITED", JSON.stringify(last));
    });
    await check("orders", "QA porudžbine otkazane", async () => {
      const orders = await editor.query(anyApi.orders.list, {});
      const qa = orders.filter(
        (item) => item.status !== "cancelled" && (item.customerEmail?.startsWith("qa-") || item.note?.startsWith("QA"))
      );
      for (const item of qa) await editor.mutation(anyApi.orders.updateStatus, { id: item._id, status: "cancelled" });
      return `${qa.length} otkazano`;
    });
  }
} catch (error) {
  record("setup", "priprema testa", "FAIL", String(error?.message ?? error).slice(0, 300));
} finally {
  await removeFixtures();
  for (const client of signedIn) {
    await client.action(anyApi.auth.signOut, {}).catch(() => undefined);
  }
}

finish();
