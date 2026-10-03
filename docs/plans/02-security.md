# Plan iz koraka 02 (2026-10-01 02:42:03)

# Plan 02: Security (auth, roles, protected Convex functions, server-side prices)

Step 03 follows this plan literally under `night-run/NIGHT_RULES.md` and `CLAUDE.md`.

**Hard limits:** Convex DEV only. No `--prod`, no deploy, no `git push`. Never print or commit a secret.

## 0. Verified state

- **Admin access is checked only in the browser.** `app/admin/layout.tsx` gates on `session.role === "admin"`, which comes from `localStorage` (`lib/local-auth.ts`, `lib/use-session.ts`).
- **Every Convex function is public.** `convex function-spec` on DEV lists 49 public functions and 1 HTTP action.
- **`convex/auth.ts` is unsafe:**
  - The admin password is hardcoded.
  - Hashing is SHA-256 with a static salt `abluxtravel2022_auth_v1`, applied to the trimmed password.
  - `ensureAdminUser` is public. `AdminBootstrap` in `app/providers.tsx` calls it on every page load, so the owner hash keeps getting reset to the known password.
  - `login` and `register` are public and unthrottled.
- **Prices and PII are exposed.** `orders.create` and `POST /api/ips/checkout` take prices from the browser. `orders.list` returns customer PII to anyone.
- **DEV data (aggregates only):**

  | Table | Contents |
  |---|---|
  | users | 2, both `admin`: `abluxtravel@gmail.com`, and a duplicate with username `abluxtravel` and no email. Both hashes are SHA-256. 0 customers (PROD may have some). |
  | orders | 4 pending test orders |
  | trips | 1 (upcoming, RSD) |
  | destinations | 3: 1 subagency under the trip, 2 page destinations (RSD and EUR) |
  | offers | 1 `manual-verski`, currency `ДИН` |
  | settings | empty |

- **Versions:** next 16.1.6, react 19.2.4, convex 1.32.0, Node 22.23.
- **`@convex-dev/auth`:** latest is 0.0.96, maintained, published Sept 2026. Peer deps: react `^18.2 || ^19`, convex `^1.17`, `@auth/core` `^0.41.1`.

## 1. Auth approach: Convex Auth

**Decision:** use `@convex-dev/auth` 0.0.96 with:
- a custom password provider (`ConvexCredentials`, id `"password"`), and
- the Next.js integration: `proxy.ts`, `ConvexAuthNextjsServerProvider`, `ConvexAuthNextjsProvider`.

**Why:**
1. It is the Convex team's library and is peer-compatible with React 19 and convex 1.32.
2. Its Next helper `convexAuthNextjsMiddleware` returns a plain `NextMiddleware`, which can be the default export of Next 16's `proxy.ts`. It gives short-lived JWTs, an httpOnly refresh-token cookie, and `ctx.auth` inside every Convex function.
3. It throttles failed logins per account (`authRateLimits`). A custom `authorize` lets us verify legacy SHA-256 hashes and rehash them. A hand-built sessions table would need the same token bridge with more attack surface.

**Next 16 support:**
- The library docs and changelog (through 0.0.96) only mention `middleware.ts`.
- The installed Next 16.1.6 build template accepts `proxy.ts` (root or `src/`) when it exports `proxy` or a default function. Proxy runs on the Node runtime.
- `middleware.ts` still works but logs a deprecation warning. The two files must never coexist.
- Community Next 16 apps run `convexAuthNextjsMiddleware` from `proxy.ts`.

**Trade-off:** the root layout reads cookies, so every page renders dynamically. This is accepted: pages are client-rendered today, and the SEO pages planned in steps 10 and 12 are SSR anyway.

**Fallbacks (record the one used in `DECISIONS.md`):**
- **F1:** if `/api/auth` returns HTML or cookies are not set, rename `proxy.ts` to `middleware.ts` with the same content.
- **F2:** if Next SSR auth cannot work, switch to the client-only `ConvexAuthProvider` from `@convex-dev/auth/react`, and remove the proxy and the server provider. Convex functions still enforce roles.

## 2. Roles and helpers

**Roles:** `owner` > `editor` > `customer`.

| Role | Can do |
|---|---|
| Owner | Everything, including users, roles and the audit log |
| Editor (office manager) | All content, orders and inquiries, contact settings |
| Customer | Own account only |

Legacy values `admin` and `user` stay in the data until migration. `normalizeRole()` maps unknown or legacy values, including `admin`, to `customer`. Only the bootstrap grants `owner`.

### `convex/lib/roles.ts`
Pure module; the client imports it as `@/convex/lib/roles`.
- `ROLES`, `type Role`
- `normalizeRole(v)`, `hasRole(role, min)`, `isStaffRole(role)`
- `ROLE_LABELS`: owner = Vlasnik/Owner, editor = Urednik/Editor, customer = Korisnik/Customer

### `convex/lib/access.ts`
Server only; never import it from the client. Errors are `ConvexError` with **string** data.
```ts
type Viewer = { userId: Id<"users">; user: Doc<"users">; role: Role; email: string };
getViewer(ctx: QueryCtx | MutationCtx): Promise<Viewer | null>
  // getAuthUserId + getAuthSessionId. The authSessions doc must still exist
  // (instant revocation after sign-out, disable or password change). Load the user;
  // return null if it is missing or disabled.
requireUser(ctx): Promise<Viewer>              // ConvexError("UNAUTHENTICATED")
requireRole(ctx, min: Role): Promise<Viewer>   // "UNAUTHENTICATED" | "FORBIDDEN"
requireRoleInAction(ctx: ActionCtx, min: Role): Promise<Viewer>
  // via ctx.runQuery(internal.users.viewerForAction, {})
```

### `convex/lib/audit.ts`
`audit(ctx, viewer | null, { action, targetTable?, targetId?, summary? })` inserts into `auditLog`. The summary never holds emails, names or phones; use ids instead.

### `convex/lib/rateLimit.ts`
- `consumeRateLimit(ctx, key, { max, windowMs })` uses a fixed window. It returns `{ ok: true }` or `{ ok: false, retryAfterMs }` and **never throws**, so a counter is not rolled back.
- Keys built from an email or phone use `sha256Hex(value).slice(0, 32)`, never the raw value.
- Presets in `RATE_LIMITS`:

  | Preset | Limit |
  |---|---|
  | `signupGlobal` | 30/h |
  | `legacyLogin` | 10/h per email |
  | `orderGlobal` | 60/h |
  | `orderIp` | 10/h |
  | `orderContact` | 5/h |
  | `inquiryGlobal` (for step 10) | 100/h |
  | `inquiryEmail` (for step 10) | 5/h |

### `convex/lib/serverSecret.ts`
`requireServerSecret(provided)` does a constant-time compare with `process.env.ABLUX_SERVER_SECRET`. If the variable is missing or shorter than 32 characters, it throws `ConvexError("FORBIDDEN")`.

