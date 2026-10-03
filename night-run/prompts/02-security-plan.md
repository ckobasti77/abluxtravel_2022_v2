# Step 02 — Bezbednost: plan (plan mode)
<!-- mode: plan · effort: max · session: S2 (new) -->

You are step 02 of the ABLux night run, in plan mode: read and think, change nothing. Your final message is the plan; the script saves it to `docs/plans/02-security.md` and step 03 (same session) executes it. Read `night-run/NIGHT_RULES.md` and `docs/PLAN.md` first.

## Current state (verify in code)
- Admin gating is client-side only: `lib/local-auth.ts`, `lib/use-session.ts`, `app/admin/layout.tsx` (`session.role === "admin"` from `localStorage`).
- No Convex function checks the caller. Read every file in `convex/` and list every exported query, mutation and action.
- `convex/auth.ts`: hardcoded admin password, SHA-256 + static salt hashing, public `ensureAdminUser` called from `app/providers.tsx` on every page load (resets the admin password hash). `login` and `register` are public mutations returning the user.
- `convex/orders.ts` and `app/api/ips/checkout/route.ts` accept prices from the browser. `orders.list` returns customer PII to anyone.
- Customer accounts exist (`/signin`, `/signup`, role `user`) besides the admin.

## The plan must decide and specify
1. **Auth approach.** Evaluate Convex Auth (`@convex-dev/auth`, Password provider) with Next.js 16 and React 19 (check current docs: Context7 or web; note Next 16 renamed `middleware.ts` to `proxy.ts` — confirm what the library supports). If it fits, use it. If not, specify a custom approach: `sessions` table with random tokens stored hashed, password hashing with scrypt/argon2 in a Node action, token in an httpOnly cookie via a Next route handler plus a Convex client auth bridge. Pick one and justify in 3 lines.
2. **Roles:** `owner`, `editor`, `customer`. A helper like `requireRole(ctx, "editor")` used at the top of every admin function.
3. **Function inventory table:** every Convex function → public / customer / editor / owner / internal, and what changes. Public queries return only published data.
4. **Migration without data loss:** existing admin and customer users; legacy SHA-256 hashes (verify legacy hash on first login, then rehash). All schema changes backward compatible (optional first).
5. **Owner bootstrap:** `ensureAdminUser` becomes internal and leaves the browser. A one-time `npx convex run` command creates or updates the owner (email `abluxtravel@gmail.com`) with a freshly generated random password. The password is written only to `night-run/SECRETS.local.md` (gitignored) so the owner can log in and change it. No password in code or git.
6. **Server-side prices:** `orders.create` and the IPS checkout compute the amount from the database (trip/offer ids + quantities), never from the client.
7. **Abuse protection:** login rate limiting (Convex rate limiter component or a table), audit log table for admin actions (who, what, when), honeypot + rate limit for public inquiry/order creation.
8. **UI changes:** login page, logout, session hook, admin layout guard on the server where possible, `PageAdminEditorDock` visible only with a verified session, the dev/public pages unaffected.
9. **Env vars** needed on DEV (names only, set with `npx convex env set` without `--prod`), and what production will need later (documented, not done).
10. **Test checklist:** unauthenticated calls to admin functions fail (script with `ConvexHttpClient`), login/logout works in a browser (Playwright), legacy customer login still works, orders compute server prices.

Output: a numbered implementation plan with files to create/change, schema diffs, commands, and the test checklist. Be concrete; step 03 follows it literally.
