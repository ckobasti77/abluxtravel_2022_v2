// Creates the relay shared secret on the DEV deployment (idempotent).
// Usage: node scripts/sync-relay-setup.mjs [--rotate]
// Writes SYNC_RELAY_SECRET to .env.local (gitignored) and Convex DEV env.
// Never prints the secret.
import { randomBytes } from "node:crypto";
import { assertDevDeployment, convex, readEnvLocal, upsertEnvLocal } from "./lib/convex-cli.mjs";

assertDevDeployment();

const rotate = process.argv.includes("--rotate");
const existing = readEnvLocal().SYNC_RELAY_SECRET;
if (existing && existing.length >= 32 && !rotate) {
  console.log("OK: SYNC_RELAY_SECRET već postoji u .env.local (za novu vrednost: --rotate).");
  process.exit(0);
}

const secret = randomBytes(32).toString("base64url");
let result = convex(["env", "set", "SYNC_RELAY_SECRET"], { input: secret });
if (result.status !== 0) result = convex(["env", "set", `SYNC_RELAY_SECRET=${secret}`]);
if (result.status !== 0) {
  console.error(`convex env set SYNC_RELAY_SECRET nije uspeo: ${(result.stderr ?? "").split(secret).join("***").trim()}`);
  process.exit(1);
}
upsertEnvLocal("SYNC_RELAY_SECRET", secret, "Partner Sync relay CLI ↔ Convex HTTP actions (/sync/relay/*).");
console.log("OK: SYNC_RELAY_SECRET postavljen (DEV + .env.local).");