### `convex/lib/passwords.ts`
- `hashPassword` / `verifyPassword`: `Scrypt` from `lucia`, the same default Convex Auth uses.
- `legacyPasswordHash(pw)`: SHA-256 hex of `` `${LEGACY_AUTH_SALT}:${pw.trim()}` ``.
- `sha256Hex`, `timingSafeEqualHex`.
- `validateNewPassword`: 8–128 characters, else `ConvexError("WEAK_PASSWORD")`.
- `normalizeEmail`, `isValidEmail`, `normalizeName`, `deriveNameFromEmail` (moved from the old `auth.ts`).

### `convex/lib/constants.ts`
- `OWNER_EMAIL = "abluxtravel@gmail.com"`
- `LEGACY_AUTH_SALT = "abluxtravel2022_auth_v1"`. This is public and only used to read old hashes.
- `HOUR`, `DAY`

### Rule for every function, now and later
- A query that returns only published data needs no check.
- Every other function's first statement is one of:
  - `const viewer = await requireRole(ctx, "editor" | "owner")`
  - `requireRoleInAction(...)` in actions
  - `requireServerSecret(args.secret)` for server-to-server calls
- Staff mutations also call `audit(...)`.

## 3. Function inventory

**Legend:** P = public, C = any signed-in user, E = editor, O = owner, S = server secret, I = internal. "Active only" means public callers receive only `isActive` rows; `includeInactive: true` requires E. Default public calls never read auth, so Convex query caching stays shared.

| Function | Type | Today | After | Change |
|---|---|---|---|---|
| auth.ensureAdminUser | M | public, resets the owner hash | **removed** | replaced by I `users.bootstrapStaffAccount`, run from the CLI |
| auth.login | M | public | **removed** | Convex Auth `auth.signIn`, flow `signIn` |
| auth.register | M | public | **removed** | `auth.signIn`, flow `signUp` (customer role, honeypot, rate limit) |
| orders.create | M | public, client prices | **removed** | `orders.createIpsOrder` (S, prices from the DB) |
| orders.list | Q | public, exposes PII | E | `.take(500)` |
| orders.updateStatus | M | public | E | drop the `stripeSessionId` arg; audit `old → new` |
| files.generateUploadUrl | M | public | E | — |
| files.deleteById | M | public | E | audit |
| settings.get | Q | public | P | — |
| settings.upsert | M | public | E | trim, max lengths, audit |
| trips.list, trips.getBySlug | Q | public | P | unchanged (trips have no draft state) |
| trips.upsert, trips.remove | M | public | E | audit |
| accommodations.listByTrip | Q | returns inactive rows | P, active only | new `includeInactive` arg |
| accommodations.upsert, .remove | M | public | E | audit |
| destinations.listByTrip, .listByPage | Q | return inactive rows | P, active only | new `includeInactive` arg |
| destinations.upsert, .remove | M | public | E | audit |
| categories.list, .heroData | Q | public | P | — |
| categories.listAll | Q | public | E | used only by admin |
| categories.upsert, .remove | M | public | E | audit |
| offers.listSources | Q | public | P | return only `_id, slug, name, status, syncEverySeconds, lastSyncAt, updatedAt` |
| offers.listLiveBoard | Q | public | P | strip `rawSnapshot`, `normalizedHash`, `score` |
| offers.listForNav | Q | public | P | — |
| offers.upsertSource, .upsertOffer, .deactivateOffer | M | public | E | audit |
| slides.list | Q | public | P | — |
| slides.listAll | Q | public | E | — |
| slides.listTravelGroups | Q | `includeInactive` is open | P, active only | `includeInactive` now requires E |
| slides.getTravelGroupBySlug | Q | returns inactive rows | P, `null` if inactive | new `includeInactive` arg (E) |
| slides.upsert, .upsertTravelGroup, .remove | M | public | E | audit |
| homeRouteSlides.list | Q | public | P | — |
| homeRouteSlides.listAll | Q | public | E | — |
| homeRouteSlides.upsert, .remove | M | public | E | audit |
| vehicleRentalImages.list | Q | public | P | — |
| vehicleRentalImages.upsert, .addAdditional, .removeAdditional, .remove | M | public | E | audit |
| stripe.createCheckoutSession | A | public no-op that takes client prices | I | becomes `internalAction`. When Stripe goes live it takes only `orderId` and reads amounts from the DB. |
| HTTP `POST /stripe-webhook` | H | standby, returns 200 | P | unchanged. Signature verification is required before going live. |

**New functions**

| Function | Type | Access |
|---|---|---|
| auth.signIn, auth.signOut | A | P (Convex Auth) |
| auth.isAuthenticated | Q | P (Convex Auth; used by the proxy) |
| auth.store | M | I (Convex Auth) |
| users.me | Q | P (own safe fields, or `null`) |
| users.changePassword | A | C |
| users.list | Q | O |
| users.setRole | M | O |
| users.setDisabled | A | O |
| users.viewerForAction, users.findForBootstrap | Q | I |
| users.applyBootstrapProfile, .insertPasswordAccount, .setDisabledInternal, .logAudit, .migrateLegacyUsers | M | I |
| users.bootstrapStaffAccount | A | I (CLI) |
| authLegacy.hasPasswordAccount, .legacyUserExists, .qaAccountState | Q | I |
| authLegacy.verifyLegacyLogin, .linkLegacyAccount, .qaSeedLegacyUser | M | I |
| rateLimits.consume | M | I (called from actions) |
| audit.list | Q | O (`limit` ≤ 200) |
| orders.quote | Q | P |
| orders.consumeCheckoutQuota, orders.createIpsOrder | M | S |

## 4. Schema diff (`convex/schema.ts`)

**Compatibility:** every change is backward compatible.
- Required fields become optional, unions widen, and fields, tables and indexes are added.
- One index is renamed: `users.by_email` becomes `email` (same field).
- Existing documents validate without changes.
- Do **not** tighten tonight. PROD must run the migration first.

```ts
import { authTables } from "@convex-dev/auth/server";
export default defineSchema({
  ...authTables,        // authSessions, authAccounts, authRefreshTokens, authVerificationCodes, authVerifiers, authRateLimits
  users: defineTable({  // overrides authTables.users, so it must come after the spread
    name: v.optional(v.string()), image: v.optional(v.string()), email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()), phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()), isAnonymous: v.optional(v.boolean()),
    firstName: v.optional(v.string()), lastName: v.optional(v.string()),
    role: v.optional(v.union(v.literal("owner"), v.literal("editor"), v.literal("customer"),
                             v.literal("admin"), v.literal("user"))),   // admin/user = legacy
    disabled: v.optional(v.boolean()),
    username: v.optional(v.string()), passwordHash: v.optional(v.string()),  // legacy, were required
    createdAt: v.optional(v.number()), updatedAt: v.optional(v.number()),    // were required
  }).index("email", ["email"]).index("phone", ["phone"])   // Convex Auth requires these names
    .index("by_username", ["username"]).index("by_role", ["role"]),
  // ...all other existing tables unchanged, except:
  orders: defineTable({ /* existing fields */, userId: v.optional(v.id("users")) })
    .index("by_status", ["status"]).index("by_created", ["createdAt"]).index("by_user", ["userId"]),
  auditLog: defineTable({
    actorId: v.optional(v.id("users")), actorEmail: v.optional(v.string()), actorRole: v.optional(v.string()),
    action: v.string(), targetTable: v.optional(v.string()), targetId: v.optional(v.string()),
    summary: v.optional(v.string()), at: v.number(),
  }).index("by_at", ["at"]).index("by_actor", ["actorId", "at"]),
  rateLimits: defineTable({ key: v.string(), windowStart: v.number(), count: v.number() })
    .index("by_key", ["key"]),
});
```

## 5. Auth backend

### `convex/auth.config.ts`
```ts
export default { providers: [{ domain: process.env.CONVEX_SITE_URL, applicationID: "convex" }] };
```

### `convex/http.ts`
Add `import { auth } from "./auth"; auth.addHttpRoutes(http);`. Keep `/stripe-webhook`.

### `convex/auth.ts` (full rewrite)
- It must export `{ auth, signIn, signOut, store, isAuthenticated }`; the Next proxy calls `auth:isAuthenticated` by name.
- All `users` lookups use `.first()`, not `.unique()`, so a stray duplicate cannot crash a sign-in.

```ts
const password = ConvexCredentials<DataModel>({   // drop <DataModel> if the generic is not accepted
  id: "password",
  crypto: { hashSecret: hashPassword, verifySecret: verifyPassword },
  authorize: async (params, ctx): Promise<{ userId: Id<"users"> }> => { /* flows below */ },
});
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [password],
  session: { totalDurationMs: 14 * DAY, inactiveDurationMs: 7 * DAY },
  signIn: { maxFailedAttempsPerHour: 10 },          // sic, library spelling
  callbacks: {
    async beforeSessionCreation(ctx, { userId }) {  // runs on every sign-in
      const user = await ctx.db.get(userId);
      if (!user || user.disabled) throw new ConvexError("ACCOUNT_DISABLED");
      if (isStaffRole(user.role)) await ctx.db.insert("auditLog", { actorId: userId, actorEmail: user.email, actorRole: user.role, action: "auth.signIn", at: Date.now() });
    },
  },
});
```

**Error codes.** `authorize` throws only these `ConvexError` string codes: `INVALID_CREDENTIALS`, `INVALID_INPUT`, `TOO_MANY_ATTEMPTS`, `ACCOUNT_DISABLED`, `USER_EXISTS`, `WEAK_PASSWORD`, `REJECTED`.
- The Next proxy forwards `{ error: message }`, so the UI looks for the code as a substring of `error.message`.
- `role` is **never** read from `params`.

**Flow `signIn`**
1. Set `email = normalizeEmail(params.email)` and `password = params.password` (a string, not trimmed). If either is invalid, throw `INVALID_CREDENTIALS`.
2. If `!(await ctx.runQuery(internal.authLegacy.hasPasswordAccount, { email }))`, take the legacy path:
   1. `r = await ctx.runMutation(internal.authLegacy.verifyLegacyLogin, { email, legacyHash: await legacyPasswordHash(password) })`.
   2. If `!r.ok`, throw `r.error === "RATE_LIMITED" ? "TOO_MANY_ATTEMPTS" : "INVALID_CREDENTIALS"`.
   3. Otherwise run `internal.authLegacy.linkLegacyAccount({ userId: r.userId, email, secretHash: await hashPassword(password) })`.
3. Call `retrieveAccount(ctx, { provider: "password", account: { id: email, secret: password } })`. It throws `Error("InvalidAccountId" | "InvalidSecret" | "TooManyFailedAttempts")`. Map `TooManyFailedAttempts` to `TOO_MANY_ATTEMPTS` and everything else to `INVALID_CREDENTIALS`.
4. If `user.disabled`, throw `ACCOUNT_DISABLED`. Otherwise return `{ userId: user._id }`.

**Flow `signUp`**
1. If the honeypot `params.website` is non-empty, throw `REJECTED`.
2. Validate first and last name (2–60 characters each) and the email; on failure throw `INVALID_INPUT`. Then call `validateNewPassword`.
3. If `email === OWNER_EMAIL`, throw `USER_EXISTS`.
4. Consume `signup:global` through `internal.rateLimits.consume`. If limited, throw `TOO_MANY_ATTEMPTS`.
5. If `internal.authLegacy.legacyUserExists({ email })` is true, throw `USER_EXISTS`. That user must sign in instead, which migrates the account.
6. Create the account:
   ```ts
   createAccount(ctx, {
     provider: "password",
     account: { id: email, secret: password },
     profile: { email, name, firstName, lastName, role: "customer", createdAt: now, updatedAt: now },
     shouldLinkViaEmail: false,
     shouldLinkViaPhone: false,
   })
   ```
   An "already exists" error becomes `USER_EXISTS`. An existing account with the correct password simply signs in, and its role is unchanged.

### `convex/authLegacy.ts` (all internal)
- **`hasPasswordAccount({ email })`:** checks `authAccounts` by index `providerAndAccountId` (`"password"`, email).
- **`legacyUserExists({ email })`:** true if a user found by the `email` index (or `by_username`) still has `passwordHash`.
- **`verifyLegacyLogin({ email, legacyHash })`** (mutation):
  1. Call `consumeRateLimit("login-legacy:" + sha, RATE_LIMITS.legacyLogin)` first.
  2. Find the user by email, else by username.
  3. Require all of:
     - `passwordHash` is present.
     - `role` is `user`, `customer` or undefined. Never `admin`, `owner` or `editor`: the owner's legacy hash is the public hardcoded password.
     - The user is not disabled.
     - No password account exists yet.
  4. Compare with `timingSafeEqualHex`. Return `{ ok: true, userId }` or `{ ok: false, error }`. Never throw after consuming the counter.
- **`linkLegacyAccount({ userId, email, secretHash })`:**
  - If no account exists, insert `authAccounts { userId, provider: "password", providerAccountId: email, secret: secretHash }`.
  - Patch the user with `{ email, role: "customer", passwordHash: undefined, updatedAt }`. If another user already owns that email, refuse.
- **QA only:**
  - `qaSeedLegacyUser({ email, passwordHash })` inserts `{ username: email, email, passwordHash, role: "user", createdAt, updatedAt }` only if the email is unused.
  - `qaAccountState({ email })` returns `{ userExists, hasPasswordAccount, hasLegacyHash, role, disabled }`.

### `convex/users.ts`
- **`me`:** returns `{ _id, email, firstName, lastName, displayName, role, isStaff, isOwner }` from `getViewer`, or `null`. Names come from `firstName`/`lastName`, then `name`, then `deriveNameFromEmail`.
- **`list` (O):** up to 500 users with `_id, email, displayName, role, disabled, createdAt ?? _creationTime`, staff first.
- **`setRole` (O)** `{ userId, role: owner | editor | customer }`:
  - Owners cannot change their own role.
  - Demoting an owner requires another non-disabled owner (`by_role`), else `ConvexError("LAST_OWNER")`.
  - Audit `users.setRole` with `targetId = userId` and summary `old → new`.
- **`setDisabled` (O, action)** `{ userId, disabled }`:
  - Owners cannot disable themselves or the last owner.
  - Calls `setDisabledInternal`. When disabling, also calls `invalidateSessions(ctx, { userId })`.
  - Audit.
- **`changePassword` (C, action)** `{ currentPassword, newPassword }`:
  1. `requireRoleInAction(ctx, "customer")`.
  2. `retrieveAccount` with the current password. Map errors to `INVALID_CURRENT_PASSWORD` or `TOO_MANY_ATTEMPTS`.
  3. `validateNewPassword`.
  4. `modifyAccountCredentials(ctx, { provider: "password", account: { id: email, secret: newPassword } })`.
  5. `invalidateSessions(ctx, { userId, except: [sessionId] })`.
  6. Audit.
- **`viewerForAction` (I query):** returns `getViewer` as plain data.
- **`bootstrapStaffAccount` (I, action)** `{ email, role: "owner" | "editor" | "customer", password, name? }`. This replaces `ensureAdminUser`.
  1. Reject passwords shorter than 16 characters.
  2. `findForBootstrap` looks the user up by `email`, then by `by_username`, and reports whether a password account exists.
  3. `applyBootstrapProfile` creates or patches `{ email, username: email, name, firstName, lastName, role, disabled: false, passwordHash: undefined, createdAt (if new), updatedAt }`. The owner's name is `ABLux` / `Travel`.
  4. If an account exists, call `modifyAccountCredentials`. Otherwise call `insertPasswordAccount({ userId, email, secretHash: await hashPassword(password) })`, which is idempotent (it checks `providerAndAccountId` first).
  5. `invalidateSessions(ctx, { userId })`.
  6. `logAudit({ action: "users.bootstrap" })`.
  7. Return `{ email, role, created }`. **Never return the password.**
- **`migrateLegacyUsers` (I, mutation)**, idempotent, `.take(1000)`:
  - `role: "user"` becomes `"customer"`.
  - `role: "admin"`:
    - If `email ?? username` equals `OWNER_EMAIL`, set `"owner"`. This account cannot log in until the bootstrap, because its hash is never migrated.
    - Any other admin gets `{ role: "customer", disabled: true }` (on DEV, the `abluxtravel` duplicate).
  - If `email` is missing and `username` contains `@` and no other user has that email, set `email = username`.
  - Returns `{ scanned, toCustomer, owner, disabledLegacyAdmins, emailBackfilled, conflicts }`.

### Other new modules
- `convex/rateLimits.ts`: internal `consume({ key, max, windowMs })`.
- `convex/audit.ts`: owner-only `list({ limit? })`, newest first.

### Guards in existing modules
- Apply the §3 table to `files`, `settings`, `trips`, `accommodations`, `destinations`, `categories`, `offers`, `slides`, `homeRouteSlides`, `vehicleRentalImages`, `orders` and `stripe`. Put the guard first and keep the business logic unchanged.
- In `auth.ts`, `users.ts` and `lib/access.ts`, annotate handler return types wherever `ctx.run*` is used, to avoid circular type inference through `_generated/api`.

## 6. Owner bootstrap and secrets

The underlying command is `npx convex run users:bootstrapStaffAccount '{…}'`. Step 03 runs it only through a wrapper script, so the password never appears in a command line, the console or a log.

### `scripts/lib/convex-cli.mjs`
- `convex(args, { input })`: `spawnSync(process.execPath, ["node_modules/convex/bin/main.js", ...args], { input, encoding: "utf8" })`. No shell, so no Windows quoting problems.
- `assertDevDeployment()`: `CONVEX_DEPLOYMENT` in `.env.local` must start with `dev:`, and no argument may contain `prod`; otherwise exit 1.
- `readSecret(email)` and `upsertSecretSection(email, label, lines)` manage `night-run/SECRETS.local.md` (already gitignored). Sections use the heading `## <label> — <email>` and the lines `- Email: …` and ``- Lozinka: `…` ``.

### `scripts/auth-setup.mjs`
Idempotent; never prints a value.
1. Call `assertDevDeployment`.
2. Read the existing names from `env list`, parsing names only.
3. If `JWT_PRIVATE_KEY` or `JWKS` is missing (or `--rotate` is given):
   - generate a key pair with `generateKeyPairSync("rsa", { modulusLength: 2048 })`;
   - set `JWT_PRIVATE_KEY` to the PKCS8 PEM with `\n` replaced by spaces;
   - set `JWKS` to `JSON.stringify({ keys: [{ use: "sig", ...publicKey.export({ format: "jwk" }) }] })`.

   Set each value with `convex(["env", "set", NAME], { input: value })`; the CLI reads the value from stdin.
4. If missing, set `SITE_URL=http://localhost:3000`.
5. If missing, generate `ABLUX_SERVER_SECRET = randomBytes(32).toString("base64url")`. Set it on Convex DEV and add or replace the same line in `.env.local`.
6. Print only `OK: JWT_PRIVATE_KEY, JWKS, SITE_URL, ABLUX_SERVER_SECRET`.

### `scripts/bootstrap-staff.mjs --email <e> --role owner|editor|customer --label "<text>"`
1. Call `assertDevDeployment`.
2. Generate a password: 20 characters from `ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789` using `crypto.randomInt`, formatted as `xxxxx-xxxxx-xxxxx-xxxxx`.
3. Run `convex(["run", "users:bootstrapStaffAccount", JSON.stringify({ email, role, password })])`. Never print stdout. On error, print stderr with the password replaced by `***`.
4. Write the section with `upsertSecretSection`. The owner section ends with exactly this line: "Prijavi se na /auth i odmah promeni lozinku u Admin → Podešavanja → Korisnici."
5. Print `OK: <email> (<role>) — lozinka je u night-run/SECRETS.local.md`.

### Commands (run after the functions are pushed)
```
npx convex run users:migrateLegacyUsers
node scripts/bootstrap-staff.mjs --email abluxtravel@gmail.com --role owner --label "Vlasnik (owner)"
node scripts/bootstrap-staff.mjs --email qa-editor@ablux.local --role editor --label "QA urednik (editor)"
node scripts/bootstrap-staff.mjs --email qa-customer@ablux.local --role customer --label "QA kupac (customer)"
```

## 7. Server-side prices (cart and IPS checkout)

### `convex/lib/pricing.ts`
- `cartItemInput = v.object({ type: v.union(trip | destination | offer | accommodation), id: v.string(), quantity: v.number() })`.
- `priceCartItems(ctx, items)` returns `{ ok: true, lines, originalTotals }` or `{ ok: false, error: "EMPTY" | "TOO_MANY_ITEMS" | "INVALID_QUANTITY" | "ITEM_UNAVAILABLE", invalidIds }`.
  - `quantity` must be an integer from 1 to 20. At most 10 lines; duplicate type and id pairs are merged.
  - Ids are parsed with `ctx.db.normalizeId(table, id)`. Pseudo ids such as `destination-<slug>` count as unavailable.
  - Title, unit price, currency and meta are read only from the DB.
- **What can be bought (ABLux programs only):**

  | Type | Condition | Price | Title |
  |---|---|---|---|
  | trip | status `active` or `upcoming` | trip price | trip title |
  | accommodation | `isActive`, and the parent trip is not `completed` | `pricePerPerson` | `${acc.name} - ${trip.title}` |
  | destination | `isActive`, `offerType !== "subagency"`, and the parent trip is not `completed` (or the travel group exists via `slides.by_slug`) | destination price | `${dest.title} - ${parent}` |
  | offer | `isActive` and `sourceSlug === MANUAL_RELIGIOUS_SOURCE_SLUG` (import it from `../../lib/religious`) | offer price | offer title |

  In every case the price must be finite and greater than 0.
- **`normalizeCurrencyCode`:**
  - `RSD`, `DIN`, `DIN.`, `ДИН`, `ДИН.`, `дин`, `DINAR(A)` become `RSD`.
  - `EUR`, `€`, `EVRO`, `EVRA` become `EUR`.
  - Any other currency makes the item unavailable.
- The amount stays the **full price**, as today (not a deposit). This is an open question for the owner.

### `convex/orders.ts`
- **`quote` (P):** runs `priceCartItems`.
- **`consumeCheckoutQuota` (S)** `{ secret, clientKey?, contact? }`: consumes `order:global`, then `order:ip:<clientKey>`, then `order:contact:<sha(contact)>`. Returns `{ ok }` or `{ ok: false, error: "RATE_LIMITED", retryAfterMs }`.
- **`createIpsOrder` (S)** `{ secret, items, customer: { name, email?, phone?, note? }, website?, ips: { reference, payload, amountRsdCents, exchangeRate?, exchangeRateDate?, payeeAccount, payeeName } }`:
  1. `requireServerSecret`.
  2. If the honeypot is filled, return `{ ok: false, error: "REJECTED" }`.
  3. Validate the customer: name 2–120 characters; email (valid, ≤ 160) or phone (≤ 40) is required; note ≤ 1000.
  4. Re-price with `priceCartItems`.
  5. Recompute with `calculateIpsTotals(lines, exchangeRate)` from `../lib/ips-payment`. If there are EUR lines, `exchangeRate` must be between 90 and 150.
  6. If `amountRsdCents` differs, return `AMOUNT_MISMATCH`.
  7. Insert the order with:
     - the DB lines, `totalAmount: amountRsd`, `currency: "RSD"` and the IPS fields;
     - `status: "pending"`, `paymentStatus: "awaiting_payment"`;
     - `userId: (await getAuthUserId(ctx)) ?? undefined` and `createdAt`.
  8. Return `{ ok: true, orderId }`. Business-rule failures return `{ ok: false, error }` and do not throw.

### `app/api/ips/checkout/route.ts`
Request body: `{ items: [{ type, id, quantity }], customer: { name, email, phone, note }, website }`. Any client `price`, `title` or `reference` is ignored.
1. If an `Origin` header is present and its host differs from `Host`, return 403.
2. Validate the body shape. If the honeypot is filled, return 400 "Zahtev nije prihvaćen."
3. If `ABLUX_SERVER_SECRET` is not set, return 500 "Plaćanje trenutno nije dostupno."
4. Call `fetchQuery(api.orders.quote)`. If it is not ok, return 400 `{ error, code, invalidIds }`.
5. Compute `clientKey = sha256(firstForwardedFor + secret).slice(0, 32)` and call `fetchMutation(api.orders.consumeCheckoutQuota, …)`. If limited, return 429.
6. Fetch the NBS rate (only when there are EUR lines), then run `calculateIpsTotals` on the server lines.
7. Generate `reference` on the server. Rewrite `createIpsReference()` to use `crypto.getRandomValues`.
8. Build the payload with `buildIpsPayload`, then call `generateNbsQrImage` (existing code).
9. Call `fetchMutation(api.orders.createIpsOrder, …, { token: await convexAuthNextjsToken() })` to store the order.
10. Return the same JSON as today, plus `orderId`.

### UI purchasability
These are small conditionals so the UI never offers what the server rejects.
- `app/destinacije/page.tsx`: remove `AddToCartButton`. The "Pogledaj ponude" link stays.
- `app/ponude/page.tsx`, `app/putovanja/[zemlja]/page.tsx`, `app/verski-turizam/page.tsx`: show `AddToCartButton` only when `offer.sourceSlug === MANUAL_RELIGIOUS_SOURCE_SLUG`. The "Pošalji upit" link stays.
- `app/aranzmani/[slug]/page.tsx`, `components/journey-detail-page.tsx`: for subagency destinations, replace the cart button with `<Link href="/kontakt">Pošalji upit</Link>`.

### `components/cart-drawer.tsx`
- Remove `useMutation(api.orders.create)` and `createIpsReference`.
- POST `{ items: items.map(({ type, id, quantity }) => ({ type, id, quantity })), customer, website }` and use `data.orderId` from the response.
- Add a visually hidden `website` honeypot: `tabIndex={-1}`, `autoComplete="off"`, wrapped in `aria-hidden`.
- Error handling:

  | Response | Action and message |
  |---|---|
  | 429 | "Previše pokušaja. Pokušajte ponovo za nekoliko minuta." |
  | `ITEM_UNAVAILABLE` | Remove the `invalidIds` items from the cart and show "Neka stavka više nije dostupna i uklonjena je iz korpe." |

- Before submitting, require a name plus an email or a phone, matching the server rule.

## 8. UI changes

### Install
`npm install @convex-dev/auth@0.0.96 @auth/core@0.41.3 lucia@3.2.2`. `lucia` is deprecated, but it is the Scrypt implementation Convex Auth uses, so declare it explicitly.

### `proxy.ts` (new, project root)
```ts
import { convexAuthNextjsMiddleware, createRouteMatcher, nextjsMiddlewareRedirect } from "@convex-dev/auth/nextjs/server";
const isAdmin = createRouteMatcher(["/admin", "/admin/(.*)"]);
export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (isAdmin(request) && !(await convexAuth.isAuthenticated())) {
    const next = request.nextUrl.pathname + request.nextUrl.search;
    return nextjsMiddlewareRedirect(request, `/auth?mode=signin&next=${encodeURIComponent(next)}`);
  }
}, { cookieConfig: { maxAge: 60 * 60 * 24 * 14 } });
export const config = { matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"] };
```

### Providers and session
- **`app/layout.tsx`:** wrap `<html>` in `<ConvexAuthNextjsServerProvider>`. Nothing else changes.
- **`app/providers.tsx`:**
  - Use `ConvexAuthNextjsProvider client={convex}` with `new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)`.
  - Delete `AdminBootstrap` and the branch for a missing Convex URL.
  - Add a one-time effect that removes `localStorage["abluxtravel2022_session"]`.
- **`lib/use-session.ts`** (rewrite):
  - Keep `useSession(): SessionUser | null`, where `SessionUser = { id, firstName, lastName, displayName, email, role: Role, isStaff, isOwner }`.
  - Build it from `useConvexAuth()` plus `useQuery(api.users.me, isAuthenticated ? {} : "skip")`.
  - Add `useSessionState(): { status: "loading" | "anonymous" | "authenticated", session }`.
- **Delete `lib/local-auth.ts`.**

### `components/auth-portal.tsx`
Keep the markup and classes; step 12 restyles it.
- Call `useAuthActions().signIn("password", { flow, email, password, firstName?, lastName?, website })`.
- After a successful sign-in, set `pendingRedirect`. An effect waits for `useSession()`, then calls `router.replace(nextPath ?? (session.isStaff ? "/admin" : "/"))` and `router.refresh()`. After 5 s it falls back to `nextPath ?? "/"`.
- Map error codes to dictionary texts.
- Sign-out: `await signOut(); router.replace("/auth?mode=signin"); router.refresh()`.
- Minimum password length is 8. Add the `website` honeypot to the sign-up form.

### Role checks
Replace every `session?.role === "admin"` with `session?.isStaff`:
- `components/site-navigation.tsx` (the admin link; sign-out now goes through `useAuthActions`)
- `components/page-admin-editor-dock.tsx`
- `components/vertical-hero-slider.tsx`
- `app/verski-turizam/page.tsx`
- `app/putovanja/[zemlja]/page.tsx`
- `components/auth-portal.tsx`

### Admin shell
- **`app/admin/layout.tsx`** becomes a server component:
  ```ts
  token = await convexAuthNextjsToken();
  me = token ? await fetchQuery(api.users.me, {}, { token }).catch(() => null) : null;
  ```
  - No `me`: `redirect("/auth?mode=signin&next=%2Fadmin")`.
  - `!me.isStaff`: render `<AdminAccessDenied />`.
  - Otherwise: render `<AdminFrame>{children}</AdminFrame>`.
- **`components/admin/admin-frame.tsx`** (new, client): the old layout markup (sidebar + main) plus a client guard.
  - Loading: skeleton.
  - Unauthenticated: "Sesija je istekla" with a sign-in link.
  - Signed in but `!isStaff`: `AdminAccessDenied`.
  - Children render only for staff.
  - It owns the `signingOut` state: unmount the editors, `await signOut()`, then `router.replace("/auth?mode=signin")`.
- **`components/admin/admin-access-denied.tsx`** (new, client): "Nemate pristup administraciji", an "Odjavi se" button and a "Nazad na sajt" link.
- **`app/admin/error.tsx`** (new, client): if the `ConvexError` data is `UNAUTHENTICATED` or `FORBIDDEN`, show a sign-in link; otherwise show a generic message with a retry button.
- **`components/admin/admin-sidebar.tsx`:** replace "Admin nalog" with `ROLE_LABELS[role]` and add an "Odjavi se" button (44 px target) that calls the frame's sign-out.

### Inactive rows in admin
- Change the hooks to `useAccommodationsByTrip(tripId, options?: { includeInactive?: boolean })`, and the same for `useDestinationsByTrip` / `useDestinationsByPage`. Send `includeInactive: true` only when it is set.
- These callers pass it: `components/accommodation-editor.tsx`, `components/destination-editor.tsx` and `components/admin/destinations-data-table.tsx`.
- `components/trip-editor.tsx` already passes it to `useJourneys`.

### `app/admin/podesavanja/korisnici/page.tsx` (new, "Korisnici")
- **"Moj nalog":** a "Promena lozinke" form (trenutna, nova, potvrda) that calls `useAction(api.users.changePassword)`.
- **Owner only, "Korisnici i uloge":** a table with email, ime, an uloga select, and a status toggle (Aktivan/Isključen). It uses `users.list`, `users.setRole` and `users.setDisabled`.
- Note on the page: "Novi zaposleni se prvo registruje na /auth (Registracija), a zatim mu ovde dodelite ulogu Urednik."
- Link to this page from the top of `app/admin/podesavanja/page.tsx`: "Korisnici i lozinka →".

### `lib/i18n.ts` (type, sr and en)
- The password hint and the too-short message now say 8 characters.
- Fix the typo in `userExists`: "Korisnik sa ovim emailom već postoji."
- Add:
  - `tooManyAttempts`: "Previše neuspešnih pokušaja. Sačekajte nekoliko minuta pa pokušajte ponovo."
  - `accountDisabled`: "Nalog je isključen. Obratite se agenciji."
  - `roleOwner`, `roleEditor`, `roleCustomer`
  - `admin.noAccessTitle`, `admin.noAccessDescription`, `admin.sessionExpired`, `admin.signOut`
  - an `adminUsers` block for the new page
- Remove `roleAdmin` and `roleUser`.

### Public pages
For anonymous visitors, public pages behave as today, except that inactive rows and cart buttons for non-ABLux offers are hidden.

## 9. Environment variables

### DEV (now)
Set only through `node scripts/auth-setup.mjs`, which uses `convex env set` without `--prod`.

| Where | Names |
|---|---|
| Convex DEV | `JWT_PRIVATE_KEY`, `JWKS`, `SITE_URL=http://localhost:3000`, `ABLUX_SERVER_SECRET` |
| `.env.local` (Next server, gitignored) | `ABLUX_SERVER_SECRET` (same value), plus the existing `NEXT_PUBLIC_CONVEX_URL` and `CONVEX_DEPLOYMENT` |

Restart `npm run dev` after the change.

### Production (later; document it, do not do it)
- **Convex PROD:** a **new** `JWT_PRIVATE_KEY`/`JWKS` pair, `SITE_URL=https://www.abluxtravel.com`, and a new `ABLUX_SERVER_SECRET`.
- **Vercel Production:** the same `ABLUX_SERVER_SECRET`. The existing `NBS_IPS_*` variables stay.
- **Rollout order:**
  1. Deploy. The schema is compatible with the existing data.
  2. Run `npx convex run --prod users:migrateLegacyUsers`.
  3. Bootstrap the PROD owner manually with a locally generated password. The script refuses non-dev deployments.
  4. Customers migrate on their first sign-in.
  5. Only after that: tighten `users.role` and drop `username`/`passwordHash`.
- Until step 3 runs the owner cannot sign in. That is safe, because the old hardcoded password is never accepted.

## 10. Execution order for step 03

### Prep
```
git status        # branch ablux-2.0
npx convex export --path night-run/backups/03-<yyyyMMdd-HHmm>.zip
npm install @convex-dev/auth@0.0.96 @auth/core@0.41.3 lucia@3.2.2
```

### Commit 1: `[03] schema: users za Convex Auth, auditLog, rateLimits (kompatibilno unazad)`
This commit is the fallback point; the old admin still works here.
1. Apply the §4 schema.
2. Keep the old `convex/auth.ts` compiling without changing its behavior:
   - `by_email` becomes `email`;
   - `user.role === "admin" ? "admin" : "user"` where a role is assigned;
   - `user.username ?? ""`.
3. Run `npx convex dev --once`, the gate, then commit.

### Commit 2: `[03] auth: Convex Auth prijava, uloge i zaštita svih Convex funkcija`
1. `node scripts/auth-setup.mjs`.
2. Add §2 and §5: `convex/lib/*`, `auth.config.ts`, the new `auth.ts`, `http.ts`, `users.ts`, `authLegacy.ts`, `rateLimits.ts`, `audit.ts`, plus all guards and audit calls.
3. Make all §8 UI changes. `orders.create` stays until commit 3.
4. `npx convex dev --once`.
5. `npx convex run users:migrateLegacyUsers` and record the counts.
6. Run the three bootstrap commands from §6.
7. Start `npm run dev` in the background.
8. Write the `signin` part of the check script first, then run `node --env-file=.env.local scripts/security/check-access.mjs --only signin`.
9. Smoke-test in a browser: QA editor login, `/admin/aranzmani` loads, logout.
10. Gate, then commit.

### Commit 3: `[03] checkout: cene sa servera, rate limit, honeypot`
Implement §7 (pricing, orders, route, cart and purchasability UI). Run `npx convex dev --once`, the gate, then commit.

### Commit 4: `[03] bezbednost: test skripte, dokumentacija, izveštaj`
1. Write the §11 scripts, run them and fix any failures.
2. Update `CLAUDE.md`:
   - Auth section: implemented system, roles, helpers, the §2 rule, env names, bootstrap and test commands.
   - Backend function files.
   - Commands.
   - Note that `scripts/security/function-access.json` must classify every new public function.
3. Append to `night-run/DECISIONS.md`: the §12 lines as "02 — …", plus any "03 — …" decisions.
4. Add "Korak 03" to `night-run/NIGHT_REPORT.md` (Serbian): what is protected, how to log in (credentials are in `night-run/SECRETS.local.md`), the migration counts, test results, and what is still open.
5. Gate, then commit.

### If commit 2 cannot pass the gate
1. `git stash --include-untracked` to return to commit 1.
2. `npx convex dev --once` to restore the legacy functions on DEV.
3. Record the failure in the report.

DEV data changed by the migration and bootstrap stays valid under the commit 1 schema. The legacy `ensureAdminUser` then restores the old owner login.

### Gate (every commit)
`npx convex dev --once`, `npm run lint`, `npx tsc --noEmit`, `npm run build`. If Node globals break lint in `scripts/`, add `scripts/**` to `globalIgnores`.

## 11. Test checklist

### A. `scripts/security/function-access.json`
Maps each function-spec identifier (e.g. `"trips.js:list"`) to one of `public | customer | editor | owner | server | auth`. `HttpAction` entries are skipped.

### B. `node --env-file=.env.local scripts/security/check-access.mjs [--only <group>]`
**Setup:**
- Uses `ConvexHttpClient` from `convex/browser` with references from `anyApi` (`convex/server`). It does not import `_generated`.
- Logs in by calling `anyApi.auth.signIn` with `{ provider: "password", params: { flow: "signIn", email, password } }`, then `setAuth(tokens.token)`.
- Reads credentials from `SECRETS.local.md` and never prints them. Signs every client out at the end.

**Output:** PASS/FAIL/SKIP per check, written to `night-run/qa/03-security-check.json`. Exits 1 on any FAIL.

1. **inventory** (runs before every runtime check):
   - Every deployed public function is classified, and no entry is stale.
   - Every function not classified `public` has a handler whose first statement calls `requireRole(`, `requireUser(`, `requireRoleInAction(` or `requireServerSecret(` (regex check).
2. **fixtures:** the editor creates them; the script removes them in `finally` and deletes `qa-sec-*` leftovers on start.
   - 2 tiny uploaded PNGs.
   - A category (`isActive: false`).
   - A trip (`status: "completed"`, slug `qa-sec-<ts>`) with one inactive accommodation and one inactive destination.
   - A slide (`isActive: false`).
   - A home route slide (`isActive: false`).
   - Sources, offers, settings and vehicle images get **denial tests only**.
3. **anon:**
   - Every editor, owner or customer function returns `UNAUTHENTICATED`.
   - Every server function without the secret returns `FORBIDDEN`.
   - `includeInactive: true` returns `UNAUTHENTICATED`.
   - Public reads succeed, inactive fixtures stay hidden, and `users.me` returns `null`.
4. **customer** (`qa-customer`): editor and owner functions return `FORBIDDEN`; `users.me.role` is `customer`.
5. **editor** (`qa-editor`): editor functions succeed on the fixtures; `users.list`, `users.setRole` and `audit.list` return `FORBIDDEN`.
6. **owner:**
   - `users.list` works.
   - `setRole` on itself returns `FORBIDDEN`.
   - `audit.list` contains the editor's `trips.upsert`.
   - `setDisabled(qa-customer)` makes the customer's login fail with `ACCOUNT_DISABLED`; enabling it again restores login.
7. **removed:** `auth:ensureAdminUser`, `auth:login`, `auth:register` and `orders:create` all return "Could not find public function".
8. **signin:**
   - A wrong password returns `INVALID_CREDENTIALS`.
   - A throwaway `qa-lockout-<ts>@ablux.local` (created via signUp) returns `TOO_MANY_ATTEMPTS` after 10 wrong passwords, even when the correct password is then given.
   - SignUp with the honeypot filled returns `REJECTED`; signUp as `OWNER_EMAIL` returns `USER_EXISTS`.
9. **legacy:**
   1. Generate a random password in memory and its legacy hash, then run `convex run authLegacy:qaSeedLegacyUser` for `qa-legacy-<ts>@ablux.local`.
   2. Login succeeds. `qaAccountState` then shows `hasPasswordAccount: true` and `hasLegacyHash: false`.
   3. A second login succeeds and a wrong password fails.
   4. `changePassword` works, and the new password logs in.
10. **orders:**
    - `quote` prices equal the DB prices (`ДИН` becomes `RSD`).
    - A subagency destination, a non-`manual-verski` offer and a pseudo id each return `ITEM_UNAVAILABLE`.
    - `createIpsOrder` without the secret returns `FORBIDDEN`.
    - With the secret: a tampered amount returns `AMOUNT_MISMATCH`, and a filled honeypot returns `REJECTED` without inserting. A valid call stores the DB prices.
    - The 11th `consumeCheckoutQuota` with the same random `clientKey` returns `RATE_LIMITED`.
    - QA orders are set to `cancelled` at the end.

### C. `scripts/security/e2e-auth.mjs` (Playwright)
**Setup:**
- `npm i -D playwright`, then `PLAYWRIGHT_BROWSERS_PATH=.tools/ms-playwright npx playwright install chromium`.
- Run with `PLAYWRIGHT_BROWSERS_PATH=.tools/ms-playwright node scripts/security/e2e-auth.mjs` while the dev server runs on :3000.
- Screenshots go to `night-run/qa/03-*.png` (gitignored). If the install fails, do the same steps with the Playwright MCP tools.

**Checks:**
1. Anonymous `/admin` redirects to `/auth?mode=signin&next=%2Fadmin`.
2. The editor logs in and lands on `/admin`. The sidebar shows "Urednik". `/admin/aranzmani` loads data with no `UNAUTHENTICATED` or `FORBIDDEN` console errors.
3. After a reload the editor is still logged in:
   - the `__convexAuthJWT` and `__convexAuthRefreshToken` cookies are httpOnly;
   - `localStorage` has no `abluxtravel2022_session`.
4. The nav shows "Admin" to the editor. The `/kontakt` editor dock is visible to the editor and hidden for anonymous visitors and the customer.
5. Sidebar logout lands on `/auth`, and `/admin` redirects again.
6. The customer sees "Nemate pristup administraciji" on `/admin`.
7. On `/admin/podesavanja/korisnici`, the owner sees the roles table; the editor sees only "Promena lozinke".
8. **Checkout:** add the `manual-verski` offer on `/verski-turizam`, fill in the details and generate the QR. The response's `lines[0].originalAmount` must equal the DB price × quantity. If NBS is unreachable, mark it SKIP.

### D. Gate
All four gate commands pass.

## 12. Decisions to log in `night-run/DECISIONS.md` (as "02 — …")

- **Auth library:** Convex Auth 0.0.96 with a custom `ConvexCredentials` password provider on the Next 16 `proxy.ts`. It is the official library, uses an httpOnly refresh cookie and throttles logins. Every page becomes dynamic, which is accepted.
- **Roles:** owner, editor and customer.
  - Editors manage all content, orders and contact settings. Users, roles and the audit log are owner-only.
  - Legacy `admin` is never mapped automatically. The owner gets a new random password through the bootstrap, and the `abluxtravel` duplicate is disabled.
- **Legacy SHA-256 hashes** are accepted only for customers and rehashed to Scrypt on first login. The owner's old hash (the password from the code) is never accepted.
- **Cart and IPS:**
  - Prices come only from the DB.
  - Only ABLux programs can be bought: accommodations and non-subagency destinations of active or upcoming trips, and `manual-verski` offers. Everything else goes to an inquiry.
  - The amount stays the full price; this is an open question for the owner.
  - NBS calls stay in the Next route. Convex accepts an order only with `ABLUX_SERVER_SECRET` and recomputes the amount.
- **New staff:** they register on `/auth`, and the owner gives them the Urednik role. There are no email invitations because there is no email service.

## 13. Files

| | Files |
|---|---|
| **Create** | `proxy.ts` |
| | `convex/auth.config.ts`, `convex/users.ts`, `convex/authLegacy.ts`, `convex/audit.ts`, `convex/rateLimits.ts` |
| | `convex/lib/{roles,access,audit,rateLimit,serverSecret,passwords,constants,pricing}.ts` |
| | `components/admin/admin-frame.tsx`, `components/admin/admin-access-denied.tsx` |
| | `app/admin/error.tsx`, `app/admin/podesavanja/korisnici/page.tsx` |
| | `scripts/lib/convex-cli.mjs`, `scripts/auth-setup.mjs`, `scripts/bootstrap-staff.mjs` |
| | `scripts/security/{function-access.json,check-access.mjs,e2e-auth.mjs}` |
| **Change** | `package.json` / lockfile |
| | `convex/schema.ts`, `convex/auth.ts` (rewrite), `convex/http.ts`, `convex/orders.ts`, `convex/stripe.ts` |
| | `convex/{files,settings,trips,accommodations,destinations,categories,offers,slides,homeRouteSlides,vehicleRentalImages}.ts` |
| | `app/layout.tsx`, `app/providers.tsx`, `app/admin/layout.tsx`, `app/admin/podesavanja/page.tsx`, `app/api/ips/checkout/route.ts` |
| | `app/{destinacije,ponude,verski-turizam}/page.tsx`, `app/putovanja/[zemlja]/page.tsx`, `app/aranzmani/[slug]/page.tsx` |
| | `components/{auth-portal,site-navigation,page-admin-editor-dock,vertical-hero-slider,cart-drawer,accommodation-editor,destination-editor,journey-detail-page}.tsx` |
| | `components/admin/{admin-sidebar,destinations-data-table}.tsx` |
| | `lib/{use-session,use-accommodations,use-destinations,ips-payment,i18n}.ts` |
| | `CLAUDE.md`, `night-run/NIGHT_REPORT.md`, `night-run/DECISIONS.md` |
| | `.env.local` (secret line, script only); `eslint.config.mjs` (only if needed) |
| **Delete** | `lib/local-auth.ts` |

## 14. Pitfalls

- **Schema:** `...authTables` comes first and the custom `users` table after it. Keep the index names `email` and `phone`.
- **Server-only imports:**
  - `@convex-dev/auth/nextjs/server` belongs only in `app/layout.tsx`, `app/admin/layout.tsx`, `proxy.ts` and `route.ts`.
  - `convex/lib/access.ts` and `passwords.ts` must never be imported by the client. The client may import only `convex/lib/roles.ts`.
- **Proxy file:** never create `middleware.ts` next to `proxy.ts`.
- **Rate limits:** a rate-limited mutation must return its error instead of throwing after it consumes a counter, or the increment rolls back.
- **Auth timing:** admin editors render only after the frame confirms staff, so `includeInactive` queries never run before auth is set.
- **Password trimming:** the legacy hash uses `pw.trim()`. New Scrypt hashes use the password exactly as typed.
- **Imports inside `convex/`:** use relative paths (`../lib/ips-payment`, `../../lib/religious`), never `@/`.
- **Setting env values:** if `convex env set` via stdin fails, retry with a single `NAME=value` argument through `spawnSync` (no shell). Never echo the value.

Review note: the independent reviewer agent was cut off by a session rate limit before it reported anything. I re-checked this plan against the code myself; that pass added hashed PII in rate-limit keys, the owner-email sign-up block, `.first()` lookups, `anyApi` in the test scripts, and the stash procedure that also removes untracked files.
